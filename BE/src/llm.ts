import OpenAI from "openai";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

let client: OpenAI | null = null;

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL || DEFAULT_BASE_URL,
      timeout: 25_000,
      maxRetries: 0,
    });
  }
  return client;
}

export async function askLlm(system: string, turns: ChatTurn[]): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    messages: [...(system ? [{ role: "system" as const, content: system }] : []), ...turns],
  });
  return completion.choices[0]?.message?.content?.trim() || "(โมเดลไม่ได้ส่งคำตอบกลับมา)";
}
