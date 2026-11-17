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
