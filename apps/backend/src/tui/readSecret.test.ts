import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { readSecretLine } from "./readSecret";

test("readSecretLine does not echo the secret", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const chunks: string[] = [];
  output.on("data", (c: Buffer | string) => {
    chunks.push(typeof c === "string" ? c : c.toString());
  });

  const pending = readSecretLine(input, output, "GEMINI_API_KEY: ");
  input.write("sk-secret-value\n");
  const value = await pending;

  expect(value).toBe("sk-secret-value");
  expect(chunks.join("")).not.toContain("sk-secret-value");
  expect(chunks.join("")).toContain("GEMINI_API_KEY: ");
});
