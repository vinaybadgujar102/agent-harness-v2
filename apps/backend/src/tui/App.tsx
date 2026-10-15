import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LovableAiAgent } from "../abstraction/agent";
import type { HarnessMode } from "../createAgent";
import { modeConfig } from "../createAgent";
import type { HarnessEvent } from "../abstraction/types";
import {
  implementationUserPrompt,
  loadActivePlan,
  saveActivePlan,
} from "../plan/planStore";
import {
  filterSlashCommands,
  slashCommandForInput,
  slashMenuActive,
} from "./slashCommands";
import { statusForTool } from "./status";
import { wrapForTerminal } from "./wrapText";

type Line = { id: number; kind: "user" | "assistant" | "tool" | "error"; text: string };
type UiMode = "agent" | "plan";

export function App({
  agent,
  workspace,
  firstPrompt,
}: {
  agent: LovableAiAgent;
  workspace: string;
  firstPrompt: string;
}) {
  const { exit } = useApp();
  const [rows, setRows] = useState(process.stdout.rows || 24);
  const [cols, setCols] = useState(process.stdout.columns || 80);
  const [lines, setLines] = useState<Line[]>([]);
  const [thinking, setThinking] = useState("");
  const [draft, setDraft] = useState("");
  const [slashPick, setSlashPick] = useState(0);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [uiMode, setUiMode] = useState<UiMode>("agent");
  const [cursorOn, setCursorOn] = useState(true);
  const uiModeRef = useRef<UiMode>("agent");
  const nextId = useRef(1);
  const runningRef = useRef(false);
  const toolRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedFirst = useRef(false);
  const assistantBuf = useRef("");

  const push = (kind: Line["kind"], text: string) => {
    const id = nextId.current++;
    setLines((prev) => [...prev, { id, kind, text }]);
  };

  const startNewChat = () => {
    agent.clearConversation();
    setLines([]);
    setThinking("");
    setDraft("");
    assistantBuf.current = "";
    setStatus("idle");
  };

  const applyHarnessMode = (mode: HarnessMode) => {
    agent.setMode(modeConfig(workspace, mode));
    const nextUi: UiMode = mode === "plan" ? "plan" : "agent";
    uiModeRef.current = nextUi;
    setUiMode(nextUi);
  };

  const submit = (
    raw: string,
    opts?: { afterImplement?: boolean },
  ) => {
    const text = raw.trim();
    if (!text || runningRef.current) return;
    const slash = slashCommandForInput(text);
    if (slash?.action === "quit") {
      exit();
      return;
    }
    if (slash?.action === "new-chat") {
      startNewChat();
      return;
    }
    if (slash?.action === "plan-mode") {
      applyHarnessMode("plan");
      startNewChat();
      push("tool", "plan mode — no file edits; reply saved to .tuffy/plans/active.md");
      return;
    }
    if (slash?.action === "agent-mode") {
      applyHarnessMode("agent");
      startNewChat();
      push("tool", "agent mode — filesystem tools enabled");
      return;
    }
    if (slash?.action === "implement-plan") {
      void (async () => {
        const plan = await loadActivePlan(workspace);
        if (!plan) {
          push("error", "No plan at .tuffy/plans/active.md — use /plan first");
          return;
        }
        applyHarnessMode("implement");
        startNewChat();
        submit(implementationUserPrompt(plan), { afterImplement: true });
      })();
      return;
    }

    runningRef.current = true;
    setRunning(true);
    setStatus("thinking");
    setDraft("");
    setThinking("");
    assistantBuf.current = "";
    push("user", text);

    const ac = new AbortController();
    abortRef.current = ac;

    void (async () => {
      try {
        for await (const event of agent.createStream(text, { signal: ac.signal })) {
          applyEvent(event);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        push("error", message);
      } finally {
        if (opts?.afterImplement) {
          applyHarnessMode("agent");
        }
        if (uiModeRef.current === "plan") {
          const planText = assistantBuf.current.trim();
          if (planText) {
            try {
              await saveActivePlan(workspace, planText);
              push("tool", "plan saved → .tuffy/plans/active.md");
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              push("error", `plan save failed: ${message}`);
            }
          }
        }
        runningRef.current = false;
        toolRef.current = false;
        abortRef.current = null;
        setRunning(false);
        setStatus("idle");
      }
    })();
  };

  const applyEvent = (event: HarnessEvent) => {
    switch (event.type) {
      case "thought_delta":
        setStatus("thinking");
        setThinking((t) => t + event.text);
        break;
      case "text_delta":
        setStatus("writing");
        assistantBuf.current += event.text;
        setLines((prev) => {
          const last = prev[prev.length - 1];
          if (last?.kind === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...last, text: assistantBuf.current },
            ];
          }
          return [
            ...prev,
            {
              id: nextId.current++,
              kind: "assistant",
              text: assistantBuf.current,
            },
          ];
        });
        break;
      case "tool_call_ready":
        setStatus(statusForTool(event.toolName, event.toolArgs));
        break;
      case "tool_run_started":
        toolRef.current = true;
        push("tool", `${event.toolName} …`);
        break;
      case "tool_run_finished":
        toolRef.current = false;
        setStatus("thinking");
        const raw = JSON.stringify(event.result);
        const shown = raw.length > 240 ? `${raw.slice(0, 240)}…` : raw;
        push("tool", `${event.toolName} done ${shown}`);
        break;
      case "error":
        push("error", event.message);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setRows(process.stdout.rows || 24);
      setCols(process.stdout.columns || 80);
    };
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (startedFirst.current) return;
    if (!firstPrompt) return;
    startedFirst.current = true;
    submit(firstPrompt);
  }, [firstPrompt]);

  const slashMatches = useMemo(() => filterSlashCommands(draft), [draft]);
  const slashMenuOpen =
    !running && slashMenuActive(draft) && slashMatches.length > 0;
  const slashIndex = Math.min(
    slashPick,
    Math.max(0, slashMatches.length - 1),
  );

  useEffect(() => {
    setSlashPick(0);
  }, [draft]);

  useInput((input, key) => {
    if (key.escape) {
      if (slashMenuOpen) {
        setDraft("");
        return;
      }
      if (runningRef.current && !toolRef.current) {
        abortRef.current?.abort();
      }
      return;
    }
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (runningRef.current) return;

    if (slashMenuOpen) {
      if (key.upArrow) {
        setSlashPick((i) =>
          slashMatches.length ? (i - 1 + slashMatches.length) % slashMatches.length : 0,
        );
        return;
      }
      if (key.downArrow) {
        setSlashPick((i) =>
          slashMatches.length ? (i + 1) % slashMatches.length : 0,
        );
        return;
      }
      if (key.tab) {
        const cmd = slashMatches[slashIndex];
        if (cmd) setDraft(cmd.name);
        return;
      }
      if (key.return) {
        const cmd = slashMatches[slashIndex];
        if (cmd) submit(cmd.name);
        return;
      }
    }

    if (key.return) {
      submit(draft);
      return;
    }
    if (key.backspace || key.delete) {
      setDraft((d) => d.slice(0, -1));
      return;
    }
    if (input) setDraft((d) => d + input);
  });

  const thinkH = Math.max(4, Math.floor(rows * 0.25));
  const thinkTextWidth = Math.max(10, cols - 4);
  const slashMenuH = slashMenuOpen ? slashMatches.length + 1 : 0;
  const inputH = 3 + slashMenuH;
  const statusH = 1;
  const transcriptH = Math.max(6, rows - thinkH - inputH - statusH);

  return (
    <Box flexDirection="column" width="100%" height={rows}>
      <Box
        flexDirection="column"
        height={thinkH}
        width="100%"
        borderStyle="single"
        borderColor="yellow"
        paddingX={1}
        overflow="hidden"
      >
        <Text color="yellow" dimColor>
          thinking
        </Text>
        <Box flexGrow={1} width="100%" overflow="hidden">
          <Text dimColor wrap="wrap">
            {wrapForTerminal(thinking || " ", thinkTextWidth)}
          </Text>
        </Box>
      </Box>
      <Box
        flexDirection="column"
        height={transcriptH}
        borderStyle="single"
        paddingX={1}
      >
        {lines.slice(-Math.max(1, transcriptH - 2)).map((line) => (
          <Text
            key={line.id}
            color={
              line.kind === "user"
                ? "cyan"
                : line.kind === "error"
                  ? "red"
                  : line.kind === "tool"
                    ? "gray"
                    : undefined
            }
            wrap="truncate"
          >
            {line.kind === "user" ? "> " : ""}
            {line.text}
          </Text>
        ))}
      </Box>
      <Box height={statusH}>
        <Text inverse>
          {` ${status}  ${uiMode}  ${workspace} `}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        height={inputH}
        borderStyle="single"
        paddingX={1}
        justifyContent="flex-end"
      >
        {slashMenuOpen ? (
          <Box flexDirection="column" marginBottom={1}>
            {slashMatches.map((cmd, i) => (
              <Box key={cmd.name} gap={1}>
                <Text inverse={i === slashIndex} bold={i === slashIndex}>
                  {cmd.name}
                </Text>
                <Text dimColor={i !== slashIndex}>{cmd.description}</Text>
              </Box>
            ))}
            <Text dimColor>↑↓ select · enter run · tab complete · esc dismiss</Text>
          </Box>
        ) : null}
        {running ? (
          <Text dimColor>esc abort  /plan  /implement  /agent  /new  /quit</Text>
        ) : (
          <Box>
            <Text>{`> ${draft}`}</Text>
            <Text inverse={cursorOn}> </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
