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

describe("patchWindowUv", () => {
  it("แทนที่ chunk ใน shader มาตรฐานได้จริง", () => {
    const mat = new THREE.MeshStandardMaterial();
    patchWindowUv(mat);
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
    mat.onBeforeCompile(shader as never, undefined as never);
    expect(shader.vertexShader).toContain("vWinUv = uv");
    expect(shader.fragmentShader).toContain("texture2D(emissiveMap, vWinUv)");
    expect(shader.fragmentShader).not.toContain("#include <emissivemap_fragment>");
  });
  it("ตึก 13×33 ม. = 10 ช่อง × 10 ชั้น = 1.25 × 0.625 แผ่น", () => {
    const [u, v] = windowUvScale(13, 33);
    expect(u * 8).toBeCloseTo(10, 5);
    expect(v * 16).toBeCloseTo(10, 5);
  });
});
