import { bashTool2 } from "./bash.tool";

type ToolDetails = {
  name: string;
  decription: string;
  parameters?: any;
};

export type Schema = {
  type: "object";
  properties: Record<string, Property>;
  required?: string[];
};

type Property = {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: "string";
};

export type Tool = {
  name: string;
  description: string;
  inputSchema: Schema;

  execute(args: unknown): Promise<unknown>;
};

export const toolRegistry = new Map<string, Tool>([["bash_tool", bashTool2]]);
