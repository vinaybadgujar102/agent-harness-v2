import { expect, test } from "bun:test";
import { z } from "zod";
import { defineTool } from "./toolClass";

test("defineTool rejects invalid input before execute", async () => {
  const tool = defineTool({
    name: "echo",
    description: "echo",
    input: z.object({ text: z.string() }),
    execute: ({ text }) => Promise.resolve({ text }),
  });

  await expect(tool.execute({ text: 1 })).resolves.toEqual({
    error: "text: Invalid input: expected string, received number",
  });
  await expect(tool.execute({ text: "ok" })).resolves.toEqual({ text: "ok" });
});
