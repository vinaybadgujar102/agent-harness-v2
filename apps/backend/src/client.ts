import { GoogleGenAI } from "@google/genai";

export const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
