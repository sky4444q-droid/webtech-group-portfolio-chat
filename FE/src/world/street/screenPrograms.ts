// ภาพบนจอโฆษณาวาดด้วย canvas 2D: โฆษณาร้านสมมติ, อีควอไลเซอร์, ตัวหนังสือวิ่ง, ลายเรขาคณิต/สแกน, จอเสีย
// ห้ามข้อมูลทีมบนจอโฆษณา (ข้อมูลทีมอยู่ใน Hologram/เต็มจอ)

import { SIGN_WORDS } from "../../config/signWords";
import { NEON } from "./kitMeshes";

export const SCREEN_W = 256;
export const SCREEN_H = 160;

type Program = (ctx: CanvasRenderingContext2D, t: number, seed: number) => void;

const W = SCREEN_W;
const H = SCREEN_H;
const color = (i: number) => NEON[Math.abs(i) % NEON.length];
const AD_WORDS = [...SIGN_WORDS.food, ...SIGN_WORDS.nexus].filter((w) => !w.vertical);

/** โฆษณาร้านสมมติ: ชื่อ + ลายพื้น + ราคาสมมติ */
const shopAd: Program = (ctx, t, seed) => {
  const c = color(seed);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#07040f");
  g.addColorStop(1, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#fff";
  for (let i = -H; i < W; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i + ((t * 20) % 18), 0);
    ctx.lineTo(i + H + ((t * 20) % 18), H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const word = AD_WORDS[(seed + Math.floor(t / 4)) % AD_WORDS.length];
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 34px "Inter Tight", "Noto Sans JP", "Noto Sans SC", "Noto Sans Thai", sans-serif`;
  ctx.fillText(word.text, W / 2, H * 0.42, W - 20);
  ctx.font = `700 22px "Orbitron", sans-serif`;
  ctx.fillStyle = Math.floor(t * 2) % 2 ? "#ffe066" : "#fff";
  ctx.fillText(`¥${(((seed * 37) % 9) + 3) * 100}`, W / 2, H * 0.78);
};

/** อีควอไลเซอร์ */
const equaliser: Program = (ctx, t, seed) => {
  ctx.fillStyle = "#040406";
  ctx.fillRect(0, 0, W, H);
  const bars = 16;
  const bw = W / bars;
  for (let i = 0; i < bars; i++) {
    const v = 0.5 + 0.5 * Math.sin(t * (2 + (i % 5)) + i * 1.7 + seed);
    const h = (0.15 + 0.8 * v) * H;
    ctx.fillStyle = color(seed + (i > bars / 2 ? 1 : 0));
    for (let y = H - 6; y > H - h; y -= 8) ctx.fillRect(i * bw + 2, y - 5, bw - 4, 5);
  }
};

/** ตัวหนังสือวิ่ง */
const ticker: Program = (ctx, t, seed) => {
  ctx.fillStyle = "#020208";
  ctx.fillRect(0, 0, W, H);
  ctx.font = `700 40px "Inter Tight", "Noto Sans JP", "Noto Sans Thai", sans-serif`;
  ctx.textBaseline = "middle";
  const words = AD_WORDS.slice(seed % 6, (seed % 6) + 5).map((w) => w.text).join("  ★  ");
  const width = ctx.measureText(words).width + 60;
  const x = W - ((t * 70) % (width + W));
  ctx.fillStyle = color(seed);
  ctx.fillText(words, x, H / 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
};

/** ลายเรขาคณิต + เส้นสแกน */
const scanlines: Program = (ctx, t, seed) => {
  ctx.fillStyle = "#04030a";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = color(seed);
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const r = ((t * 30 + i * 22) % 130) + 4;
    ctx.globalAlpha = 1 - r / 134;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI * 2 + t * 0.3;
      const px = W / 2 + Math.cos(a) * r;
      const py = H / 2 + Math.sin(a) * r * 0.62;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, (t * 60) % H, W, 2);
  ctx.globalAlpha = 1;
};

/** จอเสีย */
const glitch: Program = (ctx, t, seed) => {
  scanlines(ctx, t, seed + 3);
  const s = Math.floor(t * 8) + seed;
  for (let i = 0; i < 7; i++) {
    const y = (s * 53 + i * 31) % H;
    const h = 3 + ((s + i) % 12);
    const dx = (((s * 7 + i * 13) % 40) - 20) * 2;
    ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h);
    ctx.fillStyle = i % 2 ? "rgba(255,31,61,0.35)" : "rgba(5,217,232,0.35)";
    ctx.fillRect(0, y, W, 1);
  }
};

export const SCREEN_PROGRAMS: Program[] = [shopAd, equaliser, ticker, scanlines, glitch];
