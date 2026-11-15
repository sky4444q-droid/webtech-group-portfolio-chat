
import { useState, useEffect } from "react";
import ChatLog from "./components/ChatLog";
import Composer from "./components/Composer";
import {
  fetchMessages,
  sendMessage,
  clearMessages,
  updateMessage,
  deleteMessage,
} from "./api";
import type { Message } from "./types";

const POLL_INTERVAL = 2000;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const data = await fetchMessages();

        if (active) {
          setMessages(data);
          setError(null);
        }
      } catch {
        if (active) {
          setError(
            "เชื่อมต่อ API ไม่ได้ — ตรวจสอบว่า Backend ทำงานอยู่หรือไม่"
          );
        }
      }
    }

    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function handleSend(text: string) {
    setSending(true);
    setPendingText(text);
    setError(null);

    try {
      const { userMessage, assistantMessage } = await sendMessage(text);

      setMessages((prev) => [
        ...prev,
        userMessage,
        assistantMessage,
      ]);
    } catch {
      setError("ส่งข้อความไม่สำเร็จ — โปรดลองอีกครั้ง");
    } finally {
      setSending(false);
      setPendingText(null);
    }
  }

  async function handleClear() {
    const confirmed = window.confirm(
      "ต้องการล้างประวัติแชตทั้งหมดหรือไม่?"
    );

    if (!confirmed) return;

    try {
      await clearMessages();
      setMessages([]);
      setError(null);
    } catch {
      setError("ล้างประวัติไม่สำเร็จ");
    }
  }

  async function handleUpdate(id: number, text: string) {
    try {
      const updated = await updateMessage(id, text);

      setMessages((prev) =>
        prev.map((message) =>
          message.id === updated.id ? updated : message
        )
      );

      setError(null);
    } catch {
      setError("แก้ไขข้อความไม่สำเร็จ — โปรดลองอีกครั้ง");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMessage(id);

      setMessages((prev) =>
        prev.filter((message) => message.id !== id)
      );

      setError(null);
    } catch {
      setError("ลบข้อความไม่สำเร็จ — โปรดลองอีกครั้ง");
    }
  }

  return (
    <main className="chat-app">
      <header className="chat-header">
        <img
          className="brand-logo"
          src="/sky-cv-logo.png"
          alt="Sky CV"
        />

        <div className="brand-text">
          <h1>Chat CV Sky</h1>
          <p className="chat-subtitle">
            AI Portfolio Assistant
          </p>
        </div>

        <button
          className="clear-btn"
          onClick={handleClear}
          disabled={sending}
          type="button"
          title="ล้างประวัติแชต"
        >
          ล้างประวัติ
        </button>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <ChatLog
        messages={messages}
        pendingText={pendingText}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <Composer
        onSend={handleSend}
        disabled={sending}
      />
    </main>
  );
}
