// ซับไตเติลของคำพูด AI — แสดงทุกครั้งที่ AI พูด (แม้ปิดเสียงหรือเครื่องไม่มีเสียงภาษานั้น)

import { useAi } from "../store/useAi";

export function Subtitle() {
  const subtitle = useAi((s) => s.subtitle);
  if (!subtitle) return null;
  return (
    <div className="ai-subtitle" role="status" aria-live="polite">
      <span className="ai-subtitle-dot" aria-hidden="true" />
      <p key={subtitle}>{subtitle}</p>
    </div>
  );
}
