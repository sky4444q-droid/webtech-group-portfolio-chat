// โปรแกรมของจอยักษ์โค้งรอบมุมตึก: shader เดียวสลับลายด้วย uProgram (core / koi / type / water)
// ความสว่างสูงสุด 0.85 — ต่ำกว่าจอสำคัญ WaterScreen (col*1.25) จอสำคัญจึงเด่นที่สุดเสมอ

import * as THREE from "three";
import { BRAND } from "../../config/brand";
import { SIGN_WORDS } from "../../config/signWords";
import { WATER_GLSL } from "./WaterScreen";

export const GIANT_PROGRAMS = ["core", "koi", "type", "water"] as const;
export type GiantProgram = (typeof GIANT_PROGRAMS)[number];

/** โปรแกรมตาม variant */
export const giantProgramOf = (variant: number): number => ((variant % GIANT_PROGRAMS.length) + GIANT_PROGRAMS.length) % GIANT_PROGRAMS.length;

/** ความสว่างสูงสุดของจอยักษ์ */
export const GIANT_GAIN = 0.85;

const vec3 = (hex: string) => {
  const c = new THREE.Color(hex);
  return `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`;
};

export const giantVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const giantFragment = /* glsl */ `
uniform float uProgram;
uniform float uTime;
uniform float uAspect;
uniform sampler2D uEmblem;
uniform sampler2D uStrip;
varying vec2 vUv;
${WATER_GLSL}
const vec3 PURPLE = ${vec3(BRAND.purple)};
const vec3 MAGENTA = ${vec3(BRAND.magenta)};

// แกนพลังงาน: โลโก้กลางจอ + แสงเรืองม่วง-ชมพูเต้นเป็นจังหวะ
vec3 core(vec2 p, float t) {
  float r = length(p);
  float pulse = 0.5 + 0.5 * sin(t * 2.0);
  vec3 glow = mix(PURPLE, MAGENTA, 0.5 + 0.5 * sin(t * 0.7 + r * 6.0)) * (0.25 + 0.5 * pulse) * exp(-r * 3.0);
  float ring = smoothstep(0.03, 0.0, abs(r - 0.25 - 0.08 * pulse)) * 0.6;
  vec2 e = p / (uAspect * 0.9) + 0.5;
  vec4 em = texture2D(uEmblem, clamp(e, 0.0, 1.0));
  float inside = step(0.0, e.x) * step(e.x, 1.0) * step(0.0, e.y) * step(e.y, 1.0);
  return vec3(0.03, 0.0, 0.06) + glow + MAGENTA * ring + em.rgb * em.a * inside;
}

// ปลาคาร์ปสามตัว (วงรีบิดด้วย sin) ว่ายข้ามพื้นน้ำสีน้ำเงินเข้มที่มีระลอกคลื่น
vec3 koi(vec2 p, float t) {
  vec3 col = vec3(0.0, 0.03, 0.12) + vec3(0.0, 0.05, 0.15) * (0.5 + 0.5 * sin(length(p * vec2(1.0, 0.6)) * 40.0 - t * 2.0));
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float dir = mod(fi, 2.0) * 2.0 - 1.0;
    float x = (fract(t * (0.04 + 0.015 * fi) + fi * 0.37) - 0.5) * (uAspect + 0.6) * dir;
    vec2 q = p - vec2(x, (fi - 1.0) * 0.28);
    q.x *= dir;
    q.y += sin(q.x * 18.0 - t * 5.0) * 0.02;
    float body = length(q / vec2(0.13, 0.04));
    float tail = length((q + vec2(0.15, 0.0)) / vec2(0.04, 0.045 + 0.02 * sin(t * 6.0 + fi)));
    float fish = smoothstep(1.0, 0.7, min(body, tail));
    vec3 fc = mix(vec3(1.0, 0.45, 0.15), vec3(1.0, 0.95, 0.9), step(0.5, fract(fi * 0.5 + 0.25)));
    col = mix(col, fc, fish);
  }
  return col;
}

// ตัวอักษร NEXORA + คำจากสี่แยก เลื่อนขึ้นในแนวตั้ง (แถบ canvas ที่วาดไว้ครั้งเดียว)
vec3 typeScroll(vec2 uv, float t) {
  vec4 s = texture2D(uStrip, vec2(uv.x, uv.y * 0.5 - t * 0.05));
  return vec3(0.02, 0.0, 0.05) + s.rgb * s.a;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec3 col;
  if (uProgram < 0.5) col = core(p, uTime);
  else if (uProgram < 1.5) col = koi(p, uTime);
  else if (uProgram < 2.5) col = typeScroll(vUv, uTime);
  else {
    float c = water(vUv * vec2(4.0 * uAspect + 1.0, 5.6), uTime);
    col = vec3(0.0, 0.07, 0.13) + vec3(0.4, 1.0, 1.0) * c;
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * ${GIANT_GAIN.toFixed(2)}, 1.0);
}`;

// แคชนี้เป็น singleton ตลอดอายุแอป ตั้งใจไม่ dispose
let strip: THREE.CanvasTexture | null = null;
/** แถบตัวอักษรแนวตั้งของโปรแกรม type (สร้างครั้งเดียวแล้วแคช) */
export function typeStrip(): THREE.CanvasTexture {
  if (strip) return strip;
  const W = 256;
  const H = 1024;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "middle";
  const words = SIGN_WORDS.nexus.filter((w) => !w.vertical).map((w) => w.text);
  let y = 70;
  let k = 0;
  while (y < H - 40) {
    if (k % 4 === 0) {
      g.font = "900 64px 'Arial Black', sans-serif";
      g.fillStyle = BRAND.magenta;
      g.fillText("NEXORA", W / 2, y, W - 16);
      y += 120;
    } else {
      g.font = "700 36px sans-serif";
      g.fillStyle = k % 2 ? BRAND.silver : BRAND.purple;
      g.fillText(words[(k * 5) % words.length], W / 2, y, W - 16);
      y += 80;
    }
    k++;
  }
  strip = new THREE.CanvasTexture(cv);
  strip.colorSpace = THREE.SRGBColorSpace;
  strip.wrapS = THREE.ClampToEdgeWrapping;
  strip.wrapT = THREE.RepeatWrapping;
  return strip;
}
