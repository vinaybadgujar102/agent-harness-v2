import { GoogleGenAI, type Step } from "@google/genai";
import { askClarifyingQuestionsFunction } from "./tools/question.tool";
import { planningTasksFunction } from "./tools/planningTasks.tool";

const client = new GoogleGenAI({ apiKey: "" });

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

  while (true) {
    const interation = await client.interactions.create({
      model: "gemini-2.5-flash",
      tools: [askClarifyingQuestionsFunction, planningTasksFunction],
      input: messageHistory,
    });

    for (const step of interation.steps) {
      if (step.type === "function_call") {
        console.log(step);
        return;
      }
    }
  }
}
