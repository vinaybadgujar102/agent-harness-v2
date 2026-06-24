import type { FunctionT } from "./toolType";

export const askClarifyingQuestionsFunctionDeclaration: FunctionT = {
  type: "function",
  name: "ask_clarifying_questions",
  description:
    "Ask only the minimum set of clarifying questions needed to resolve ambiguity and complete the task correctly.",
  parameters: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        description: "List of clarifying questions for the user.",
        items: {
          type: "string",
        },
      },
    },
    required: ["questions"],
  },
};
