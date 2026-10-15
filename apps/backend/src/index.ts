import { startServer } from "./server";

const server = startServer();
console.log(`Agent harness SSE server listening on http://localhost:${server.port}`);
console.log(`POST /api/agent/stream  body: { "prompt": "..." }`);
