// เครื่องมือวัดประสิทธิภาพ (เฉพาะโหมดพัฒนา + ?debug=perf): window.__perf() คืนค่าเฉลี่ย 60 เฟรมล่าสุด

import type * as THREE from "three";

export interface PerfResult {
  fps: number;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
}

const WINDOW = 60;

export function perfProbeEnabled(): boolean {
  return import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "perf";
}

/** ปิด autoReset แล้วรีเซ็ต gl.info เองทุกเฟรม; คืน { tick, dispose } — เรียก tick(dt) ท้ายแต่ละเฟรม */
export function installPerfProbe(gl: THREE.WebGLRenderer): { tick: (dt: number) => void; dispose: () => void } {
  const w = window as unknown as { __perf?: () => PerfResult };
  const prevAuto = gl.info.autoReset;
  gl.info.autoReset = false;
  const dts: number[] = [];
  const calls: number[] = [];
  const tris: number[] = [];
  const push = (a: number[], v: number) => {
    a.push(v);
    if (a.length > WINDOW) a.shift();
  };
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  w.__perf = () => ({
    fps: avg(dts) > 0 ? 1 / avg(dts) : 0,
    calls: avg(calls),
    triangles: avg(tris),
    textures: gl.info.memory.textures,
    geometries: gl.info.memory.geometries,
  });
  return {
    tick(dt) {
      push(dts, dt);
      push(calls, gl.info.render.calls);
      push(tris, gl.info.render.triangles);
      gl.info.reset();
    },
    dispose() {
      gl.info.autoReset = prevAuto;
      delete w.__perf;
    },
  };
}
