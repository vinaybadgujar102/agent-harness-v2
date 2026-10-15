import type { Readable, Writable } from "node:stream";

type RawStdin = Readable & {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => void;
};

export function readSecretLine(
  input: Readable,
  output: Writable,
  label: string,
): Promise<string> {
  output.write(label);
  const stdin = input as RawStdin;
  const useRaw = Boolean(stdin.isTTY && stdin.setRawMode);
  if (useRaw) stdin.setRawMode?.(true);

  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (chunk: Buffer | string) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (const ch of text) {
        if (ch === "\u0003") {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }
        if (ch === "\n" || ch === "\r") {
          cleanup();
          output.write("\n");
          resolve(buf);
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          buf = buf.slice(0, -1);
          continue;
        }
        buf += ch;
      }
    };
    const cleanup = () => {
      if (useRaw) stdin.setRawMode?.(false);
      input.off("data", onData);
      input.off("end", onEnd);
      input.off("error", onError);
    };
    const onEnd = () => {
      cleanup();
      resolve(buf);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    input.on("data", onData);
    input.on("end", onEnd);
    input.on("error", onError);
  });
}
