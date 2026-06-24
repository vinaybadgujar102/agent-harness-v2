import { GoogleGenAI, type Interactions, type Step } from "@google/genai";
import { planningTasksFunction } from "./tools/planningTasks.tool";
import { askClarifyingQuestionsFunction } from "./tools/question.tool";
import { client } from "./client";

// initialize client

// as we know that model itself doesnt have context of prev conversation
// we as application shoould provide all the convo history
// i.e. in steps, so llm gets all the context it needs.
const messageHistory: Step[] = [
  {
    type: "user_input",
    content: [
      {
        type: "text",
        text: "My name is vinay",
      },
    ],
  },
];
// first interaction
const interaction = await client.interactions.create({
  model: "gemma-4-26b-a4b-it",
  input: messageHistory,
  tools: [planningTasksFunction, askClarifyingQuestionsFunction],
});

if (!interaction) console.log("something went wrong");

// interaction steps is the collection of the same object which we pass the input
console.log(interaction.steps.at(-1)!.content[0].text);

// we push all the step into the message histroy
messageHistory.push(...interaction.steps);
// then we add user input
messageHistory.push({
  type: "user_input",
  content: [
    {
      type: "text",
      text: "What is my name",
    },
  ],
});

// call llm again
const interaction2 = await client.interactions.create({
  model: "gemma-4-26b-a4b-it",
  input: messageHistory,
  tools: [planningTasksFunction, askClarifyingQuestionsFunction],
});

console.log(interaction2.steps.at(-1).content[0].text);
