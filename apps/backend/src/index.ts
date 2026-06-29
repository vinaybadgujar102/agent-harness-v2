import { LovableAiAgent } from "./abstraction/agent";
import { GoogleAgentProvider } from "./abstraction/providers/google";
import { client } from "./client";

const prompt = "create simple html todo app";

const agent = new LovableAiAgent(new GoogleAgentProvider(client));
// const agent = new LovableAiAgent(new OpenAiProvider(openAiClient));
// const agent = new LovableAiAgent(new ClaudeProvider(anthropicClient));

const reply = await agent.create(prompt);
console.log(reply);
