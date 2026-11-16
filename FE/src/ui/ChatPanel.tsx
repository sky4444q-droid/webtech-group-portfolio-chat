// หน้าต่างแชทกับ AI — เปิดได้จากทุกพื้นที่

import { useEffect, useRef, useState } from "react";
import { useWorld } from "../store/useWorld";
import { useChat } from "../store/useChat";
import { useT, type DictKey } from "../i18n";
import type { ChatMessage } from "../types";

export function ChatPanel() {
  const tr = useT();
  const open = useWorld((s) => s.chatOpen);
  const wide = useWorld((s) => s.district === "sanctuary" && !s.travel);
  const setChatOpen = useWorld((s) => s.setChatOpen);
  const { messages, pending, waking, mock, send, retry } = useChat();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, waking]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!draft.trim() || pending) return;
    void send(draft);
    setDraft("");
  };

  return (
    <aside className={`chat ${wide ? "chat-wide" : ""}`} aria-label={tr("chatTitle")}>
      <header className="chat-header">
        <span className="chat-avatar" aria-hidden="true" />
        <div className="chat-heading">
          <h2>{tr("chatTitle")}</h2>
          <p>{tr("chatSubtitle")}</p>
        </div>
        <button type="button" className="icon-btn" onClick={() => setChatOpen(false)} aria-label={tr("close")}>
          ✕
        </button>
      </header>

      {mock && (
        <p className="chat-mock" title={tr("chatMockHint")}>
          <span className="pending-badge">{tr("chatMock")}</span> {tr("chatMockHint")}
        </p>
      )}

      <div className="chat-log" aria-live="polite">
        {messages.length === 0 && <p className="chat-empty">{tr("chatEmpty")}</p>}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} onRetry={retry} isLast={m === messages.at(-1)} />
        ))}
        {pending && (
          <div className="bubble-row row-assistant">
            <div className="bubble bubble-assistant bubble-thinking" role="status">
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {waking ? tr("chatWaking") : tr("chatThinking")}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={2}
          placeholder={tr("chatPlaceholder")}
          aria-label={tr("chatPlaceholder")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // ไม่ส่งตอนกำลังพิมพ์ภาษาไทยด้วย IME, Shift+Enter = ขึ้นบรรทัดใหม่
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className="btn btn-send" disabled={pending || !draft.trim()}>
          {tr("chatSend")}
        </button>
      </form>
    </aside>
  );
}

function Bubble({ message, onRetry, isLast }: { message: ChatMessage; onRetry: () => void; isLast: boolean }) {
  const tr = useT();
  const pending = useChat((s) => s.pending);
  const isUser = message.role === "user";
  // ข้อความ error เก็บเป็น key คำแปล จึงแปลตามภาษาปัจจุบันได้
  const text = message.error ? tr(message.text as DictKey) : message.text;

  return (
    <div className={`bubble-row ${isUser ? "row-user" : "row-assistant"}`}>
      <div className={`bubble ${isUser ? "bubble-user" : "bubble-assistant"} ${message.error ? "bubble-error" : ""}`}>
        <p className="bubble-text">{text}</p>
        {message.sources.length > 0 && (
          <div className="sources">
            <span className="sources-title">{tr("chatSources")}</span>
            <ol>
              {message.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title}
                    </a>
                  ) : (
                    <span>{s.title}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
        {message.error && isLast && (
          <button type="button" className="btn btn-small" onClick={onRetry} disabled={pending}>
            {tr("chatRetry")}
          </button>
        )}
      </div>
    </div>
  );
}
