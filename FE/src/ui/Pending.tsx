// แสดงข้อความจากข้อมูล Portfolio — ถ้ายังเป็นข้อมูลชั่วคราว จะมีป้าย "รอข้อมูล" ให้เห็นชัด

import type { Localized } from "../types";
import { usePick, useT } from "../i18n";

export function PendingBadge() {
  const tr = useT();
  return <span className="pending-badge">{tr("pending")}</span>;
}

export function Text({ value, placeholder }: { value: Localized; placeholder: boolean }) {
  const p = usePick();
  const tr = useT();
  const text = p(value);
  // ถ้าทั้งช่องคือคำว่า "รอข้อมูล" แสดงเป็นป้ายอย่างเดียว ไม่ซ้ำคำ
  if (text === tr("pending")) return <PendingBadge />;
  return (
    <>
      {text}
      {placeholder && <PendingBadge />}
    </>
  );
}

/** ลิงก์ที่ยังไม่มี URL จะกดไม่ได้ */
export function MaybeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="btn btn-disabled" aria-disabled="true">
        {children} <PendingBadge />
      </span>
    );
  }
  return (
    <a className="btn" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
