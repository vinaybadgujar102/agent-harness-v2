export type Schema = {
  type: "object";
  properties: Record<string, Property>;
  required?: string[];
};

type Property = {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
};

export type Tool = {
  name: string;
  description: string;
  inputSchema: Schema;

  execute(args: unknown): Promise<unknown>;
};

export type LlmProviderOptions = {
  systemPrompt?: string;
  tools?: Tool[];
};
