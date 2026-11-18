import { describe, expect, it } from "vitest";
import { LIGHT_BUDGET, planLights, type LightCandidate } from "./lightBudget";

const c = (id: number, type: LightCandidate["type"], distance: number): LightCandidate => ({ id, type, distance });

describe("planLights", () => {
  it("keeps the nearest lights of each type up to the budget", () => {
    const plan = planLights([c(1, "PointLight", 30), c(2, "PointLight", 2), c(3, "PointLight", 9), c(4, "PointLight", 5), c(5, "PointLight", 50), c(6, "SpotLight", 4)], LIGHT_BUDGET);
    expect([...plan.keep].sort()).toEqual([1, 2, 3, 4, 6]);
    expect(plan.dummies).toEqual({ PointLight: 0, SpotLight: 0 });
  });

  it("fills missing slots with dummies so every type always totals its budget", () => {
    const plan = planLights([c(1, "PointLight", 3)], LIGHT_BUDGET);
    expect([...plan.keep]).toEqual([1]);
    expect(plan.dummies).toEqual({ PointLight: LIGHT_BUDGET.PointLight - 1, SpotLight: LIGHT_BUDGET.SpotLight });
  });

  it("gives the same totals for any mix of lights (shader variants never change)", () => {
    const mixes = [[], [c(1, "PointLight", 1)], Array.from({ length: 9 }, (_, i) => c(i, "PointLight", i)), [c(1, "SpotLight", 1), c(2, "SpotLight", 2)]];
    for (const m of mixes) {
      const plan = planLights(m, LIGHT_BUDGET);
      for (const type of ["PointLight", "SpotLight"] as const) {
        const kept = m.filter((x) => x.type === type && plan.keep.has(x.id)).length;
        expect(kept + plan.dummies[type]).toBe(LIGHT_BUDGET[type]);
      }
    }
  });
});
