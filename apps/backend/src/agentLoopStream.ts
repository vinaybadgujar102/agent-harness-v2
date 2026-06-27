import type { Step } from "@google/genai";
import { client } from "./client";
import { askClarifyingQuestionsFunctionDeclaration } from "./tools/question.tool";
import { planningTasksFunctionDeclaration } from "./tools/planningTasks.tool";
import { bashToolFunctionDeclaration } from "./tools/bash.tool";

export async function agentLoopStream(prompt: string) {
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

  const interaction = await client.interactions.create({
    input: messageHistory,
    stream: true,
    model: "gemini-2.5-flash",
    tools: [
      askClarifyingQuestionsFunctionDeclaration,
      planningTasksFunctionDeclaration,
      bashToolFunctionDeclaration,
    ],
  });

  for await (const event of interaction) {
    console.log(event);
  }
}

interface StreamResult {
  interactionId: string;
  functionCall?: {
    name: string;
    arguments: unknown;
    callid: string;
  };
  text: string;
  status: "completed" | "requires_action";
}

await agentLoopStream("hi how are you");
