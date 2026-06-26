import { GoogleGenAI, type Step } from "@google/genai";
import {
  planningTasksFunction,
  planningTasksFunctionDeclaration,
} from "./tools/planningTasks.tool";
import { askClarifyingQuestionsFunctionDeclaration } from "./tools/question.tool";
import { bashTool, bashToolFunctionDeclaration } from "./tools/bash.tool";
import { SYSTEM_INSTRUCTION } from "./utils/systems_instruction";

const client = new GoogleGenAI({
  apiKey: "",
});

async function agentLoop(prompt: string) {
  const messageHistory: Step[] = [
    {
      type: "user_input",
      content: [
        {
          type: "text",
          text: prompt,
        },
      ],
    },
  ];

  outerLoop: while (true) {
    const interation = await client.interactions.create({
      model: "gemini-2.5-flash",
      tools: [
        askClarifyingQuestionsFunctionDeclaration,
        planningTasksFunctionDeclaration,
        bashToolFunctionDeclaration,
      ],
      system_instruction: SYSTEM_INSTRUCTION,
      input: messageHistory,
    });

    for (const step of interation.steps) {
      if (step.type === "function_call") {
        const { name, arguments: args } = step;
        if (name === "planning_tasks") {
          const result = planningTasksFunction(args.steps);

          messageHistory.push({
            type: "function_result",
            name: step.name,
            call_id: step.id,
            result: [{ type: "text", text: JSON.stringify(result) }],
          });
        } else if (name === "bash_tool") {
          console.log(args);
          const result = await bashTool(args.command);
          messageHistory.push({
            type: "function_result",
            call_id: step.id,
            name: step.name,
            result: [{ type: "text", text: JSON.stringify(result) }],
          });
        }
        continue outerLoop;
      }
      return interation.steps.at(-1).content[0].text;
    }
  }
}

console.log(await agentLoop("create simple todo in html"));
