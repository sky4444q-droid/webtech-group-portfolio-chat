import { afterEach, describe, expect, it, vi } from "vitest";
import { whenFontsReady } from "./fonts";

describe("whenFontsReady", () => {
  afterEach(() => vi.useRealTimers());
  it("resolves ready when fonts load", async () => {
    await expect(whenFontsReady(4000, { ready: Promise.resolve() })).resolves.toBe("ready");
  });
  it("times out when fonts never load", async () => {
    vi.useFakeTimers();
    const p = whenFontsReady(4000, { ready: new Promise(() => {}) });
    vi.advanceTimersByTime(4000);
    await expect(p).resolves.toBe("timeout");
  });
  it("reports unsupported without document.fonts", async () => {
    await expect(whenFontsReady(4000, undefined)).resolves.toBe("unsupported");
  });
});
