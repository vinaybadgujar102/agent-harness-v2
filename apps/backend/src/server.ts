import { LovableAiAgent } from "./abstraction/agent";
import { GoogleAgentProvider } from "./abstraction/providers/google";
import { client } from "./client";
import { harnessEventsToReadableStream } from "./http/sse";

const DEFAULT_PORT = 3000;

export function createAgent() {
  return new LovableAiAgent(new GoogleAgentProvider(client));
}

export function startServer(port = Number(process.env.PORT) || DEFAULT_PORT) {
  const agent = createAgent();

  return Bun.serve({
    port,
    routes: {
      "/health": new Response("ok"),
      "/api/agent/stream": {
        async POST(req) {
          let body: { prompt?: unknown };
          try {
            body = (await req.json()) as { prompt?: unknown };
          } catch {
            return Response.json({ error: "Invalid JSON body" }, { status: 400 });
          }

          if (typeof body.prompt !== "string" || !body.prompt.trim()) {
            return Response.json(
              { error: "prompt must be a non-empty string" },
              { status: 400 },
            );
          }

          const stream = harnessEventsToReadableStream(
            agent.createStream(body.prompt.trim()),
          );

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "Access-Control-Allow-Origin": "*",
            },
          });
        },
        OPTIONS() {
          return new Response(null, {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          });
        },
      },
    },
    fetch(req) {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }
      return new Response("Not found", { status: 404 });
    },
  });
}
