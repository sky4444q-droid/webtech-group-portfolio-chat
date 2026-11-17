// หน้าต่างขนาดคงที่: ช่องกว้าง 1.3 ม. ชั้นสูง 3.3 ม. ไม่ว่าตึกจะแคบหรือกว้าง
// แพตช์ shader ของ meshStandardMaterial ให้คำนวณ UV ของ emissiveMap จากขนาดจริงของแต่ละชิ้น (instanceMatrix)

import * as THREE from "three";
import { curtainWallTexture } from "../textures";

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

const VERT_HEAD = /* glsl */ `
varying vec2 vWinUv;
varying float vWinMask;
varying float vWinY;
`;

// UV ของกล่องเป็น 0..1 ต่อหน้า → คูณด้วยขนาดจริงของแกนที่หน้านั้นวางอยู่ (เลือกจาก normal ของวัตถุ)
const VERT_BODY = /* glsl */ `
#include <begin_vertex>
{
  #ifdef USE_INSTANCING
    vec3 winS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vec4 winW = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    vec3 winS = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
    vec4 winW = modelMatrix * vec4(position, 1.0);
  #endif
  vec3 an = abs(normal);
  // หน้า ±x: กว้างตาม z · หน้า ±z: กว้างตาม x · สูงตาม y
  float faceW = an.x > 0.5 ? winS.z : winS.x;
  vWinUv = uv * vec2(faceW / ${(BAY_M * TILE_COLS).toFixed(2)}, winS.y / ${(FLOOR_M * TILE_ROWS).toFixed(2)});
  // หลังคา/พื้นไม่มีหน้าต่าง
  vWinMask = an.y > 0.5 ? 0.0 : 1.0;
  vWinY = winW.y;
}
`;

const FRAG_HEAD = /* glsl */ `
varying vec2 vWinUv;
varying float vWinMask;
varying float vWinY;
`;

const FRAG_COLOR = /* glsl */ `
#include <color_fragment>
// ตึกเข้มขึ้นตามความสูง
diffuseColor.rgb *= mix(1.0, 0.45, smoothstep(4.0, 40.0, vWinY));
`;

const FRAG_EMISSIVE = /* glsl */ `
#ifdef USE_EMISSIVEMAP
  totalEmissiveRadiance *= texture2D(emissiveMap, vWinUv).rgb * vWinMask;
#endif
`;

/** แพตช์ material ให้หน้าต่าง (emissiveMap) มีขนาดจริงคงที่ทุกหน้าของกล่อง และตึกเข้มขึ้นตามความสูง */
export function patchWindowUv(mat: THREE.MeshStandardMaterial): void {
  if (mat.userData.windowUv) return; // แพตช์ซ้ำไม่ได้ (กัน compile ใหม่ทุก render)
  mat.userData.windowUv = true;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace("#include <begin_vertex>", VERT_BODY);
    shader.fragmentShader =
      FRAG_HEAD +
      shader.fragmentShader
        .replace("#include <color_fragment>", FRAG_COLOR)
        .replace("#include <emissivemap_fragment>", FRAG_EMISSIVE);
  };
  mat.customProgramCacheKey = () => "nexora-window-uv";
  mat.needsUpdate = true;
}
