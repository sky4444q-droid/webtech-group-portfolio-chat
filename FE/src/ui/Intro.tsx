// Intro Cinematic 4–5 วินาที: แสดงความคืบหน้า ชื่อกลุ่ม แล้วปุ่มเข้าสู่จักรวาล

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useWorld } from "../store/useWorld";
import { usePick, useT } from "../i18n";
import { portfolio } from "../data/portfolio";
import { INTRO_MS } from "../config/timing";
import { useAudio } from "../store/useAudio";
import { useAi } from "../store/useAi";
import * as sfx from "../audio/sfx";

/** ปุ่ม Enter = การคลิกแรกของผู้ชม → ปลดล็อกเสียง แล้ว AI ทักทาย */
function enterUniverse(finishIntro: () => void) {
  if (useAi.getState().mascotPhase !== "walk") return;
  sfx.unlock();
  useAudio.getState().unlock();
  sfx.play("click");
  const ai = useAi.getState();
  // ตัวจิ๋วออกเดินต่อทิศเดิม พาเข้าเมือง (การเดินทางครั้งแรก)
  ai.setMascotPhase("guide");
  ai.setMood("happy", 900);
  finishIntro();
  ai.say("voiceGreeting");
}

export function Intro() {
  const tr = useT();
  const p = usePick();
  const introDone = useWorld((s) => s.introDone);
  const finishIntro = useWorld((s) => s.finishIntro);
  const { progress, active } = useProgress();
  const [elapsed, setElapsed] = useState(0);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const e = performance.now() - start;
      setElapsed(e);
      if (e < INTRO_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (introDone) return null;

  const timeK = Math.min(1, elapsed / INTRO_MS);
  // ฉากนี้แทบไม่มีไฟล์ให้โหลด ความคืบหน้าจึงเดินตามเวลาเป็นหลัก
  const loadK = active ? progress / 100 : 1;
  const k = skipped ? 1 : Math.min(timeK, Math.max(loadK, timeK * 0.98));
  const ready = skipped || (timeK >= 1 && !active);

  return (
    <div className={`intro ${ready ? "is-ready" : ""}`}>
      <div className="intro-scanlines" aria-hidden="true" />
      <div className="intro-content">
        <p className="intro-kicker">{tr("introKicker")}</p>
        {/* ชุดโลโก้ + ชื่อแบรนด์ (wordmark เดียวกับมุมซ้ายบนของ HUD) */}
        <div className="intro-lockup">
          {portfolio.group.logo && <img className="intro-logo" src={portfolio.group.logo} alt="" />}
          <h1 className="intro-title brand-wordmark">{p(portfolio.group.name)}</h1>
        </div>
        <div className="intro-bar" role="progressbar" aria-valuenow={Math.round(k * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={tr("introLoading")}>
          <span style={{ transform: `scaleX(${k})` }} />
        </div>
        <p className="intro-percent">
          {tr("introLoading")} {Math.round(k * 100)}%
        </p>
        {ready ? (
          <button type="button" className="btn btn-enter" onClick={() => enterUniverse(finishIntro)} autoFocus>
            {tr("introEnter")}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-small intro-skip" onClick={() => setSkipped(true)}>
            {tr("introSkip")}
          </button>
        )}
      </div>
    </div>
  );
}
