// หน้าต่างขนาดคงที่: ช่องกว้าง 1.3 ม. ชั้นสูง 3.3 ม. ไม่ว่าตึกจะแคบหรือกว้าง
// แพตช์ shader ของ meshStandardMaterial ให้คำนวณ UV ของ emissiveMap จากขนาดจริงของแต่ละชิ้น (instanceMatrix)

import * as THREE from "three";
import { curtainWallTexture } from "../textures";
import { WINDOW_TOGGLE_GLSL } from "./windowPlan";

export { curtainWallTexture };

export const BAY_M = 1.3;
export const FLOOR_M = 3.3;
/** จำนวนช่อง/ชั้นในหนึ่งแผ่น texture */
const TILE_COLS = 8;
const TILE_ROWS = 16;

/** จำนวนช่องหน้าต่าง (แนวนอน) และชั้น (แนวตั้ง) ของผนังขนาดที่ให้ — อย่างน้อย 1 */
export function windowGrid(widthM: number, heightM: number): { cols: number; rows: number } {
  return { cols: Math.max(1, Math.round(widthM / BAY_M)), rows: Math.max(1, Math.round(heightM / FLOOR_M)) };
}

/** ตัวคูณ UV (จำนวนแผ่น texture) ของผนังขนาดจริง — ตรงกับที่ shader คำนวณ */
export function windowUvScale(faceW: number, faceH: number): [number, number] {
  return [faceW / (BAY_M * TILE_COLS), faceH / (FLOOR_M * TILE_ROWS)];
}

const VERT_HEAD = /* glsl */ `
varying vec2 vWinUv;
varying float vWinMask;
varying float vWinY;
varying float vWinBld;
`;

// UV ของกล่องเป็น 0..1 ต่อหน้า → คูณด้วยขนาดจริงของแกนที่หน้านั้นวางอยู่ (เลือกจาก normal ของวัตถุ)
const VERT_BODY = /* glsl */ `
#include <begin_vertex>
{
  #ifdef USE_INSTANCING
    vec3 winS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vec4 winW = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 winT = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
  #else
    vec3 winS = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
    vec4 winW = modelMatrix * vec4(position, 1.0);
    vec3 winT = modelMatrix[3].xyz;
  #endif
  // hash ของตำแหน่งตึก → เลื่อน UV ทีละช่องเต็ม ตึกข้างกันจึงไม่ซ้ำลาย
  vWinBld = fract(sin(dot(floor(winT.xz * 4.0), vec2(12.9898, 78.233))) * 43758.5453);
  vec3 an = abs(normal);
  // หน้า ±x: กว้างตาม z · หน้า ±z: กว้างตาม x · สูงตาม y
  float faceW = an.x > 0.5 ? winS.z : winS.x;
  vWinUv = uv * vec2(faceW / ${(BAY_M * TILE_COLS).toFixed(2)}, winS.y / ${(FLOOR_M * TILE_ROWS).toFixed(2)})
    + floor(vWinBld * vec2(${TILE_COLS}.0 * 37.0, ${TILE_ROWS}.0 * 53.0)) / vec2(${TILE_COLS}.0, ${TILE_ROWS}.0);
  // หลังคา/พื้นไม่มีหน้าต่าง
  vWinMask = an.y > 0.5 ? 0.0 : 1.0;
  vWinY = winW.y;
}
`;

const FRAG_HEAD = /* glsl */ `
varying vec2 vWinUv;
varying float vWinMask;
varying float vWinY;
varying float vWinBld;
uniform float uWinTime;
${WINDOW_TOGGLE_GLSL}
`;

const FRAG_COLOR = /* glsl */ `
#include <color_fragment>
// ตึกเข้มขึ้นตามความสูง
diffuseColor.rgb *= mix(1.0, 0.45, smoothstep(4.0, 40.0, vWinY));
`;

function fragEmissive(animate: boolean): string {
  // ช่องที่ winToggle = 1 สลับสถานะ: สว่าง → มืด (×0.1) · มืด → ไฟอุ่นระดับ 0.6 (เฉพาะส่วนกระจก ไม่ทับเสา/พื้นชั้น)
  const toggle = animate
    ? /* glsl */ `
  vec2 winCell = floor(vWinUv * vec2(${TILE_COLS}.0, ${TILE_ROWS}.0));
  // ปัด hash ตึกให้คงที่ทั้งตึก (กัน noise จากการ interpolate varying ถูกขยายใน sin)
  float winB = floor(vWinBld * 1024.0 + 0.5);
  float winH = fract(sin(dot(winCell, vec2(12.9898, 78.233)) + winB * 0.0947) * 43758.5453);
  if (winToggle(winH, uWinTime) > 0.5) {
    vec2 winF = fract(vWinUv * vec2(${TILE_COLS}.0, ${TILE_ROWS}.0));
    float winGlass = step(0.0625, winF.x) * step(winF.x, 0.9375) * step(0.19, winF.y) * step(winF.y, 0.97);
    // ตัดสินว่าช่องเปิดไฟอยู่หรือไม่จากจุดเดียวใกล้เพดาน (ทั้งช่องได้ผลเดียวกัน ไม่สว่างครึ่งช่อง)
    vec3 winRef = texture2D(emissiveMap, (winCell + vec2(0.5, 0.85)) / vec2(${TILE_COLS}.0, ${TILE_ROWS}.0)).rgb;
    float winLit = step(0.12, max(winRef.r, max(winRef.g, winRef.b)));
    winTex = mix(mix(vec3(1.0, 0.85, 0.66) * 0.6, winTex, 1.0 - winGlass), winTex * 0.1, winLit);
  }`
    : "";
  return /* glsl */ `
#ifdef USE_EMISSIVEMAP
  vec3 winTex = texture2D(emissiveMap, vWinUv).rgb;${toggle}
  totalEmissiveRadiance *= winTex * vWinMask;
#endif
`;
}

/** แพตช์ material ให้หน้าต่าง (emissiveMap) มีขนาดจริงคงที่ทุกหน้าของกล่อง ตึกเข้มขึ้นตามความสูง
 *  และ (animate) ไฟบางช่องเปิด-ปิดช้า ๆ ตาม mat.userData.winTime ที่ผู้เรียกเลื่อนเวลาเอง */
export function patchWindowUv(mat: THREE.MeshStandardMaterial, opts?: { animate?: boolean }): void {
  if (mat.userData.windowUv) return; // แพตช์ซ้ำไม่ได้ (กัน compile ใหม่ทุก render)
  const animate = opts?.animate ?? true;
  mat.userData.windowUv = true;
  mat.userData.winTime = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWinTime = mat.userData.winTime;
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace("#include <begin_vertex>", VERT_BODY);
    shader.fragmentShader =
      FRAG_HEAD +
      shader.fragmentShader
        .replace("#include <color_fragment>", FRAG_COLOR)
        .replace("#include <emissivemap_fragment>", fragEmissive(animate));
  };
  mat.customProgramCacheKey = () => (animate ? "nexora-window-uv-anim" : "nexora-window-uv-static");
  mat.needsUpdate = true;
}
