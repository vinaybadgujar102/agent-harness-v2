import { LovableAiAgent } from "./abstraction/agent";
import { ClaudeProvider } from "./abstraction/providers/claude";
import { GoogleAgentProvider } from "./abstraction/providers/google";
import { OpenAiProvider } from "./abstraction/providers/openai";
import { anthropicClient, client, openAiClient } from "./client";

// const agent = new LovableAiAgent(new GoogleAgentProvider(client));
const agent = new LovableAiAgent(new OpenAiProvider(openAiClient));
// const agent = new LovableAiAgent(new ClaudeProvider(anthropicClient));

console.log(await agent.create("hi how are you"));
