// ตรวจ styles.css: สีแบรนด์, ไม่มีแดงใน HUD, กฎ intro อยู่ที่เดียว
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BRAND } from "../config/brand";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

/** ตัด @media ทิ้ง (ทั้งบล็อก) แล้วคืนรายการ [selector, body] ระดับบนสุด */
function topRules(src: string): Array<[string, string]> {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Array<[string, string]> = [];
  let i = 0;
  while (i < noComments.length) {
    const open = noComments.indexOf("{", i);
    if (open < 0) break;
    const sel = noComments.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < noComments.length && depth > 0) {
      if (noComments[j] === "{") depth++;
      else if (noComments[j] === "}") depth--;
      j++;
    }
    if (!sel.startsWith("@")) out.push([sel, noComments.slice(open + 1, j - 1)]);
    i = j;
  }
  return out;
}

const rules = topRules(css);
const ruleFor = (s: string) => rules.filter(([sel]) => sel.split(",").map((x) => x.trim()).includes(s));

describe("brand styles", () => {
  it("defines brand variables equal to BRAND", () => {
    for (const [k, hex] of Object.entries(BRAND)) {
      expect(css).toMatch(new RegExp(`--brand-${k}:[ \\t]*${hex};`, "i"));
    }
  });

  it("no longer uses --red anywhere in the UI", () => {
    expect(css).not.toMatch(/var\(--red\)/);
  });

  it("defines .intro-title and .intro-logo once and without !important", () => {
    expect(ruleFor(".intro-title")).toHaveLength(1);
    expect(ruleFor(".intro-logo")).toHaveLength(1);
    for (const [sel, body] of rules) {
      if (sel.startsWith(".intro")) expect(body, sel).not.toContain("!important");
    }
  });

  it("keeps the kicker readable", () => {
    const [[, body]] = ruleFor(".intro-kicker");
    const ls = parseFloat(/letter-spacing:\s*([\d.]+)em/.exec(body)![1]);
    const fs = parseFloat(/font-size:\s*([\d.]+)px/.exec(body)![1]);
    expect(ls).toBeLessThanOrEqual(0.15);
    expect(fs).toBeGreaterThanOrEqual(13);
    expect(body).toMatch(/font-family:\s*var\(--font-body\)/);
  });

  it("gives the wordmark the brand gradient", () => {
    const [[, body]] = ruleFor(".brand-wordmark");
    expect(body).toMatch(/background-clip:\s*text/);
    for (const v of ["--brand-purple", "--brand-magenta", "--brand-silver"]) expect(body).toContain(`var(${v})`);
  });
});
