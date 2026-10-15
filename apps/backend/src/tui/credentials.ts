import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const CREDENTIALS_DIR = join(homedir(), ".config", "tuffy-agent");
export const CREDENTIALS_PATH = join(CREDENTIALS_DIR, "credentials");

type CredsFile = { geminiApiKey?: string };

export async function readStoredGeminiKey(): Promise<string | undefined> {
  const file = Bun.file(CREDENTIALS_PATH);
  if (!(await file.exists())) return undefined;
  try {
    const parsed = (await file.json()) as CredsFile;
    const key = parsed.geminiApiKey?.trim();
    return key || undefined;
  } catch {
    return undefined;
  }
}

export async function writeStoredGeminiKey(geminiApiKey: string) {
  await mkdir(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  await Bun.write(CREDENTIALS_PATH, JSON.stringify({ geminiApiKey }, null, 2));
  await chmod(CREDENTIALS_PATH, 0o600);
}

export async function resolveGeminiKey(): Promise<string | undefined> {
  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  return readStoredGeminiKey();
}
