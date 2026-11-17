// สายไฟหย่อนทุกเส้นรวมเป็น LineSegments เดียว
import { useMemo } from "react";
import * as THREE from "three";
import { catenary } from "./cables";
import type { Vec3 } from "../../config/districts";

const SEGMENTS = 10;

export function Cables({ spans }: { spans: { a: Vec3; b: Vec3; sag: number }[] }) {
  const geometry = useMemo(() => {
    const pos: number[] = [];
    for (const sp of spans) {
      const pts = catenary(sp.a, sp.b, sp.sag, SEGMENTS);
      for (let i = 1; i < pts.length; i++) pos.push(...pts[i - 1], ...pts[i]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [spans]);
  if (spans.length === 0) return null;
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#0b0b12" />
    </lineSegments>
  );
}
