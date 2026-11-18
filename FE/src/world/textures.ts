// สร้าง texture จาก <canvas> — ใช้ฟอนต์ของระบบ จึงแสดงภาษาญี่ปุ่น/อังกฤษได้โดยไม่ต้องโหลดฟอนต์ 3D

import * as THREE from "three";
import { BRAND } from "../config/brand";
import { mulberry32 } from "../lib/rng";
import { planWindows } from "./street/windowPlan";

const cache = new Map<string, THREE.CanvasTexture>();

export interface SignOptions {
  /** ตัวอักษรเรียงแนวตั้ง (เหมือนป้ายญี่ปุ่น) */
  vertical?: boolean;
  /** ความสูงตัวอักษรเป็น pixel บน canvas */
  size?: number;
  font?: string;
}

/** ป้ายนีออน: ตัวอักษรเรืองแสงบนพื้นโปร่งใส คืน texture และสัดส่วนกว้าง/สูง */
export function signTexture(text: string, color: string, opts: SignOptions = {}): { texture: THREE.CanvasTexture; aspect: number } {
  const size = opts.size ?? 96;
  const font = opts.font ?? `700 ${size}px "Orbitron", "Noto Sans JP", "Noto Sans SC", "Noto Sans Thai", "Yu Gothic", "Meiryo", sans-serif`;
  const key = `${text}|${color}|${opts.vertical ? "v" : "h"}|${size}|${font}`;
  const hit = cache.get(key);
  if (hit) return { texture: hit, aspect: hit.image.width / hit.image.height };

  const pad = size * 0.6;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const chars = [...text];

  let width: number;
  let height: number;
  if (opts.vertical) {
    width = size + pad * 2;
    height = chars.length * size * 1.1 + pad * 2;
  } else {
    width = Math.ceil(measure.measureText(text).width) + pad * 2;
    height = size * 1.3 + pad * 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const draw = () => {
    if (opts.vertical) {
      chars.forEach((c, i) => ctx.fillText(c, width / 2, pad + size * 0.55 + i * size * 1.1));
    } else {
      ctx.fillText(text, width / 2, height / 2);
    }
  };

  // เรืองแสงด้านนอก แล้ววาดแกนสีอ่อนทับ
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.45;
  ctx.fillStyle = color;
  draw();
  draw();
  ctx.shadowBlur = size * 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.85;
  draw();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return { texture, aspect: width / height };
}

let windowsTexture: THREE.CanvasTexture | null = null;

/** หน้าต่างตึก: ช่องสี่เหลี่ยมเล็ก ๆ ที่บางช่องเปิดไฟ */
export function buildingWindowsTexture(): THREE.CanvasTexture {
  if (windowsTexture) return windowsTexture;
  const canvas = document.createElement("canvas");
  // ถี่และเล็กพอที่ตึกสูง 40 หน่วยยังเห็นเป็นหน้าต่างเล็ก ๆ (texture ถูกยืดเต็มหน้าตึก) · ไฟส่วนใหญ่ขาว/ฟ้าเย็นและหรี่ ตึกจึงดูเกือบดำแบบรูปตัวอย่าง
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 128, 512);
  const palette = ["#cfe6ff", "#cfe6ff", "#9fd8ff", "#ffe2b0", "#ff7fb0"];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 2; y < 512; y += 5) {
    for (let x = 2; x < 128; x += 4) {
      if (rand() > 0.86) {
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        ctx.globalAlpha = 0.2 + rand() * 0.45;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  windowsTexture = new THREE.CanvasTexture(canvas);
  windowsTexture.colorSpace = THREE.SRGBColorSpace;
  windowsTexture.wrapS = windowsTexture.wrapT = THREE.RepeatWrapping;
  windowsTexture.magFilter = THREE.NearestFilter;
  return windowsTexture;
}

let curtainTexture: THREE.CanvasTexture | null = null;

/** ผนังกระจกตึก: แผ่นต่อ 8×16 ช่อง (กว้าง 1.3 ม. × สูง 3.3 ม. ต่อช่อง) มีแถบพื้นชั้นและเสาค้ำ · เปิดไฟราว 15% เป็นกลุ่มเล็ก */
export function curtainWallTexture(): THREE.CanvasTexture {
  if (curtainTexture) return curtainTexture;
  const W = 256, H = 1024, COLS = 8, ROWS = 16;
  const bw = W / COLS, bh = H / ROWS;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // พื้นดำ = แถบพื้นชั้น + เสาค้ำ (ไม่เรืองแสง)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    const plan = planWindows(11);
    const ledRand = mulberry32(77);
    for (let r = 0; r < ROWS; r++) {
      // แถบไฟ LED บาง ๆ ใต้พื้นชั้นบางชั้น
      if (ledRand() < 0.18) {
        ctx.fillStyle = ledRand() < 0.5 ? BRAND.purple : "#7fd6ff";
        ctx.globalAlpha = 0.55;
        ctx.fillRect(0, r * bh + bh - 6, W, 2);
        ctx.globalAlpha = 1;
      }
      for (let c = 0; c < COLS; c++) {
        const bay = plan[r][c];
        const x = c * bw + 2, y = r * bh + 2, w = bw - 4, h = bh - 12; // เสาค้ำ 4px · แถบพื้นชั้น 10px ด้านล่าง
        if (!bay.lit) {
          // กระจกดับ: น้ำเงินเข้ม มีแสงเมืองสะท้อนจาง ๆ ไล่จากบนลงล่าง
          const g = ctx.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, "#141c36");
          g.addColorStop(0.5, "#0a1020");
          g.addColorStop(1, "#060a16");
          ctx.fillStyle = g;
          ctx.fillRect(x, y, w, h);
          continue;
        }
        // ห้องที่เปิดไฟ: สีอำพันอบอุ่น หรือขาวออฟฟิศ
        const col = bay.tone === "warm" ? "#ffb25e" : "#dbe8ff";
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        // พื้นห้องมืดก่อน แล้วไล่แสงจากเพดาน ครึ่งล่างมืดกว่า
        ctx.fillStyle = "#0b0a0c";
        ctx.fillRect(x, y, w, h);
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, col);
        g.addColorStop(0.5, col);
        g.addColorStop(1, "#120d0a");
        ctx.globalAlpha = bay.level * 0.8;
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        // โคมไฟตั้งโต๊ะ: จุดสว่างเป็นบางช่อง (ใช้ level กำหนดแบบคงที่ ไม่เพิ่มการสุ่ม)
        if (bay.level > 0.5) {
          const hx = x + w * (0.3 + 0.4 * ((r * 7 + c * 3) % 5) / 4), hy = y + h * 0.68;
          const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, w * 0.5);
          rg.addColorStop(0, col);
          rg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalAlpha = Math.min(1, bay.level + 0.2);
          ctx.fillStyle = rg;
          ctx.fillRect(x, y, w, h);
        }
        // ม่านที่ขอบซ้าย-ขวา ทำให้แสงไม่สม่ำเสมอ
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#000000";
        ctx.fillRect(x, y, w * 0.14, h);
        ctx.fillRect(x + w * 0.86, y, w * 0.14, h);
        // ม่านปรับแสง: แถบแนวนอนเข้ม
        if (bay.blinds) {
          ctx.globalAlpha = 0.45;
          for (let sy = y + 3; sy < y + h; sy += 5) ctx.fillRect(x, sy, w, 2);
        }
        ctx.restore();
        // กรอบหน้าต่าง
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#05060a";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  curtainTexture = new THREE.CanvasTexture(canvas);
  curtainTexture.colorSpace = THREE.SRGBColorSpace;
  curtainTexture.wrapS = curtainTexture.wrapT = THREE.RepeatWrapping;
  curtainTexture.anisotropy = 4;
  return curtainTexture;
}

/** จอโฮโลแกรม: กรอบ เส้นตาราง และหัวข้อ */
export function screenTexture(title: string, color: string): THREE.CanvasTexture {
  const key = `screen|${title}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = 512;
  const h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(10, 6, 30, 0.55)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 6;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.font = `900 64px "Orbitron", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(title, w / 2, h / 2 - 10);
  ctx.shadowBlur = 0;
  ctx.font = `500 22px "Orbitron", sans-serif`;
  ctx.globalAlpha = 0.7;
  ctx.fillText("▸ CLICK TO ACCESS", w / 2, h / 2 + 56);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}
