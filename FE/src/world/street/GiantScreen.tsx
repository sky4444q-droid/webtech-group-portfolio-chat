// จอยักษ์โค้ง 90° ห่อมุมตึกเหนือระดับจอใหญ่: mesh เดียว shader เดียว (หนึ่ง draw call)

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useWorld } from "../../store/useWorld";
import { fxEnabled } from "../fx/fxEnabled";
import type { KitItem } from "./kitLayout";
import { STREETS } from "./streets";
import { giantFragment, giantProgramOf, giantVertex, typeStrip } from "./giantPrograms";

export function GiantScreen({ item }: { item: KitItem }) {
  const emblem = useTexture("/images/nexora-emblem.png");
  const [arc, h, r] = item.size;
  const s = item.corner ?? 1;
  const uniforms = useMemo(
    () => ({
      uProgram: { value: giantProgramOf(item.variant) },
      uTime: { value: 5 + item.variant },
      uAspect: { value: arc / h },
      uEmblem: { value: emblem },
      uStrip: { value: typeStrip() },
    }),
    [item.variant, arc, h, emblem],
  );
  const frozen = useWorld((st) => !fxEnabled(st.quality).screensAnimated);
  useFrame((_, dt) => {
    if (frozen) uniforms.uTime.value = 5 + item.variant;
    else uniforms.uTime.value += Math.min(dt, 0.1);
  });
  // ถนนแคบ: บีบส่วนที่ยื่นออกจากหน้าตึกไม่ให้เกินครึ่งถนน (สี่แยกไม่บีบ)
  const bulge = item.street === "nexus" ? 1 : Math.min(1, (STREETS[item.street].halfWidth * 0.6) / r);
  return (
    <group position={item.position} rotation={[0, item.rotationY, 0]}>
      {/* จุดศูนย์กลางวงอยู่บนหน้าตึก ห่างจากมุม r ส่วนโค้งเริ่มที่มุมตึกแล้วโค้งออกมาหาถนน */}
      <mesh position={[-s * r, 0, 0.05]} scale={[1, 1, bulge]}>
        <cylinderGeometry args={[r, r, h, 8, 1, true, s > 0 ? 0 : -Math.PI / 2, Math.PI / 2]} />
        <shaderMaterial vertexShader={giantVertex} fragmentShader={giantFragment} uniforms={uniforms} toneMapped={false} />
      </mesh>
    </group>
  );
}
