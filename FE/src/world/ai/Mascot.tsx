// ตัวจิ๋ว — ร่าง Fluid ขนาดเล็กของ AI
// Intro: เดินจากซุ้มประตูเข้าซอย · หลังเข้าโลก: เดินนำทุกการเดินทาง (อ่านตำแหน่งจาก guideState)
// มีสัญลักษณ์หกเหลี่ยม NEXORA เรืองแสงที่หลัง เพราะผู้ชมเห็นจากด้านหลังเกือบตลอด

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../config/theme";
import { INTRO_MS } from "../../config/timing";
import { useAi } from "../../store/useAi";
import { useWorld } from "../../store/useWorld";
import { mascotAt } from "../intro/introPath";
import { guideState } from "../travel/guideState";
import { FluidEntity } from "./FluidEntity";

/** โมเดลหันหน้าไปทาง −z ที่ rotation 0 → มุมที่ต้องหมุนเพื่อเดินไปทิศ heading (atan2(x, z)) */
const faceTravel = (heading: number) => heading + Math.PI;

export function Mascot() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#e8fbff", toneMapped: false }), []);

  useFrame(({ clock }, dt) => {
    if (!root.current || !body.current) return;
    const now = performance.now();
    const w = useWorld.getState();
    const phase = useAi.getState().mascotPhase;

    let walking: boolean;
    let rot: number;
    if (!w.introDone) {
      if (start.current === null) start.current = now;
      const t = Math.min(1, (now - start.current) / INTRO_MS);
      root.current.position.set(...mascotAt(t).position);
      walking = t < 1 && phase === "walk";
      // เดินไป +x · จบแล้วหันกลับมาหาผู้ชม (−x)
      rot = walking ? faceTravel(Math.PI / 2) : faceTravel(-Math.PI / 2);
      root.current.visible = true;
      root.current.scale.setScalar(1);
    } else {
      root.current.position.copy(guideState.mascot);
      walking = guideState.walking;
      rot = faceTravel(guideState.heading);
      root.current.visible = guideState.visible;
      // แปลงร่าง: หดตัวลงขณะ AI ปลายทางโผล่
      const target = guideState.to ? 1 - guideState.aiTo * 0.85 : 1;
      root.current.scale.setScalar(THREE.MathUtils.damp(root.current.scale.x, target, 10, dt));
    }

    // บีบ-ยืดตามก้าว + เด้ง
    const step = (clock.elapsedTime * 2.6) % 1;
    const hop = walking ? Math.abs(Math.sin(step * Math.PI)) : 0;
    const squash = walking ? 1 - Math.cos(step * Math.PI * 2) * 0.08 : 1 + Math.sin(now / 400) * 0.03;
    body.current.position.y = 0.36 + hop * 0.18;
    body.current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

    // หมุนทางสั้นที่สุด
    let diff = rot - root.current.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    root.current.rotation.y += diff * (1 - Math.exp(-8 * dt));
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <group scale={0.32}>
          <FluidEntity color={COLORS.green} accent={COLORS.cyan} mood="idle" />
        </group>
        {/* ดวงตาสองดวง (ด้านหน้า −z) */}
        <group position={[0, 0.05, -0.3]}>
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0, 0]} material={eyeMat}>
              <sphereGeometry args={[0.04, 12, 12]} />
            </mesh>
          ))}
        </group>
        {/* สัญลักษณ์หกเหลี่ยม NEXORA ที่หลัง (+z) */}
        <mesh position={[0, 0.06, 0.31]}>
          <ringGeometry args={[0.07, 0.1, 6]} />
          <meshBasicMaterial color={COLORS.cyan} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.06, 0.312]}>
          <circleGeometry args={[0.035, 6]} />
          <meshBasicMaterial color={[2, 2.4, 2.6]} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}
