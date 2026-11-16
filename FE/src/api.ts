import type { Message, ChatExchange, Language, Portfolio } from './types';

// ตอน dev ปล่อยว่างได้ (vite proxy ไป localhost:3000) ตอน deploy ตั้ง VITE_API_URL เป็น URL ของ Backend
const API_BASE_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const TIMEOUT_MS = 5000;
const SEND_TIMEOUT_MS = 30000;

// sessionId เก็บในเบราว์เซอร์ เพื่อให้แต่ละคนเห็นเฉพาะแชตของตัวเอง
const SESSION_KEY = 'chat-session-id';
let memorySession: string | null = null;

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    memorySession ??= crypto.randomUUID();
    return memorySession;
  }
}

const sessionQuery = () => `sessionId=${encodeURIComponent(getSessionId())}`;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ข้อมูลทีมสำหรับหน้า Portfolio
export async function fetchPortfolio(): Promise<Portfolio> {
  return json(await fetch(`${API_BASE_URL}/portfolio`, { signal: AbortSignal.timeout(TIMEOUT_MS) }));
}

// ดึงประวัติข้อความของ session นี้
export async function fetchMessages(): Promise<Message[]> {
  return json(
    await fetch(`${API_BASE_URL}/messages?${sessionQuery()}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
}

// ส่งข้อความให้ AI ตอบ
export async function sendMessage(text: string, language: Language): Promise<ChatExchange> {
  return json(
    await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId: getSessionId(), language }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    }),
  );
}

// ล้างประวัติข้อความของ session นี้
export async function clearMessages(): Promise<{ message: string }> {
  return json(
    await fetch(`${API_BASE_URL}/messages?${sessionQuery()}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
}

// แก้ไขข้อความ
export async function updateMessage(id: number, text: string): Promise<Message> {
  return json(
    await fetch(`${API_BASE_URL}/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId: getSessionId() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
}

// ลบข้อความ
export async function deleteMessage(id: number): Promise<{ message: string }> {
  return json(
    await fetch(`${API_BASE_URL}/messages/${id}?${sessionQuery()}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
}
