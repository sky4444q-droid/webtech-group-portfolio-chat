// บรรยากาศของทั้งโลก: แสง เมืองนีออน พื้นเปียก ฝน และอนุภาค

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment as HdrEnvironment, MeshReflectorMaterial, Sparkles, Stars, useTexture } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import { COLORS } from "../config/theme";
import { DISTRICT_ORDER, DISTRICTS } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { buildingWindowsTexture } from "./textures";
import { fxEnabled } from "./fx/fxEnabled";
import { GroundFog, LensFlare, RainSplashes, Traffic, VolumetricCone } from "./fx/Effects";
import { STREETS } from "./street/streets";
import type { DistrictId } from "../types";

export function Environment() {
  const quality = useWorld((s) => s.quality);
  const district = useWorld((s) => s.district);
  const high = quality === "high";
  const fx = fxEnabled(quality);
  const center = DISTRICTS[district].position;
  return (
    <>
      <ambientLight intensity={0.35} color="#6b4cff" />
      <hemisphereLight args={["#3a1d7a", "#05030c", 0.6]} />
      <directionalLight position={[-40, 60, 30]} intensity={0.4} color="#9b7bff" />
      <Stars radius={260} depth={60} count={high ? 4000 : 1500} factor={4} saturation={0.6} fade speed={0.5} />
      <Suspense fallback={<FloorPlain />}>
        <Floor high={fx.reflector} />
        {/* แสงสะท้อนจาก HDRI กลางคืน (CC0) — ไม่ใช้เป็นพื้นหลัง */}
        <HdrEnvironment files="/assets/hdri/dikhololo_night_1k.hdr" environmentIntensity={0.35} />
      </Suspense>
      {fx.rain && <Rain />}
      {fx.rain && <RainSplashes />}
      {fx.traffic && <Traffic />}
      <GroundFog layers={fx.fogLayers} center={[center[0], 0, center[2]]} />
      <StreetLights cones={fx.cones} flare={fx.flare} />
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

function FloorPlain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[420, 420]} />
      <meshStandardMaterial color="#0a0714" metalness={0.7} roughness={0.45} />
    </mesh>
  );
}

function Floor({ high }: { high: boolean }) {
  // พื้นยางมะตอยเปียก: normal + roughness จาก ambientCG (CC0) ทำให้แสงสะท้อนเป็นแอ่ง ๆ
  const [normalMap, roughnessMap] = useTexture(["/assets/textures/asphalt015_normal.jpg", "/assets/textures/asphalt015_roughness.jpg"]);
  useMemo(() => {
    for (const t of [normalMap, roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(70, 70);
    }
  }, [normalMap, roughnessMap]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[420, 420]} />
      {high ? (
        <MeshReflectorMaterial
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughnessMap={roughnessMap}
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
        <meshStandardMaterial color="#0a0714" metalness={0.7} roughness={0.45} normalMap={normalMap} roughnessMap={roughnessMap} />
      )}
    </mesh>
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

// ---------- ไฟถนน: กรวยลำแสง + แฟลร์ (พิกัดสัมพัทธ์กับพื้นที่) ----------

const LIGHTS: { district: DistrictId; at: [number, number, number]; color: string }[] = [
  { district: "nexus", at: [-13, 0, 7], color: COLORS.cyan },
  { district: "nexus", at: [13, 0, 7], color: COLORS.pink },
  { district: "projects", at: [-12.5, 0, 5], color: COLORS.purple },
  { district: "projects", at: [12.5, 0, 5], color: COLORS.cyan },
  { district: "sanctuary", at: [-11, 0, 9], color: COLORS.blue },
  { district: "sanctuary", at: [11, 0, 9], color: COLORS.pink },
  { district: "gate", at: [-2.6, 0, 20], color: COLORS.pink },
  { district: "gate", at: [2.6, 0, 38], color: COLORS.cyan },
  { district: "team", at: [-11, 0, 14], color: COLORS.green },
  { district: "team", at: [11, 0, 14], color: COLORS.green },
];

function StreetLights({ cones, flare }: { cones: boolean; flare: boolean }) {
  // ไฟถนนสลับสองข้างตลอดถนนทุกสาย
  const avenue = Object.values(STREETS).flatMap((st) => {
    const [a] = st.points;
    const b = st.points[st.points.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len;
    const uz = (b[1] - a[1]) / len;
    return Array.from({ length: 3 }, (_, i) => {
      const t = (i + 0.5) / 3;
      const side = i % 2 ? 1 : -1;
      const off = st.halfWidth - 0.6;
      return {
        at: [a[0] + (b[0] - a[0]) * t - uz * off * side, 0, a[1] + (b[1] - a[1]) * t + ux * off * side] as [number, number, number],
        color: i % 2 ? COLORS.pink : COLORS.cyan,
      };
    });
  });
  const all = [
    ...LIGHTS.map((l) => {
      const p = DISTRICTS[l.district].position;
      return { at: [p[0] + l.at[0], 0, p[2] + l.at[2]] as [number, number, number], color: l.color };
    }),
    ...avenue,
  ];
  if (!cones && !flare) return null;
  return (
    <>
      {all.map((l, i) => (
        <group key={i} position={l.at}>
          {cones && <VolumetricCone color={l.color} height={7} />}
          {flare && <LensFlare color={l.color} size={3.2} position={[0, 7, 0]} />}
        </group>
      ))}
    </>
  );
}
