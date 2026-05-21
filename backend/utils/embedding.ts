import { GoogleGenAI } from "@google/genai";

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const input = text.trim();
  if (!input) {
    throw new Error("Embedding input is empty");
  }

  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: input,
    config: {
      outputDimensionality: 768,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error("Failed to generate embedding");
  }

  return values;
}
