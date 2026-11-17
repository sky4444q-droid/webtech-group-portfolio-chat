import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fxEnabled } from "./fxEnabled";
import { COLORS } from "../../config/theme";
import { BRAND } from "../../config/brand";
import { cityLayout } from "../street/kitLayout";
import { hazePatches, spillsFor } from "../street/lightSpill";

const ROOT = join(import.meta.dirname, "../../..");
const ASSETS = join(ROOT, "public/assets");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("fxEnabled", () => {
  it("turns everything on in high quality", () => {
    expect(fxEnabled("high")).toEqual({
      traffic: true, rain: true, reflector: true, bloom: true,
      grading: true, dof: true, steam: true, signFlicker: true, screensAnimated: true, fogLayers: 1, fish: true, dust: true, skylineDetail: true, giantScreens: true,
    });
    expect(fxEnabled("high")).not.toHaveProperty("cones");
    expect(fxEnabled("high")).not.toHaveProperty("flare");
  });

  it("turns every heavy effect off in low quality", () => {
    expect(fxEnabled("low")).toEqual({
      traffic: false, rain: false, reflector: false, bloom: false,
      grading: false, dof: false, steam: false, signFlicker: false, screensAnimated: false, fogLayers: 1, fish: false, dust: false, skylineDetail: false, giantScreens: false,
    });
  });
});

describe("palette", () => {
  it("exposes the brand palette", () => {
    expect(BRAND).toEqual({ purple: "#8B5CF6", magenta: "#D946EF", silver: "#C0C4D0" });
  });

  it("uses a near-black background with no purple cast", () => {
    const n = parseInt(COLORS.bg.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    for (const c of [r, g, b]) expect(c).toBeLessThanOrEqual(0x0a);
    expect(b - r).toBeLessThanOrEqual(4);
  });

  it("has a saturated red for the HUD", () => {
    expect((COLORS as Record<string, string>).red).toBe("#ff1f3d");
  });
});

describe("CC0 assets", () => {
  const files = walk(ASSETS);
  const credits = readFileSync(join(ROOT, "CREDITS.md"), "utf-8");

  it("lists every file in CREDITS.md", () => {
    for (const f of files) expect(credits).toContain(f.split(/[\\/]/).pop()!);
  });

  it("marks every source as CC0", () => {
    expect(credits).toMatch(/CC0/);
    expect(credits).not.toMatch(/CC-BY|CC BY/);
  });

  it("stays within the size budget", () => {
    const total = files.reduce((n, f) => n + statSync(f).size, 0);
    expect(total).toBeLessThanOrEqual(6.5 * 1024 * 1024);
  });

  it("keeps public/assets at or under 8 MB", () => {
    const total = files.reduce((n, f) => n + statSync(f).size, 0);
    expect(total).toBeLessThanOrEqual(8 * 1024 * 1024);
  });
});

describe("hazePatches", () => {
  it("makes one haze patch per floor spill and none for wall spills", () => {
    const items = Object.values(cityLayout()).flat();
    const spills = spillsFor(items);
    const patches = hazePatches(spills);
    expect(patches).toHaveLength(spills.filter((s) => s.kind === "floor").length);
    for (const p of patches) expect(p.position[1]).toBeCloseTo(0.25);
  });
});
