import { describe, expect, it } from "vitest";
import { districtFromHash, hashFor } from "./hash";

describe("hash routing", () => {
  it("reads a known district", () => {
    expect(districtFromHash("#/projects")).toBe("projects");
    expect(districtFromHash("#/sanctuary")).toBe("sanctuary");
  });

  it("ignores unknown or empty hashes", () => {
    expect(districtFromHash("#/xyz")).toBeNull();
    expect(districtFromHash("")).toBeNull();
    expect(districtFromHash("#")).toBeNull();
  });

  it("builds a hash for a district", () => {
    expect(hashFor("team")).toBe("#/team");
  });
});
