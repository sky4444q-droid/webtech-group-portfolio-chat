
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message } from "../types";

interface ChatLogProps {
  messages: Message[];
  pendingText: string | null;
  onUpdate: (id: number, text: string) => void;
  onDelete: (id: number) => void;
}

export default function ChatLog({
  messages,
  pendingText,
  onUpdate,
  onDelete,
}: ChatLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingText]);

  if (messages.length === 0 && !pendingText) {
    return (
      <section className="chatlog chatlog-empty">
        <div className="welcome-icon" aria-hidden="true">
          ✦
        </div>

        <h2 className="welcome-title">
          สวัสดีครับ ผมคือ Chatbot ของ Sky 👋
        </h2>

        <p className="welcome-description">
          ยินดีต้อนรับครับ ผมช่วยตอบคำถามเกี่ยวกับ Sky ได้
          ทั้งประวัติการศึกษา ทักษะ และโปรเจกต์ต่าง ๆ
        </p>

        <div className="welcome-note">
          <span className="welcome-note-icon" aria-hidden="true">
            ◈
          </span>

          <div>
            <h3>ข้อมูลอ้างอิงจาก CV</h3>
            <p>
              คำตอบเกี่ยวกับ Sky อ้างอิงจากข้อมูล CV ที่มีอยู่
              หากไม่มีข้อมูลเพียงพอหรือไม่แน่ใจ
              ผมจะแจ้งให้ทราบแทนการคาดเดาข้อมูลขึ้นมาเองครับ
            </p>
          </div>
        </div>

        <p className="welcome-hint">
          ลองพิมพ์คำถามด้านล่างเพื่อเริ่มสนทนาได้เลยครับ
        </p>
      </section>
    );
  }

  return (
    <div className="chatlog">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}

      {pendingText && (
        <>
          <div className="bubble-row row-user">
            <div className="bubble bubble-user">{pendingText}</div>
          </div>

          <div className="bubble-row row-assistant">
            <div
              className="bubble bubble-assistant typing"
              role="status"
              aria-label="บอทกำลังพิมพ์"
            >
              <span />
              <span />
              <span />
            </div>
          </div>
        </>
      )}

      <div ref={endRef} />
    </div>
  );
}
