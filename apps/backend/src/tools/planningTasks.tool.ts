import type { FunctionT } from "./toolType";

export const planningTasksFunction: FunctionT = {
  type: "function",
  name: "planning_tasks",
  description:
    "Break the task into a clear sequence of actionable steps before execution.",
  parameters: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        description: "Ordered list of planned execution steps.",
        items: {
          type: "object",
          properties: {
            stepNo: {
              type: "number",
            },
            stepText: {
              type: "string",
            },
          },
          required: ["stepNo", "stepText"],
        },
      },
    },
    required: ["steps"],
  },
};
