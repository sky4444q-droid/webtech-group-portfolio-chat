import { describe, expect, it } from "vitest";
import { TEAM_HOLO_CARD_WORLD, VIEWPOINTS, teamHoloCamera, viewpointWorld } from "./viewpoints";
import { DISTRICT_ORDER, DISTRICTS } from "./districts";
import { th } from "../i18n/th";
import { NEXUS_HALF, distanceToPolyline, streetOf } from "../world/street/streets";

describe("VIEWPOINTS", () => {
  it("gives every district 2–4 viewpoints with unique ids", () => {
    for (const d of DISTRICT_ORDER) {
      const list = VIEWPOINTS[d];
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.length).toBeLessThanOrEqual(4);
      expect(new Set(list.map((v) => v.id)).size).toBe(list.length);
    }
  });

  it("uses eye-level views in Team HQ and the AI Sanctuary", () => {
    for (const d of ["team", "sanctuary"] as const) {
      for (const v of VIEWPOINTS[d]) {
        expect(v.mode).toBe("eye");
        expect(v.position[1]).toBeGreaterThan(1.2);
        expect(v.position[1]).toBeLessThan(2.6);
      }
    }
  });

  it("has a Thai label for every viewpoint", () => {
    for (const d of DISTRICT_ORDER) for (const v of VIEWPOINTS[d]) expect(th[v.label]).toBeTruthy();
  });

  it("keeps every viewpoint inside its street or the crossroads (team lobby is indoors)", () => {
    for (const d of DISTRICT_ORDER) {
      if (d === "team") continue;
      for (let i = 0; i < VIEWPOINTS[d].length; i++) {
        const p = viewpointWorld(d, i).position;
        const street = streetOf(d);
        if (!street) {
          expect(Math.abs(p[0])).toBeLessThanOrEqual(NEXUS_HALF);
          expect(Math.abs(p[2])).toBeLessThanOrEqual(NEXUS_HALF);
        } else {
          expect(distanceToPolyline([p[0], p[2]], street.points)).toBeLessThanOrEqual(street.halfWidth + 1);
        }
      }
    }
  });

  it("puts the nexus wide view on the footbridge", () => {
    const bridge = VIEWPOINTS.nexus.find((v) => v.id === "bridge")!;
    expect(bridge.mode).toBe("wide");
    expect(bridge.position[1]).toBeGreaterThanOrEqual(5);
    expect(bridge.position[1]).toBeLessThanOrEqual(8);
  });

  it("viewpointWorld offsets by the district position", () => {
    const w = viewpointWorld("team", 0);
    const local = VIEWPOINTS.team[0].position;
    const base = DISTRICTS.team.position;
    expect(w.position).toEqual([local[0] + base[0], local[1] + base[1], local[2] + base[2]]);
  });
});

describe("teamHoloCamera", () => {
  // การ์ดทีมกว้าง 480px ที่ distanceFactor 7 → กว้างในฉาก = 3360 / ความสูงจอ
  // สัดส่วนต่อความกว้างจอ = 3360 / (2·tan(fov/2)·ระยะ·ความกว้างจอ) — ต้องไม่ล้นจอที่กว้าง 736px ขึ้นไป
  const FOV = (55 * Math.PI) / 180;
  const fraction = (dist: number, width: number) => 3360 / (2 * Math.tan(FOV / 2) * dist * width);

  it("frames the team card from far enough that it fits on screen", () => {
    const pose = teamHoloCamera();
    const card = viewpointWorld("team", 0).position; // ensure world coords are used
    expect(card).toBeTruthy();
    const [cx, cy, cz] = TEAM_HOLO_CARD_WORLD;
    const dist = Math.hypot(pose.position[0] - cx, pose.position[1] - cy, pose.position[2] - cz);
    expect(fraction(dist, 736)).toBeLessThanOrEqual(0.75);
  });

  it("looks straight at the card", () => {
    const pose = teamHoloCamera();
    expect(pose.target[0]).toBeCloseTo(TEAM_HOLO_CARD_WORLD[0]);
    expect(pose.position[0]).toBeCloseTo(TEAM_HOLO_CARD_WORLD[0]);
  });
});
