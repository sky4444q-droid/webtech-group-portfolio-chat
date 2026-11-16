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
const TRAIL = 8;

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement[]>([]);
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const pts = Array.from({ length: TRAIL }, () => ({ x: -100, y: -100 }));
    let mx = -100;
    let my = -100;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (ref.current) {
        ref.current.style.transform = `translate(${mx}px, ${my}px)`;
        // วงแหวนเมื่อชี้วัตถุที่คลิกได้ (useCursor ของฉากตั้ง cursor เป็น pointer)
        const pointer = getComputedStyle(document.body).cursor === "pointer" || (e.target as HTMLElement)?.closest?.("button, a");
        ref.current.classList.toggle("is-pointer", !!pointer);
      }
    };
    const tick = () => {
      // หางแสงตามเมาส์แบบหน่วง
      let px = mx;
      let py = my;
      pts.forEach((p, i) => {
        p.x += (px - p.x) * 0.35;
        p.y += (py - p.y) * 0.35;
        const el = trail.current[i];
        if (el) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        px = p.x;
        py = p.y;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return (
    <>
      {Array.from({ length: TRAIL }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) trail.current[i] = el;
          }}
          className="cursor-trail"
          style={{ opacity: 0.5 * (1 - i / TRAIL), width: 8 - i * 0.6, height: 8 - i * 0.6 }}
          aria-hidden="true"
        />
      ))}
      <div ref={ref} className="cursor-glow" aria-hidden="true" />
    </>
  );
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
