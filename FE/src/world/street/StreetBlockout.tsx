// ผนังดำชั่วคราวสองข้างถนน (ใช้ระหว่างสร้างชุดตัวต่อเมือง จะถูกแทนในงานถัดไป)

import { useMemo } from "react";
import { NEXUS_HALF, STREETS } from "./streets";

interface Wall {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

function walls(): Wall[] {
  const out: Wall[] = [];
  for (const s of Object.values(STREETS)) {
    const [a] = s.points;
    const b = s.points[s.points.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len;
    const uz = (b[1] - a[1]) / len;
    const cx = (a[0] + b[0]) / 2;
    const cz = (a[1] + b[1]) / 2;
    const off = s.halfWidth + 2;
    const along = Math.abs(ux) > 0.5;
    for (const side of [-1, 1]) {
      out.push({ x: cx - uz * off * side, z: cz + ux * off * side, w: along ? len : 4, d: along ? 4 : len, h: 24 });
    }
    // ปิดปลายถนน
    out.push({ x: b[0] + ux * 16, z: b[1] + uz * 16, w: along ? 4 : s.halfWidth * 2 + 8, d: along ? s.halfWidth * 2 + 8 : 4, h: 30 });
  }
  // มุมตึกทั้งสี่ของสี่แยก
  const c = NEXUS_HALF + 8;
  for (const [x, z] of [[c, c], [-c, c], [c, -c], [-c, -c]]) out.push({ x, z, w: 16, d: 16, h: 40 });
  return out;
}

export function StreetBlockout() {
  const list = useMemo(walls, []);
  return (
    <group>
      {list.map((w, i) => (
        <mesh key={i} position={[w.x, w.h / 2, w.z]}>
          <boxGeometry args={[w.w, w.h, w.d]} />
          <meshStandardMaterial color="#07060b" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
