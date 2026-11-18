import { describe, expect, it } from "vitest";
import { parseArchitecture } from "./architecture";

describe("parseArchitecture", () => {
  it("splits on → and ->", () => {
    expect(parseArchitecture("A → B -> C")).toEqual(["A", "B", "C"]);
  });

  it("keeps a single step when there are no arrows", () => {
    expect(parseArchitecture("ข้อความเดียว")).toEqual(["ข้อความเดียว"]);
  });

  it("returns nothing for empty text and drops empty steps", () => {
    expect(parseArchitecture("")).toEqual([]);
    expect(parseArchitecture("A →  → B")).toEqual(["A", "B"]);
  });
});
