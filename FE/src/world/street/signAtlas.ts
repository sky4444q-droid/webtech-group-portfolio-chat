// วาดคำบนป้ายทั้งหมดลง texture atlas (1–2 หน้า) ครั้งเดียว — สร้างทันทีด้วยฟอนต์สำรอง
// แล้ววาดทับใหม่ครั้งเดียวเมื่อฟอนต์เว็บโหลดเสร็จ (ช่องเท่าเดิม ไม่สร้าง texture ใหม่)

import * as THREE from "three";
import { SIGN_WORDS, type SignLang, type SignWord } from "../../config/signWords";
import { whenFontsReady } from "../../lib/fonts";
import { packAtlas, type AtlasRect } from "./atlas";

export const ATLAS_SIZE = 1024;
const SIZE = 56; // ความสูงตัวอักษร (px)
const PAD = 14;

const FAMILY: Record<SignLang, string> = {
  ja: `"Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif`,
  zh: `"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif`,
  th: `"Noto Sans Thai", "Leelawadee UI", "Tahoma", sans-serif`,
  en: `"Inter Tight", "Arial Narrow", "Arial", sans-serif`,
};
const font = (w: SignWord) => `${w.lang === "en" ? 800 : 700} ${SIZE}px ${FAMILY[w.lang]}`;

export interface SignAtlas {
  pages: THREE.CanvasTexture[];
  /** uv ของคำ: [u, v, กว้าง, สูง] และหน้าที่อยู่ */
  lookup: (word: SignWord) => { page: number; uv: [number, number, number, number] };
  /** คำทั้งหมด (ไม่ซ้ำ) */
  words: SignWord[];
}

const keyOf = (w: SignWord) => `${w.lang}|${w.vertical ? "v" : "h"}|${w.text}`;

let atlas: SignAtlas | null = null;

export function signAtlas(): SignAtlas {
  if (atlas) return atlas;
  const seen = new Map<string, SignWord>();
  for (const list of Object.values(SIGN_WORDS)) for (const w of list) seen.set(keyOf(w), w);
  const words = [...seen.values()];

  // ขนาดช่องจากฟอนต์สำรอง + เผื่อ 25% สำหรับฟอนต์จริงที่กว้างกว่า
  const m = document.createElement("canvas").getContext("2d")!;
  const sizes = words.map((w) => {
    if (w.vertical) return { w: Math.round(SIZE * 1.3 + PAD * 2), h: Math.round([...w.text].length * SIZE * 1.08 + PAD * 2) };
    m.font = font(w);
    return { w: Math.min(ATLAS_SIZE, Math.ceil(m.measureText(w.text).width * 1.25 + PAD * 2)), h: Math.round(SIZE * 1.45 + PAD * 2) };
  });
  const rects = packAtlas(sizes, ATLAS_SIZE);
  const pageCount = Math.max(...rects.map((r) => r.page)) + 1;
  const canvases = Array.from({ length: pageCount }, () => {
    const c = document.createElement("canvas");
    c.width = c.height = ATLAS_SIZE;
    return c;
  });
  const pages = canvases.map((c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });

  const draw = () => {
    canvases.forEach((c) => c.getContext("2d")!.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE));
    words.forEach((w, i) => drawWord(canvases[rects[i].page].getContext("2d")!, w, rects[i]));
    pages.forEach((p) => (p.needsUpdate = true));
  };
  draw();

  // วาดใหม่ครั้งเดียวเมื่อฟอนต์พร้อม (Google Fonts โหลดตามตัวอักษรที่ใช้ จึงสั่งโหลดเองก่อน)
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (fonts?.load) {
    const sample = (l: SignLang) => words.filter((w) => w.lang === l).map((w) => w.text).join("");
    const loads = (Object.keys(FAMILY) as SignLang[]).map((l) => fonts.load(`${l === "en" ? 800 : 700} ${SIZE}px ${FAMILY[l]}`, sample(l)).catch(() => []));
    const all = Promise.all(loads);
    void whenFontsReady(4000, { ready: all }).then((r) => {
      if (r === "ready") draw();
      // ฟอนต์มาช้ากว่า 4 วิ: ยังใช้ฟอนต์สำรองไปก่อน แล้ววาดใหม่ครั้งเดียวเมื่อมาถึงจริง
      else if (r === "timeout") void all.then(draw);
    });
  }

  // โหมดพัฒนา: Vite โหลดโมดูลนี้ใหม่ → คืนหน่วยความจำ texture ชุดเก่า
  if (import.meta.hot) import.meta.hot.dispose(() => pages.forEach((p) => p.dispose()));

  const index = new Map(words.map((w, i) => [keyOf(w), i]));
  atlas = {
    pages,
    words,
    lookup: (w) => {
      const r = rects[index.get(keyOf(w)) ?? 0];
      // CanvasTexture กลับแกน y (flipY)
      return { page: r.page, uv: [r.x / ATLAS_SIZE, 1 - (r.y + r.h) / ATLAS_SIZE, r.w / ATLAS_SIZE, r.h / ATLAS_SIZE] };
    },
  };
  return atlas;
}

/** ตัวอักษรขาวเรืองแสง (สีจริงมาจากสีของแต่ละป้าย) ย่อให้พอดีช่อง */
function drawWord(ctx: CanvasRenderingContext2D, w: SignWord, r: AtlasRect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.font = font(w);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const pass = (blur: number, alpha: number) => {
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = blur;
    ctx.globalAlpha = alpha;
    if (w.vertical) {
      [...w.text].forEach((ch, i) => ctx.fillText(ch, cx, r.y + PAD + SIZE * 0.55 + i * SIZE * 1.08));
    } else {
      const width = ctx.measureText(w.text).width;
      const fit = Math.min(1, (r.w - PAD * 2) / width);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, 1);
      ctx.fillText(w.text, 0, 0);
      ctx.restore();
    }
  };
  pass(SIZE * 0.35, 0.55);
  pass(SIZE * 0.08, 1);
  ctx.restore();
}
