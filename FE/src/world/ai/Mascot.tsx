// ตัวจิ๋ว — ร่าง Fluid ขนาดเล็กของ AI เดินดุ๊กดิ๊กนำในซอยตอน Intro แล้วหันมา แปลงร่างเป็นแสงและหายไป

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../config/theme";
import { INTRO_MS } from "../../config/timing";
import { useAi } from "../../store/useAi";
import { useWorld } from "../../store/useWorld";
import { mascotAt } from "../intro/introPath";
import { FluidEntity } from "./FluidEntity";

export function Mascot() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const morphStart = useRef<number | null>(null);
  const phase = useAi((s) => s.mascotPhase);
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#e8fbff", toneMapped: false }), []);

  useFrame((_, dt) => {
    if (!root.current || !body.current) return;
    const now = performance.now();
    if (start.current === null) start.current = now;
    const t = Math.min(1, (now - start.current) / INTRO_MS);
    const { position, step } = mascotAt(t);
    root.current.position.set(...position);

    const walking = t < 1 && phase === "walk";
    // บีบ-ยืดตามก้าว + เด้ง
    const hop = walking ? Math.abs(Math.sin(step * Math.PI)) : 0;
    const squash = walking ? 1 - Math.cos(step * Math.PI * 2) * 0.08 : 1 + Math.sin(now / 400) * 0.03;
    body.current.position.y = 0.36 + hop * 0.18;
    body.current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

    // หันกลับมาหากล้อง
    const targetRot = phase === "walk" ? 0 : Math.PI;
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, targetRot, 6, dt);

    // แปลงร่าง: หดเป็นแสง ลอยขึ้น แล้วหาย
    if (phase === "morph" || phase === "gone") {
      if (morphStart.current === null) morphStart.current = now;
      const m = Math.min(1, (now - morphStart.current) / 900);
      const s = 1 - m * 0.85;
      root.current.scale.setScalar(s);
      root.current.position.y += m * m * 6;
      eyeMat.opacity = 1 - m;
      eyeMat.transparent = true;
      root.current.visible = m < 1;
    }
    if (eyes.current) eyes.current.visible = phase !== "gone";
  });

  // หลังเข้าโลกแล้วไม่ต้องแสดง
  const introDone = useWorld((s) => s.introDone);
  if (introDone && phase === "gone") return null;

  return (
    <group ref={root}>
      <group ref={body}>
        <group scale={0.32}>
          <FluidEntity color={COLORS.green} accent={COLORS.cyan} mood="idle" />
        </group>
        {/* ดวงตาสองดวงทำให้ดูเป็นตัวละคร (เห็นตอนหันกลับมา) */}
        <group ref={eyes} position={[0, 0.05, -0.3]}>
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0, 0]} material={eyeMat}>
              <sphereGeometry args={[0.04, 12, 12]} />
            </mesh>
          ))}
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial color={COLORS.green} transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  );
}
