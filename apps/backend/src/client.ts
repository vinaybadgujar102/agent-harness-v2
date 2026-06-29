import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const client = new GoogleGenAI({
  apiKey: "",
});

export const openAiClient = new OpenAI({
  apiKey: "",
});

export const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
