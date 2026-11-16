// ส่วนเสริมเล็ก ๆ: Guide ผู้มาใหม่, คำแนะนำจอเล็ก, แสงตามเคอร์เซอร์, ปุ่ม Esc

import { useEffect, useRef, useState } from "react";
import { useWorld } from "../store/useWorld";
import { useT, type DictKey } from "../i18n";

const GUIDE: { title: DictKey; body: DictKey }[] = [
  { title: "guide1Title", body: "guide1Body" },
  { title: "guide2Title", body: "guide2Body" },
  { title: "guide3Title", body: "guide3Body" },
];

/** คำแนะนำ 3 ขั้น แสดงครั้งแรกที่มาถึง Central Nexus */
export function Guide() {
  const tr = useT();
  const show = useWorld((s) => s.introDone && !s.guideSeen && s.district === "nexus" && !s.travel);
  const dismiss = useWorld((s) => s.dismissGuide);
  const [step, setStep] = useState(0);
  if (!show) return null;
  const last = step === GUIDE.length - 1;
  return (
    <div className="guide" role="dialog" aria-label={tr(GUIDE[step].title)}>
      <span className="guide-step">
        {tr("guideStep")} {step + 1}/{GUIDE.length}
      </span>
      <h2>{tr(GUIDE[step].title)}</h2>
      <p>{tr(GUIDE[step].body)}</p>
      <div className="guide-actions">
        <button type="button" className="btn btn-ghost" onClick={dismiss}>
          {tr("introSkip")}
        </button>
        <button type="button" className="btn" onClick={() => (last ? dismiss() : setStep(step + 1))}>
          {last ? tr("guideDone") : tr("guideNext")}
        </button>
      </div>
    </div>
  );
}

export function SmallScreenNotice() {
  const tr = useT();
  const [small, setSmall] = useState(() => window.innerWidth < 900);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const onResize = () => setSmall(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  if (!small || dismissed) return null;
  return (
    <div className="small-screen" role="status">
      <p>{tr("smallScreen")}</p>
      <button type="button" className="btn btn-small" onClick={() => setDismissed(true)}>
        {tr("dismiss")}
      </button>
    </div>
  );
}

/** แสงนีออนเล็ก ๆ ตามเมาส์ */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const onMove = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}

/** ปุ่ม Esc ปิด panel ก่อน แล้วค่อยปิดแชท */
export function useEscape() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useWorld.getState().closeTopmost();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
