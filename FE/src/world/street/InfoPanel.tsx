// แผงข้อมูลใหญ่แบนบนหน้าตึก: กรอบบาง + บล็อกข้อความ + ลายเส้น wireframe
// เนื้อหา: คำตกแต่ง · ชื่อที่ + วิธีใช้ (ตามภาษา) · ถนนแกลเลอรี = ชื่อผลงาน + เทคโนโลยีจาก /portfolio

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DISTRICTS } from "../../config/districts";
import { SIGN_WORDS } from "../../config/signWords";
import { t, pick, type DictKey } from "../../i18n";
import { useWorld } from "../../store/useWorld";
import { usePortfolio } from "../../store/usePortfolio";
import type { DistrictId, Lang, Project } from "../../types";
import type { KitItem } from "./kitLayout";
import { NEON } from "./kitMeshes";
import { STREETS, type StreetId } from "./streets";

const HINT: Record<DistrictId, DictKey> = {
  gate: "gateHint",
  nexus: "nexusHint",
  projects: "projectOpenHint",
  team: "teamOpenHint",
  sanctuary: "sanctuaryHint",
};

export type PanelContent = { kind: "words" } | { kind: "place"; district: DistrictId } | { kind: "project" };

/** แผงไหนแสดงอะไร (ทุก 3 แผงมีหนึ่งแผงเป็นข้อมูล) */
export function panelContent(item: KitItem, index: number): PanelContent {
  if (index % 3 !== 0) return { kind: "words" };
  if (item.street === "nexus") return { kind: "place", district: "nexus" };
  const street = STREETS[item.street as StreetId];
  if (street.district === "projects") return { kind: "project" };
  return { kind: "place", district: street.district };
}

export function InfoPanel({ item, content }: { item: KitItem; content: PanelContent }) {
  // คำตกแต่งไม่เปลี่ยนตามภาษา จึงไม่ subscribe lang
  const lang = useWorld((s) => (content.kind === "words" ? "th" : s.lang)) as Lang;
  const project = usePortfolio((s) => s.data.projects[0]) as Project | undefined;
  const [w, h] = item.size;
  // ใช้ค่าข้อความเป็น key (object content ถูกสร้างใหม่ทุกครั้งที่ parent render) — แผงคำตกแต่งจึงไม่วาดใหม่
  const contentKey = content.kind === "place" ? `place:${content.district}` : content.kind;
  const texture = useMemo(() => {
    const cw = 512;
    const ch = Math.max(128, Math.round((cw * h) / w));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    drawPanel(canvas.getContext("2d")!, cw, ch, item, content, lang, content.kind === "project" ? project : undefined);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [item, contentKey, lang, content.kind === "project" ? project : null, w, h]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={item.position} rotation={[0, item.rotationY, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} color={[1.25, 1.25, 1.25]} side={THREE.FrontSide} />
    </mesh>
  );
}

function drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number, item: KitItem, content: PanelContent, lang: Lang, project?: Project) {
  const c = NEON[item.variant % NEON.length];
  ctx.fillStyle = "rgba(6,6,12,0.82)";
  ctx.fillRect(0, 0, w, h);
  // กรอบบาง + มุม
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.lineWidth = 5;
  for (const [x, y, dx, dy] of [[6, 6, 1, 1], [w - 6, 6, -1, 1], [6, h - 6, 1, -1], [w - 6, h - 6, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 26);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 26, y);
    ctx.stroke();
  }
  // ลายเส้น wireframe มุมขวาล่าง
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  const cx = w * 0.78;
  const cy = h * 0.68;
  const r = Math.min(w, h) * 0.22;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * (0.2 + i * 0.2), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * (0.2 + i * 0.2), r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const sans = `"Inter Tight", "Noto Sans Thai", "Noto Sans JP", "Noto Sans SC", sans-serif`;
  const head = (text: string, y: number, size: number) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${size}px ${sans}`;
    ctx.fillText(text, 26, y, w - 52);
  };
  const kicker = (text: string, y: number) => {
    ctx.fillStyle = c;
    ctx.font = `700 18px "Orbitron", ${sans}`;
    ctx.fillText(text, 26, y, w - 52);
  };
  const body = (text: string, y: number, size = 22) => wrap(ctx, text, 26, y, w * 0.62, size * 1.35, `600 ${size}px ${sans}`, "rgba(234,247,255,0.85)");
  ctx.textBaseline = "top";

  if (content.kind === "words") {
    const words = SIGN_WORDS[item.street === "nexus" ? "nexus" : STREETS[item.street as StreetId].mood].filter((x) => !x.vertical);
    const a = words[item.variant % words.length];
    const b = words[(item.variant + 5) % words.length];
    kicker(`No.${String(item.variant + 1).padStart(2, "0")}`, 26);
    head(a.text, 56, Math.min(64, h * 0.22));
    ctx.fillStyle = c;
    ctx.fillRect(26, 56 + Math.min(64, h * 0.22) + 14, w * 0.3, 4);
    body(b.text, 56 + Math.min(64, h * 0.22) + 32, 26);
  } else if (content.kind === "place") {
    const d = DISTRICTS[content.district];
    kicker(t(lang, "panelHowTo"), 26);
    head(pick(lang, d.name), 54, 44);
    const y = body(t(lang, HINT[content.district]), 116);
    body(t(lang, "panelFollowGuide"), y + 12, 18);
  } else {
    kicker(t(lang, "panelProject"), 26);
    head(project ? pick(lang, project.name) : "NEXORA", 54, 40);
    kicker(t(lang, "panelTechStack"), 112);
    body((project?.techStack ?? []).join(" · ") || "—", 140);
  }
}

/** ตัดบรรทัดตามความกว้าง (ภาษาไทยไม่มีเว้นวรรค จึงตัดทีละตัวอักษรเมื่อจำเป็น) คืนตำแหน่ง y ถัดไป */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, font: string, color: string): number {
  ctx.font = font;
  ctx.fillStyle = color;
  let line = "";
  // ตัดตามคำ (Intl.Segmenter รู้จักคำไทย) ถ้าไม่มีให้ตัดทีละกลุ่มอักษร ไม่แยกสระ/วรรณยุกต์ออกจากพยัญชนะ
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: object) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  const parts = Seg ? [...new Seg("th", { granularity: "word" }).segment(text)].map((s) => s.segment) : text.match(/.[ัิ-ฺ็-๎]*/gu) ?? [];
  for (const ch of parts) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = ch === " " ? "" : ch;
    } else line += ch;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}
