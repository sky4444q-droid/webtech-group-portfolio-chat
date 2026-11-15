import { useState } from "react";

interface ComposerProps {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
}

export default function Composer({ onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState("");

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    void onSend(trimmed);
    setText("");
  }

  return (
    <div className="composer">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // ไม่ส่งตอนกำลังพิมพ์ภาษาไทย/จีน (IME) อยู่
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        placeholder="พิมพ์ข้อความ..."
        disabled={disabled}
        aria-label="พิมพ์ข้อความ"
      />
      <button type="button" onClick={submit} disabled={disabled || !text.trim()}>
        ส่ง
      </button>
    </div>
  );
}