import { z, type ZodType } from "zod";

/** JSON Schema object sent to LLM tool APIs (from `z.toJSONSchema`). */
export type ToolInputSchema = Record<string, unknown> & { type: "object" };

export type Tool = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute(args: unknown): Promise<unknown>;
};

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function defineTool<T extends ZodType>(
  def: {
    name: string;
    description: string;
    input: T;
    execute(args: z.infer<T>): Promise<unknown>;
  },
): Tool {
  const inputSchema = z.toJSONSchema(def.input) as ToolInputSchema;
  return {
    name: def.name,
    description: def.description,
    inputSchema,
    async execute(args: unknown) {
      const parsed = def.input.safeParse(args);
      if (!parsed.success) {
        return { error: formatZodError(parsed.error) };
      }
      return def.execute(parsed.data);
    },
  };
}

export type LlmProviderOptions = {
  systemPrompt?: string;
  tools?: Tool[];
};
