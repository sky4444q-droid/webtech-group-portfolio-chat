import { describe, expect, it } from "vitest";
import { th } from "./th";
import { en } from "./en";
import { pick, t } from "./index";

describe("i18n", () => {
  it("has every Thai key in English, and none are empty", () => {
    for (const key of Object.keys(th) as (keyof typeof th)[]) {
      expect(en[key], `missing en.${key}`).toBeTruthy();
      expect(th[key], `empty th.${key}`).toBeTruthy();
    }
  });

  it("picks the requested language from a Localized value", () => {
    expect(pick("en", { th: "ก", en: "A" })).toBe("A");
    expect(pick("th", { th: "ก", en: "A" })).toBe("ก");
  });

  it("translates a key per language", () => {
    expect(t("th", "pending")).toBe("รอข้อมูล");
    expect(t("en", "pending")).toBe("Awaiting data");
  });
});
