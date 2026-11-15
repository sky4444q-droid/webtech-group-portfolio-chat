import { useState } from 'react';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onUpdate: (id: number, text: string) => void;
  onDelete: (id: number) => void;
}

export default function MessageBubble({ message, onUpdate, onDelete }: MessageBubbleProps) {
  const isUser: boolean = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function startEdit() {
    setDraft(message.text);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onUpdate(message.id, trimmed);
    setEditing(false);
  }

  return (
    <div className={`bubble-row ${isUser ? 'row-user' : 'row-assistant'}`}>
      <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
        {editing ? (
          <div className="bubble-edit">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <button onClick={saveEdit} disabled={!draft.trim()}>
              บันทึก
            </button>
            <button onClick={() => setEditing(false)}>ยกเลิก</button>
          </div>
        ) : (
          <>
            {message.text}
            <div className="bubble-actions">
              {isUser && <button onClick={startEdit}>แก้ไข</button>}
              <button onClick={() => onDelete(message.id)}>ลบ</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
