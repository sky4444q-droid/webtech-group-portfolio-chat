// HUD: ส่วนควบคุมที่ลอยอยู่บนฉาก (แสดงเท่าที่จำเป็น)

import { portfolio } from "../data/portfolio";
import { useState } from "react";
import { useWorld } from "../store/useWorld";
import { DISTRICTS } from "../config/districts";
import { usePick, useT, type DictKey } from "../i18n";
import type { DistrictId } from "../types";
import { MiniMap } from "./MiniMap";

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
        {portfolio.group.logo && <img className="hud-logo" src="/images/nexora-symbol.png" alt="NEXORA" />}
        <div className="hud-location" style={{ "--accent": cfg.color } as React.CSSProperties}>
          <span className="hud-location-kicker">{travel ? tr("traveling") : "LOCATION"}</span>
          <h1 key={shown} className="hud-location-name">
            {p(cfg.name)}
          </h1>
          {!travel && <p className="hud-hint">{tr(HINTS[district])}</p>}
        </div>
        <div className="hud-controls">
          <LangSwitch />
          <SettingsMenu />
        </div>
      </header>

      <MiniMap />

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
