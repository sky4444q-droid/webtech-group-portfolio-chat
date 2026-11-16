// จุดเดียวที่หน้าเว็บคุยกับหลังบ้าน (BE)
// - VITE_USE_MOCK=true → โหมดจำลอง (ไม่เรียกหลังบ้าน)
// - VITE_API_URL ว่าง → เรียก /messages ที่โดเมนเดียวกัน (ตอน dev Vite ส่งต่อไปหลังบ้านตาม VITE_PROXY_TARGET)
// - ตั้ง VITE_API_URL → POST {VITE_API_URL}/messages
// รองรับทั้งรูปแบบเดิมของ BE ({ userMessage, assistantMessage })
// และรูปแบบใหม่ที่มี sessionId / sources เพิ่ม

import type { ChatRequest, ChatResult, ChatSource } from "../types";

/** Render แบบฟรีหลับได้ คำขอแรกอาจช้า 30–60 วินาที */
export const DEFAULT_TIMEOUT_MS = 70_000;
/** รอนานกว่านี้ให้แสดงข้อความ "กำลังปลุกระบบ AI" */
export const WAKING_NOTICE_MS = 8_000;

export type ChatErrorKind = "rate_limit" | "server" | "network" | "timeout" | "bad_response";

export class ChatApiError extends Error {
  readonly kind: ChatErrorKind;

  constructor(kind: ChatErrorKind, message: string) {
    super(message);
    this.name = "ChatApiError";
    this.kind = kind;
  }
}

export interface SendChatOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  mockDelayMs?: number;
  /** บังคับโหมดจำลอง (ค่าเริ่มต้นอ่านจาก VITE_USE_MOCK) */
  mock?: boolean;
}

export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK === "true";
}

/** URL หลังบ้านแบบไม่มี / ท้าย — ว่าง = โดเมนเดียวกัน */
export function apiBase(baseUrl: string = import.meta.env.VITE_API_URL ?? ""): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export async function sendChat(req: ChatRequest, opts: SendChatOptions = {}): Promise<ChatResult> {
  if (opts.mock ?? isMockMode()) return mockReply(req, opts.mockDelayMs ?? 700);

  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${apiBase(opts.baseUrl)}/messages`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: req.text,
        sessionId: req.sessionId,
        language: req.language,
        district: req.district,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut) throw new ChatApiError("timeout", "request timed out");
    throw new ChatApiError("network", err instanceof Error ? err.message : "network error");
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = readString(body, "error") ?? `HTTP ${res.status}`;
    throw new ChatApiError(res.status === 429 ? "rate_limit" : "server", message);
  }

  const assistant = isRecord(body) ? body.assistantMessage : undefined;
  const reply = readString(assistant, "text");
  if (reply === undefined) {
    throw new ChatApiError("bad_response", "response has no assistantMessage.text");
  }

  return {
    reply,
    sources: readSources(isRecord(body) ? body.sources : undefined),
    sessionId: readString(body, "sessionId") ?? null,
    mock: false,
  };
}

// ---------- ตัวช่วยอ่าน JSON ที่ไม่แน่ใจรูปแบบ ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown, key: string): string | undefined {
  if (!isRecord(v)) return undefined;
  const value = v[key];
  return typeof value === "string" ? value : undefined;
}

function readSources(v: unknown): ChatSource[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((item): ChatSource[] => {
    if (!isRecord(item) || typeof item.title !== "string") return [];
    const url = typeof item.url === "string" ? item.url : null;
    return [{ title: item.title, url }];
  });
}

// ---------- โหมดจำลอง ----------

async function mockReply(req: ChatRequest, delayMs: number): Promise<ChatResult> {
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const reply =
    req.language === "en"
      ? `(Mock mode) This page is not connected to the real AI yet. You asked: “${req.text}”. Once the backend is connected, I will answer from the team's portfolio and general knowledge.`
      : `(โหมดจำลอง) ตอนนี้หน้าเว็บยังไม่ได้เชื่อมกับระบบ AI จริง คุณถามว่า “${req.text}” เมื่อเชื่อมหลังบ้านแล้ว ฉันจะตอบจากข้อมูล Portfolio ของทีมและความรู้ทั่วไปได้`;
  return {
    reply,
    sources: [
      {
        title: req.language === "en" ? "Sample source (mock mode)" : "ตัวอย่างแหล่งอ้างอิง (โหมดจำลอง)",
        url: null,
      },
    ],
    sessionId: req.sessionId,
    mock: true,
  };
}
