
import type { Message, ChatExchange } from './types';

const API_BASE_URL = 'https://my-ai-chatbot-api-b7qv.onrender.com';

const TIMEOUT_MS = 5000;
const SEND_TIMEOUT_MS = 30000;

// ดึงประวัติข้อความ
export async function fetchMessages(): Promise<Message[]> {
  const res = await fetch(`${API_BASE_URL}/messages`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ส่งข้อความให้ AI ตอบ
export async function sendMessage(text: string): Promise<ChatExchange> {
  const res = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ล้างประวัติข้อความทั้งหมด
export async function clearMessages(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/messages`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// แก้ไขข้อความ
export async function updateMessage(
  id: number,
  text: string,
): Promise<Message> {
  const res = await fetch(`${API_BASE_URL}/messages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ลบข้อความ
export async function deleteMessage(
  id: number,
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/messages/${id}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
