import type { GoogleGenAI, Step } from "@google/genai";
import { client } from "./client";

type InteractionStep =
  | {
      type: "tool_call_needed";
      toolName: string;
      call_id: string;
      toolArgs: unknown;
    }
  | {
      type: "message";
      text: string;
    };

const ConversationHistory: ConversationHistoryType = () => {
  const conversations: Step[] = [];

  function start(prompt: string) {
    conversations.push({
      type: "user_input",
      content: [{ type: "text", text: prompt }],
    });
  }

  function append(conversation: Step) {
    conversations.push(conversation);
  }

  function addToolCallResult(
    name: string,
    call_id: string,
    result: unknown,
  ): void {
    conversations.push({
      type: "function_result",
      call_id,
      name,
      result: JSON.stringify(result),
    });
  }

  function getWholeConversations() {
    return conversations;
  }

  return {
    append,
    start,
    getWholeConversations,
    addToolCallResult,
  };
};

interface LLMProvider {
  converse(conversations: Step[]): Promise<InteractionStep>;
}

class GoogleAgentProvder implements LLMProvider {
  constructor(private googleClient: GoogleGenAI) {}

  async converse(messageHistory: Step[]): Promise<InteractionStep> {
    const interaction = await this.googleClient.interactions.create({
      model: "gemini-2.5-flash",
      tools: [],
      system_instruction: "",
      input: messageHistory,
    });

    for (const step of interaction.steps) {
      if (step.type === "function_call") {
        return {
          type: "tool_call_needed",
          toolName: step.name,
          toolArgs: step.arguments,
          call_id: step.id,
        };
      }
    }

    const last = interaction.steps.at(-1)?.content[0].text;

    return {
      type: "message",
      text: last ?? "",
    };
  }
}

class LovableAiAgent {
  private provider: LLMProvider;
  private conversationHistory = ConversationHistory();

  constructor(passed_provider: LLMProvider) {
    this.provider = passed_provider;
  }

  async create(input: string) {
    this.conversationHistory.start(input);
    while (true) {
      const response = await this.provider.converse(
        this.conversationHistory.getWholeConversations(),
      );
      if (response.type === "tool_call_needed") {
        // execute tool call

        this.conversationHistory.addToolCallResult(
          response.toolName,
          response.call_id,
          {},
        );
        continue;
      }

      return response.text;
    }
  }
}

const agent = new LovableAiAgent(new GoogleAgentProvder(client));

console.log(await agent.create("hi how are you"));

type ConversationHistoryType = () => {
  append: (conversation: Step) => void;
  start: (prompt: string) => void;
  getWholeConversations: () => Step[];
  addToolCallResult: (name: string, call_id: string, result: unknown) => void;
};
