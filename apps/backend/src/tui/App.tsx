import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useRef, useState } from "react";
import type { LovableAiAgent } from "../abstraction/agent";
import type { HarnessEvent } from "../abstraction/types";
import { statusForTool } from "./status";

type Line = { id: number; kind: "user" | "assistant" | "tool" | "error"; text: string };

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
  const [lines, setLines] = useState<Line[]>([]);
  const [thinking, setThinking] = useState("");
  const [draft, setDraft] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [cursorOn, setCursorOn] = useState(true);
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

  const submit = (raw: string) => {
    const text = raw.trim();
    if (!text || runningRef.current) return;
    if (text === "/quit") {
      exit();
      return;
    }
    if (text === "/clear") {
      agent.clearConversation();
      setLines([]);
      setThinking("");
      setDraft("");
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
    const onResize = () => setRows(process.stdout.rows || 24);
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

  useInput((input, key) => {
    if (key.escape) {
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
  const inputH = 3;
  const statusH = 1;
  const transcriptH = Math.max(6, rows - thinkH - inputH - statusH);

  return (
    <Box flexDirection="column" width="100%" height={rows}>
      <Box
        flexDirection="column"
        height={thinkH}
        borderStyle="single"
        borderColor="yellow"
        paddingX={1}
      >
        <Text color="yellow" dimColor>
          thinking
        </Text>
        <Text dimColor wrap="truncate">
          {thinking || " "}
        </Text>
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
          {` ${status}  ${workspace} `}
        </Text>
      </Box>
      <Box height={inputH} borderStyle="single" paddingX={1}>
        {running ? (
          <Text dimColor>esc abort (model only)  /quit  /clear</Text>
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
