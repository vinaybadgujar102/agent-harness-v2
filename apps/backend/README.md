# backend

To install dependencies:

```bash
bun install
```

To run the SSE server:

```bash
bun run start
```

Stream a prompt (needs `GEMINI_API_KEY`):

```bash
curl -N -X POST http://localhost:3000/api/agent/stream \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"In one sentence, what is SSE?"}'
```

Each SSE `data:` line is one JSON `HarnessEvent` (`thought_delta`, `text_delta`, `tool_call_ready`, `tool_run_*`, etc.).

Console (thinking block, then answer):

```bash
bun run stream -- "Create a simple HTML todo app"
```

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
