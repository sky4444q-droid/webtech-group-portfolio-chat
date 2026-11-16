// สร้าง texture จาก <canvas> — ใช้ฟอนต์ของระบบ จึงแสดงภาษาญี่ปุ่น/อังกฤษได้โดยไม่ต้องโหลดฟอนต์ 3D

import * as THREE from "three";

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
  const font = opts.font ?? `700 ${size}px "Orbitron", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif`;
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
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 64, 128);
  const palette = ["#ff4f9a", "#5ad8ff", "#b98cff", "#ffd27a", "#8fffc0"];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 2; y < 128; y += 6) {
    for (let x = 2; x < 64; x += 5) {
      if (rand() > 0.72) {
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        ctx.globalAlpha = 0.35 + rand() * 0.65;
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }
  windowsTexture = new THREE.CanvasTexture(canvas);
  windowsTexture.colorSpace = THREE.SRGBColorSpace;
  windowsTexture.wrapS = windowsTexture.wrapT = THREE.RepeatWrapping;
  windowsTexture.magFilter = THREE.NearestFilter;
  return windowsTexture;
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
