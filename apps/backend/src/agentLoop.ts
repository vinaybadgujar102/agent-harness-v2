import { GoogleGenAI, type Step } from "@google/genai";
import {
  planningTasksFunction,
  planningTasksFunctionDeclaration,
} from "./tools/planningTasks.tool";
import { askClarifyingQuestionsFunctionDeclaration } from "./tools/question.tool";

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
      ],
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
        }
        continue outerLoop;
      }
      return interation.steps.at(-1).content[0].text;
    }
  }
}

console.log(await agentLoop("create plan for the simple to do app"));
