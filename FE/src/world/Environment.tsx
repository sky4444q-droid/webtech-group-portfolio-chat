// บรรยากาศของทั้งโลก: แสง เมืองนีออน พื้นเปียก ฝน และอนุภาค

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import { COLORS } from "../config/theme";
import { DISTRICT_ORDER, DISTRICTS } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { buildingWindowsTexture } from "./textures";

export function Environment() {
  const quality = useWorld((s) => s.quality);
  const high = quality === "high";
  return (
    <>
      <ambientLight intensity={0.35} color="#6b4cff" />
      <hemisphereLight args={["#3a1d7a", "#05030c", 0.6]} />
      <directionalLight position={[-40, 60, 30]} intensity={0.4} color="#9b7bff" />
      <Stars radius={260} depth={60} count={high ? 4000 : 1500} factor={4} saturation={0.6} fade speed={0.5} />
      <City />
      <Floor high={high} />
      {high && <Rain />}
      {DISTRICT_ORDER.map((id) => (
        <Sparkles
          key={id}
          position={[DISTRICTS[id].position[0], 6, DISTRICTS[id].position[2]]}
          count={high ? 70 : 25}
          scale={[34, 12, 34]}
          size={3}
          speed={0.35}
          color={DISTRICTS[id].color}
        />
      ))}
    </>
  );
}

// ---------- พื้นเปียกสะท้อนแสง ----------

function Floor({ high }: { high: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[420, 420]} />
      {high ? (
        <MeshReflectorMaterial
          resolution={512}
          blur={[300, 80]}
          mixBlur={0.9}
          mixStrength={2.2}
          roughness={0.75}
          depthScale={0.6}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#0a0714"
          metalness={0.6}
          mirror={0.5}
        />
      ) : (
        <meshStandardMaterial color="#0a0714" metalness={0.7} roughness={0.45} />
      )}
    </mesh>
  );
}

// ---------- เมืองนีออน (ตึกแบบ instanced ให้เบาเครื่อง) ----------

interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

function makeCity(): Building[] {
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: Building[] = [];
  const clear = DISTRICT_ORDER.map((id) => ({
    x: DISTRICTS[id].position[0],
    z: DISTRICTS[id].position[2],
    r: id === "sanctuary" ? 44 : 26,
  }));
  let tries = 0;
  while (out.length < 420 && tries < 6000) {
    tries++;
    const x = (rand() - 0.5) * 380;
    const z = (rand() - 0.5) * 380;
    if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    // เว้นทางบินของกล้องระหว่าง Nexus กับพื้นที่อื่น (กล้องอยู่ที่ z+17 ของแต่ละพื้นที่) ไม่ให้บินทะลุตึก
    if ((Math.abs(x) < 14 && Math.abs(z) < 115) || (z > -14 && z < 34 && Math.abs(x) < 115)) continue;
    // เว้นซอย Arrival Alley หน้าประตูทางเข้า
    if (Math.abs(x - DISTRICTS.gate.position[0]) < 13 && z > -5 && z < 72) continue;
    const far = Math.hypot(x, z) / 190;
    out.push({ x, z, w: 3 + rand() * 6, d: 3 + rand() * 6, h: 6 + rand() * rand() * 55 * (0.6 + far) });
  }
  return out;
}

function City() {
  const buildings = useMemo(makeCity, []);
  const body = useRef<THREE.InstancedMesh>(null);
  const strips = useRef<THREE.InstancedMesh>(null);
  const windows = useMemo(() => buildingWindowsTexture(), []);
  const stripColors = [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.blue, COLORS.green];

  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    const c = new THREE.Color();
    buildings.forEach((b, i) => {
      m.position.set(b.x, b.h / 2, b.z);
      m.scale.set(b.w, b.h, b.d);
      m.rotation.set(0, 0, 0);
      m.updateMatrix();
      body.current!.setMatrixAt(i, m.matrix);
      // แถบนีออนแนวตั้งที่มุมตึก
      m.position.set(b.x + b.w / 2 + 0.05, b.h / 2, b.z + b.d / 2 + 0.05);
      m.scale.set(0.12, b.h * 0.9, 0.12);
      m.updateMatrix();
      strips.current!.setMatrixAt(i, m.matrix);
      c.set(stripColors[i % stripColors.length]).multiplyScalar(2.2);
      strips.current!.setColorAt(i, c);
    });
    body.current!.instanceMatrix.needsUpdate = true;
    strips.current!.instanceMatrix.needsUpdate = true;
    if (strips.current!.instanceColor) strips.current!.instanceColor.needsUpdate = true;
  }, [buildings]);

  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, buildings.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#0d0a1c" roughness={0.6} metalness={0.4} emissive="#ffffff" emissiveMap={windows} emissiveIntensity={1.4} />
      </instancedMesh>
      <instancedMesh ref={strips} args={[undefined, undefined, buildings.length]}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// ---------- ฝน (ตามกล้อง) ----------

const DROPS = 1400;
const RAIN_BOX = 60;

function Rain() {
  const lines = useRef<THREE.LineSegments>(null);
  const data = useMemo(() => {
    const pos = new Float32Array(DROPS * 6);
    const speed = new Float32Array(DROPS);
    for (let i = 0; i < DROPS; i++) {
      const x = (Math.random() - 0.5) * RAIN_BOX;
      const y = Math.random() * 40;
      const z = (Math.random() - 0.5) * RAIN_BOX;
      pos.set([x, y, z, x + 0.05, y - 0.7, z], i * 6);
      speed[i] = 28 + Math.random() * 18;
    }
    return { pos, speed };
  }, []);

  useFrame(({ camera }, delta) => {
    const g = lines.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    g.position.set(camera.position.x, 0, camera.position.z);
    const arr = data.pos;
    for (let i = 0; i < DROPS; i++) {
      const o = i * 6;
      const dy = data.speed[i] * dt;
      arr[o + 1] -= dy;
      arr[o + 4] -= dy;
      if (arr[o + 4] < 0) {
        const y = 36 + Math.random() * 6;
        arr[o + 1] = y;
        arr[o + 4] = y - 0.7;
      }
    }
    g.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments ref={lines} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#9fb7ff" transparent opacity={0.28} depthWrite={false} />
    </lineSegments>
  );
}
