import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fxEnabled } from "./fxEnabled";

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
    expect(fxEnabled("high")).toEqual({ cones: true, flare: true, traffic: true, rain: true, reflector: true, bloom: true, fogLayers: 3 });
  });

  it("turns every heavy effect off in low quality", () => {
    expect(fxEnabled("low")).toEqual({ cones: false, flare: false, traffic: false, rain: false, reflector: false, bloom: false, fogLayers: 1 });
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
