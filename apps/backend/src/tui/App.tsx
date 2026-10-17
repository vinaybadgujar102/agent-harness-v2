import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LovableAiAgent } from "../abstraction/agent";
import type { HarnessMode } from "../createAgent";
import { geminiClientForAgent, modeConfig } from "../createAgent";
import type { HarnessEvent } from "../abstraction/types";
import {
  ConversationStore,
  type ConversationListItem,
} from "../conversation/conversationStore";
import {
  implementationUserPrompt,
  loadActivePlan,
  saveActivePlan,
} from "../plan/planStore";
import {
  previewToolResult,
  relativeTime,
  transcriptLinesFromTurns,
  visibleWindow,
} from "./historyUi";
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
  const [view, setView] = useState<"chat" | "history">("chat");
  const [historyItems, setHistoryItems] = useState<ConversationListItem[]>([]);
  const [historyPick, setHistoryPick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const uiModeRef = useRef<UiMode>("agent");
  const harnessModeRef = useRef<HarnessMode>("agent");
  const sessionIdRef = useRef<string | null>(null);
  const nextId = useRef(1);
  const runningRef = useRef(false);
  const toolRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedFirst = useRef(false);
  const assistantBuf = useRef("");
  const store = useMemo(() => new ConversationStore(workspace), [workspace]);

  const push = (kind: Line["kind"], text: string) => {
    const id = nextId.current++;
    setLines((prev) => [...prev, { id, kind, text }]);
  };

  const persistCurrent = () => {
    const turns = agent.getTurns();
    if (turns.length === 0) return;
    let id = sessionIdRef.current;
    if (!id) {
      id = crypto.randomUUID();
      sessionIdRef.current = id;
    }
    store.save({ id, mode: harnessModeRef.current, turns });
  };

  const startNewChat = () => {
    sessionIdRef.current = null;
    agent.clearConversation();
    setLines([]);
    setThinking("");
    setDraft("");
    assistantBuf.current = "";
    setStatus("idle");
  };

  const applyHarnessMode = (mode: HarnessMode) => {
    const client = geminiClientForAgent(agent);
    if (!client) {
      throw new Error("missing Gemini client on agent");
    }
    agent.setMode(modeConfig(workspace, mode, client));
    harnessModeRef.current = mode;
    const nextUi: UiMode = mode === "plan" ? "plan" : "agent";
    uiModeRef.current = nextUi;
    setUiMode(nextUi);
  };

  const openHistory = () => {
    setDraft("");
    setConfirmDelete(false);
    setHistoryItems(store.list());
    setHistoryPick(0);
    setView("history");
  };

  const loadHistoryItem = (item: ConversationListItem) => {
    const record = store.load(item.id);
    if (!record) {
      setView("chat");
      setConfirmDelete(false);
      push("error", "conversation missing");
      return;
    }
    applyHarnessMode(record.mode);
    agent.replaceTurns(record.turns);
    sessionIdRef.current = record.id;
    const rebuilt = transcriptLinesFromTurns(record.turns);
    nextId.current = rebuilt.length + 1;
    setLines(
      rebuilt.map((line, i) => ({ id: i + 1, kind: line.kind, text: line.text })),
    );
    setThinking("");
    assistantBuf.current = "";
    setStatus("idle");
    setConfirmDelete(false);
    setView("chat");
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
    if (slash?.action === "history") {
      openHistory();
      return;
    }
    if (slash?.action === "plan-mode") {
      applyHarnessMode("plan");
      persistCurrent();
      push("tool", "plan mode — no file edits; reply saved to .tuffy/plans/active.md");
      return;
    }
    if (slash?.action === "agent-mode") {
      applyHarnessMode("agent");
      persistCurrent();
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
        persistCurrent();
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
        push("tool", `${event.toolName} done ${previewToolResult(event.result)}`);
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
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (view === "history") {
      if (confirmDelete) {
        if (key.escape || input === "n") {
          setConfirmDelete(false);
          return;
        }
        if (input === "y") {
          const item = historyItems[historyPick];
          if (item) {
            store.delete(item.id);
            if (sessionIdRef.current === item.id) startNewChat();
            const next = store.list();
            setHistoryItems(next);
            setHistoryPick((i) =>
              next.length ? Math.min(i, next.length - 1) : 0,
            );
          }
          setConfirmDelete(false);
        }
        return;
      }
      if (key.escape) {
        setView("chat");
        return;
      }
      if (key.upArrow) {
        setHistoryPick((i) =>
          historyItems.length
            ? (i - 1 + historyItems.length) % historyItems.length
            : 0,
        );
        return;
      }
      if (key.downArrow) {
        setHistoryPick((i) =>
          historyItems.length ? (i + 1) % historyItems.length : 0,
        );
        return;
      }
      if (key.return) {
        const item = historyItems[historyPick];
        if (item) loadHistoryItem(item);
        return;
      }
      if (input === "d") {
        if (historyItems[historyPick]) setConfirmDelete(true);
        return;
      }
      return;
    }

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
  const slashMenuH =
    view === "chat" && slashMenuOpen ? slashMatches.length + 1 : 0;
  const inputH = 3 + slashMenuH;
  const statusH = 1;
  const transcriptH = Math.max(6, rows - thinkH - inputH - statusH);
  const historyWindow = visibleWindow(
    historyItems,
    historyPick,
    Math.max(1, transcriptH - 2),
  );

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
        {view === "history" ? (
          historyItems.length === 0 ? (
            <Text dimColor>no past conversations</Text>
          ) : (
            historyWindow.items.map((item, i) => {
              const selected = historyWindow.start + i === historyPick;
              return (
                <Text
                  key={item.id}
                  inverse={selected}
                  wrap="truncate"
                >
                  {`${relativeTime(item.updatedAt)}  ${item.mode}  ${item.title}`}
                </Text>
              );
            })
          )
        ) : (
          lines.slice(-Math.max(1, transcriptH - 2)).map((line) => (
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
          ))
        )}
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
        {view === "history" ? (
          confirmDelete ? (
            <Text>
              {`delete “${historyItems[historyPick]?.title ?? ""}”? y/n`}
            </Text>
          ) : (
            <Text dimColor>↑↓ select  enter load  d delete  esc back</Text>
          )
        ) : (
          <>
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
                <Text dimColor>
                  ↑↓ select · enter run · tab complete · esc dismiss
                </Text>
              </Box>
            ) : null}
            {running ? (
              <Text dimColor>
                esc abort  /plan  /implement  /agent  /history  /new  /quit
              </Text>
            ) : (
              <Box>
                <Text>{`> ${draft}`}</Text>
                <Text inverse={cursorOn}> </Text>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
