import { describe, expect, it } from "vitest";
import { curtainWallTexture, windowGrid } from "./windowMaterial";

describe("windowGrid", () => {
  it("ใช้ช่อง 1.3 ม. และชั้น 3.3 ม.", () => {
    expect(windowGrid(13, 33)).toEqual({ cols: 10, rows: 10 });
  });
  it("อย่างน้อย 1 ช่อง", () => {
    expect(windowGrid(0.5, 1)).toEqual({ cols: 1, rows: 1 });
  });
});

describe("curtainWallTexture", () => {
  it("แคชไว้ใช้ซ้ำ", () => {
    expect(curtainWallTexture()).toBe(curtainWallTexture());
  });
});

import * as THREE from "three";
import { patchWindowUv, windowUvScale } from "./windowMaterial";
import { WINDOW_TOGGLE_GLSL } from "./windowPlan";

function compile(mat: THREE.MeshStandardMaterial) {
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} as Record<string, unknown> };
  mat.onBeforeCompile(shader as never, undefined as never);
  return shader;
}

describe("patchWindowUv", () => {
  it("แทนที่ chunk ใน shader มาตรฐานได้จริง", () => {
    const mat = new THREE.MeshStandardMaterial();
    patchWindowUv(mat);
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
    mat.onBeforeCompile(shader as never, undefined as never);
    expect(shader.vertexShader).toContain("vWinUv = uv");
    expect(shader.fragmentShader).toContain("texture2D(emissiveMap, vWinUv)");
    expect(shader.fragmentShader).not.toContain("#include <emissivemap_fragment>");
    expect(shader.fragmentShader).toContain("winToggle(");
    expect(shader.vertexShader).toContain("instanceMatrix[3]");
    expect(mat.userData.winTime).toEqual({ value: 0 });
  });
  it("ผูก uniform เวลาและใช้สูตร GLSL ตัวเดียวกับ JS", () => {
    const mat = new THREE.MeshStandardMaterial();
    patchWindowUv(mat);
    const shader = compile(mat);
    expect(shader.uniforms.uWinTime).toBe(mat.userData.winTime);
    expect(shader.fragmentShader).toContain(WINDOW_TOGGLE_GLSL);
    expect(shader.fragmentShader).toMatch(/winToggle\(winH, uWinTime\)/);
  });
  it("animate:false ไม่สลับไฟ", () => {
    const mat = new THREE.MeshStandardMaterial();
    patchWindowUv(mat, { animate: false });
    const shader = compile(mat);
    expect(shader.fragmentShader).not.toContain("winToggle(winH");
    expect(mat.customProgramCacheKey()).not.toBe((() => { const m = new THREE.MeshStandardMaterial(); patchWindowUv(m); return m.customProgramCacheKey(); })());
  });
  it("ตึก 13×33 ม. = 10 ช่อง × 10 ชั้น = 1.25 × 0.625 แผ่น", () => {
    const [u, v] = windowUvScale(13, 33);
    expect(u * 8).toBeCloseTo(10, 5);
    expect(v * 16).toBeCloseTo(10, 5);
  });
});
