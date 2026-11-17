// HUD: ส่วนควบคุมที่ลอยอยู่บนฉาก (แสดงเท่าที่จำเป็น)

import { portfolio } from "../data/portfolio";
import { useEffect, useState } from "react";
import { useWorld } from "../store/useWorld";
import { DISTRICTS } from "../config/districts";
import { usePick, useT, type DictKey } from "../i18n";
import type { DistrictId } from "../types";
import { NavPills } from "./NavPills";
import { ControlHint } from "./ControlHint";
import { useAudio } from "../store/useAudio";
import { FRAGMENTS, useDiscovery } from "../store/useDiscovery";

const HINTS: Record<DistrictId, DictKey> = {
  gate: "gateHint",
  nexus: "nexusHint",
  projects: "projectOpenHint",
  team: "teamOpenHint",
  sanctuary: "sanctuaryHint",
};

export function Hud() {
  const tr = useT();
  const p = usePick();
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  const chatOpen = useWorld((s) => s.chatOpen);
  const toggleChat = useWorld((s) => s.toggleChat);
  const openPanel = useWorld((s) => s.openPanel);
  const shown = travel ? travel.to : district;
  const cfg = DISTRICTS[shown];

  return (
    <div className="hud">
      <header className="hud-top">
        {/* มุมซ้ายบน: ชื่อแบรนด์แดงตัวหนา + บรรทัดเล็กสีแดง (ที่อยู่ตอนนี้ / ข้อความทั่วไป / วิธีใช้ที่นี่) */}
        <div className="hud-brand">
          <div className="hud-brand-row">
            {portfolio.group.logo && <img className="hud-logo" src="/images/nexora-symbol.png" alt="" />}
            <span className="hud-brand-name">NEXORA</span>
          </div>
          <h1 key={shown} className="hud-line hud-line-place">
            {travel ? `${tr("traveling")} → ` : ""}
            {p(cfg.name)}
          </h1>
          <p className="hud-line">{tr("hudTagline")}</p>
          {!travel && <p className="hud-line hud-line-hint">{tr(HINTS[district])}</p>}
        </div>
        <NavPills />
        <div className="hud-controls">
          <DiscoveryCounter />
          <LangSwitch />
          <SoundButton />
          <SettingsMenu />
        </div>
      </header>

      <ControlHint />

      <BackButton />

      <div className="hud-actions">
        <button type="button" className="btn btn-ghost" onClick={() => openPanel({ kind: "contact" })}>
          {tr("contact")}
        </button>
        <button type="button" className={`btn btn-ai ${chatOpen ? "is-active" : ""}`} onClick={toggleChat} aria-pressed={chatOpen}>
          <span className="btn-ai-dot" aria-hidden="true" />
          {tr("talkToAi")}
        </button>
      </div>
    </div>
  );
}

function LangSwitch() {
  const lang = useWorld((s) => s.lang);
  const setLang = useWorld((s) => s.setLang);
  const tr = useT();
  return (
    <div className="lang-switch" role="group" aria-label={tr("language")}>
      {(["th", "en"] as const).map((l) => (
        <button key={l} type="button" className={lang === l ? "is-active" : ""} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function SettingsMenu() {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const quality = useWorld((s) => s.quality);
  const setQuality = useWorld((s) => s.setQuality);
  return (
    <div className="settings">
      <button type="button" className="icon-btn" aria-label={tr("settings")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
            transform="translate(-1 0)"
          />
        </svg>
      </button>
      {open && (
        <div className="settings-menu" role="menu">
          <SoundSettings />
          <p className="settings-label">{tr("quality")}</p>
          {(["high", "low"] as const).map((q) => (
            <button
              key={q}
              type="button"
              role="menuitemradio"
              aria-checked={quality === q}
              className={quality === q ? "is-active" : ""}
              onClick={() => {
                setQuality(q);
                setOpen(false);
              }}
            >
              {tr(q === "high" ? "qualityHigh" : "qualityLow")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SoundButton() {
  const tr = useT();
  const master = useAudio((s) => s.master);
  const toggleMaster = useAudio((s) => s.toggleMaster);
  const label = tr(master ? "soundOff" : "soundOn");
  return (
    <button type="button" className={`icon-btn ${master ? "" : "is-muted"}`} aria-label={label} title={label} aria-pressed={!master} onClick={toggleMaster}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z" />
        {master ? (
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
        ) : (
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m16 9 5 6m0-6-5 6" />
        )}
      </svg>
    </button>
  );
}

function SoundSettings() {
  const tr = useT();
  const voice = useAudio((s) => s.voice);
  const ambience = useAudio((s) => s.ambience);
  const setVoice = useAudio((s) => s.setVoice);
  const setAmbience = useAudio((s) => s.setAmbience);
  return (
    <>
      <p className="settings-label">{tr("soundOn")}</p>
      <label className="settings-check">
        <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
        {tr("soundVoice")}
      </label>
      <label className="settings-check">
        <input type="checkbox" checked={ambience} onChange={(e) => setAmbience(e.target.checked)} />
        {tr("soundAmbience")}
      </label>
    </>
  );
}

/** ย้อนกลับจุดชมก่อนหน้า (แสดงเมื่อไม่ได้อยู่จุดแรก) — คลิกขวาในฉากก็ย้อนกลับได้ */
function BackButton() {
  const tr = useT();
  const canBack = useWorld((s) => s.viewpointStack.length > 0 && !s.travel);
  const backViewpoint = useWorld((s) => s.backViewpoint);

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      e.preventDefault();
      useWorld.getState().backViewpoint();
    };
    window.addEventListener("contextmenu", onContext);
    return () => window.removeEventListener("contextmenu", onContext);
  }, []);

  if (!canBack) return null;
  return (
    <button type="button" className="btn btn-ghost hud-back" onClick={backViewpoint}>
      ← {tr("viewBack")}
    </button>
  );
}

/** ตัวนับเศษข้อมูล — ซ่อนจนกว่าจะเจอชิ้นแรก */
function DiscoveryCounter() {
  const tr = useT();
  const found = useDiscovery((s) => s.found.length);
  if (!found) return null;
  return (
    <span className="discovery-count" title={tr("discoveryLabel")}>
      ◆ {found}/{FRAGMENTS.length}
    </span>
  );
}
