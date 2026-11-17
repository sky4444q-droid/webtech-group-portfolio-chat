import { describe, expect, it } from "vitest";
import { wayfindingLabel } from "./wayfinding";
import { DISTRICTS } from "../../config/districts";

describe("wayfindingLabel", () => {
  it("uses the place name in the chosen language with an arrow", () => {
    const th = wayfindingLabel("projects", "th");
    const en = wayfindingLabel("projects", "en");
    expect(th).toContain(DISTRICTS.projects.name.th);
    expect(en).toContain(DISTRICTS.projects.name.en);
    expect(th).toContain("→");
    expect(en).toContain("→");
  });
});
