import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const openAiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
