import { describe, expect, it } from "vitest";
import { VIEWPOINTS, viewpointWorld } from "./viewpoints";
import { DISTRICT_ORDER, DISTRICTS } from "./districts";
import { th } from "../i18n/th";
import { NEXUS_HALF, distanceToPolyline, streetOf } from "../world/street/streets";
import { cityLayout } from "../world/street/kitLayout";
import { CAMERA_FOV } from "./camera";
import * as THREE from "three";
import { BRIDGE } from "./bridge";

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

  it("stands the nexus bridge view on the deck at eye level", () => {
    const bridge = VIEWPOINTS.nexus.find((v) => v.id === "bridge")!;
    expect(bridge.mode).toBe("eye");
    expect(bridge.lookRange).toBeCloseTo(0.43);
    expect(bridge.position[1]).toBeGreaterThanOrEqual(BRIDGE.y + 1.6);
    expect(bridge.position[1]).toBeLessThanOrEqual(BRIDGE.y + 1.9);
    expect(Math.abs(bridge.position[2] - BRIDGE.z)).toBeLessThanOrEqual(0.6);
  });

  it("viewpointWorld offsets by the district position", () => {
    const w = viewpointWorld("team", 0);
    const local = VIEWPOINTS.team[0].position;
    const base = DISTRICTS.team.position;
    expect(w.position).toEqual([local[0] + base[0], local[1] + base[1], local[2] + base[2]]);
  });
});

describe("viewpoint framing", () => {
  it("never puts a viewpoint inside a building box", () => {
    // กล่องตึก (facade/tier/endCap) — position คือจุดกลาง size = [ยาวตามถนน, สูง, ลึก] หมุนด้วย rotationY
    const boxes = Object.values(cityLayout()).flat().filter((k) => k.type === "facade" || k.type === "tier" || k.type === "endCap");
    const pad = 0.3;
    for (const d of DISTRICT_ORDER) {
      if (d === "team") continue; // จุดชมทีมอยู่ในล็อบบี้โดยตั้งใจ
      for (let i = 0; i < VIEWPOINTS[d].length; i++) {
        const p = viewpointWorld(d, i).position;
        for (const b of boxes) {
          const dx = p[0] - b.position[0];
          const dz = p[2] - b.position[2];
          const c = Math.cos(b.rotationY);
          const s = Math.sin(b.rotationY);
          const lx = dx * c - dz * s;
          const lz = dx * s + dz * c;
          const inside =
            Math.abs(lx) <= b.size[0] / 2 + pad &&
            Math.abs(p[1] - b.position[1]) <= b.size[1] / 2 + pad &&
            Math.abs(lz) <= b.size[2] / 2 + pad;
          expect(inside, `${d}[${i}] inside ${b.type} at ${b.position.join(",")}`).toBe(false);
        }
      }
    }
  });

  it("keeps every viewpoint marker on screen", () => {
    for (const d of DISTRICT_ORDER) {
      for (let i = 0; i < VIEWPOINTS[d].length; i++) {
        const w = viewpointWorld(d, i);
        const cam = new THREE.PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.1, 500);
        cam.position.set(...w.position);
        cam.lookAt(...w.target);
        cam.updateMatrixWorld();
        const base = DISTRICTS[d].position;
        const m = VIEWPOINTS[d][i].marker;
        const n = new THREE.Vector3(base[0] + m[0], base[1] + m[1], base[2] + m[2]).project(cam);
        expect(Math.abs(n.x), `${d}[${i}] x`).toBeLessThanOrEqual(0.95);
        expect(n.y, `${d}[${i}] y`).toBeGreaterThanOrEqual(-0.95);
        expect(n.y, `${d}[${i}] y`).toBeLessThanOrEqual(0.95);
      }
    }
  });

  it("eye viewpoints sit between 1.8 and 2.6 m", () => {
    for (const d of DISTRICT_ORDER) for (const v of VIEWPOINTS[d]) if (v.mode === "eye") {
      // จุดชมบนสะพานวัดจากพื้นสะพาน
      const onBridge = d === "nexus" && v.id === "bridge";
      const floor = onBridge ? BRIDGE.y : 0;
      expect(v.position[1] - floor).toBeGreaterThanOrEqual(onBridge ? 1.6 : 1.8);
      expect(v.position[1] - floor).toBeLessThanOrEqual(2.6);
    }
  });
});

describe("data fragments vs viewpoint markers", () => {
  // พื้นที่คลิกของวงแหวน (ทรงกระบอกล่องหน รัศมี 1 สูง 2 กลางที่ y 0.9) ต้องไม่บังเส้นสายตาจากกล้องไปยังเศษข้อมูล
  it("never hides a fragment behind another viewpoint's click volume", async () => {
    const { FRAGMENTS } = await import("../store/useDiscovery");
    let checked = 0;
    for (const f of FRAGMENTS) {
      const base = DISTRICTS[f.district].position;
      const cam = viewpointWorld(f.district, f.viewpoint).position;
      const target = [base[0] + f.position[0], f.position[1], base[2] + f.position[2]];
      VIEWPOINTS[f.district].forEach((vp, i) => {
        if (i === f.viewpoint) return; // วงของจุดที่ยืนอยู่ถูกซ่อน
        const m = [base[0] + vp.marker[0], vp.marker[1], base[2] + vp.marker[2]];
        for (let k = 0; k <= 200; k++) {
          const t = k / 200;
          const p = [0, 1, 2].map((a) => cam[a] + (target[a] - cam[a]) * t);
          const inside = Math.hypot(p[0] - m[0], p[2] - m[2]) < 1 && p[1] > m[1] - 0.1 && p[1] < m[1] + 1.9;
          expect(inside, `${f.id} blocked by ${vp.id} marker at t=${t}`).toBe(false);
        }
        checked++;
      });
    }
    expect(checked).toBeGreaterThan(0);
  });
});
