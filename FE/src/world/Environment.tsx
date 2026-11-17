// บรรยากาศของทั้งโลก: แสง เมืองนีออน พื้นเปียก ฝน และอนุภาค

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment as HdrEnvironment, MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { Sky } from "./street/Sky";
import { Suspense } from "react";
import * as THREE from "three";
import { DISTRICT_ORDER, DISTRICTS } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { buildingWindowsTexture } from "./textures";
import { fxEnabled } from "./fx/fxEnabled";
import { Skyline } from "./street/Skyline";
import { EnergyCoreTower } from "./street/EnergyCoreTower";
import { DustMotes, GroundFog, RainSplashes, Traffic } from "./fx/Effects";
import { HoloFish } from "./fx/HoloFish";
import { SteamPlumes } from "./fx/SteamPlumes";
import { cityLayout } from "./street/kitLayout";
import { hazePatches, spillsFor } from "./street/lightSpill";
import { FloorDecals } from "./street/DecalMeshes";
import { mulberry32 } from "../lib/rng";

export function Environment() {
  const quality = useWorld((s) => s.quality);
  const district = useWorld((s) => s.district);
  const high = quality === "high";
  const fx = fxEnabled(quality);
  const center = DISTRICTS[district].position;
  // หมอกใต้แสงทั้งเมือง คำนวณครั้งเดียว (ไม่ผูกกับย่านปัจจุบัน)
  const patches = useMemo(() => hazePatches(spillsFor(Object.values(cityLayout()).flat())), []);
  return (
    <>
      {/* แสงรวมกลาง ๆ จางมาก — แสงหลักมาจากป้าย จอ และไฟถนนเอง (ไม่มีแสงม่วงรวมแล้ว) */}
      <ambientLight intensity={0.08} color="#d8dce6" />
      <Sky />
      <Skyline />
      <EnergyCoreTower />
      <Suspense fallback={<FloorPlain />}>
        <Floor high={fx.reflector} />
        {/* แสงสะท้อนจาก HDRI กลางคืน (CC0) — ไม่ใช้เป็นพื้นหลัง · ต่ำไว้ เพราะพื้นมุมเฉียงสะท้อนฟ้า HDRI เป็นแผ่นเทาซีด */}
        <HdrEnvironment files="/assets/hdri/dikhololo_night_1k.hdr" environmentIntensity={0.12} />
      </Suspense>
      {/* รอยบนพื้น (ฝาท่อ/เส้นเลน/หย่อมกระเบื้อง) ที่ y 0.01 แสดงทั้งสองโหมดคุณภาพ */}
      <FloorDecals />
      {fx.rain && <Rain />}
      {fx.rain && <RainSplashes />}
      {fx.traffic && <Traffic />}
      {fx.dust && <DustMotes />}
      {fx.fish && <HoloFish />}
      {fx.steam && <SteamPlumes />}
      <GroundFog layers={fx.fogLayers} center={[center[0], 0, center[2]]} patches={patches} hazeOn={fx.steam} />
    </>
  );
}

// ---------- พื้นเปียกสะท้อนแสง ----------

function FloorPlain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[420, 420]} />
      <meshStandardMaterial color="#050507" metalness={0.7} roughness={0.45} />
    </mesh>
  );
}

let puddleMap: THREE.CanvasTexture | null = null;
/** แผนที่ความหยาบความถี่ต่ำ 256² (แคชระดับโมดูล): พื้นที่ดำ = แอ่งน้ำเงาจัด, ขาว = พื้นแห้งหยาบ — วาดห่อขอบให้ซ้ำต่อเนื่อง */
function getPuddleMap(): THREE.CanvasTexture {
  if (puddleMap) return puddleMap;
  const N = 256;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f2f2f2";
  g.fillRect(0, 0, N, N);
  const rnd = mulberry32(0x9ddc1e);
  for (let i = 0; i < 11; i++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const r = 18 + rnd() * 38;
    const dark = 6 + Math.floor(rnd() * 24);
    // วาดซ้ำที่ offset ±N เพื่อให้ขอบต่อกันพอดีเมื่อ repeat
    for (const ox of [-N, 0, N])
      for (const oy of [-N, 0, N]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, `rgba(${dark},${dark},${dark},0.95)`);
        gr.addColorStop(0.8, `rgba(${dark},${dark},${dark},0.95)`);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
  }
  puddleMap = new THREE.CanvasTexture(c);
  puddleMap.wrapS = puddleMap.wrapT = THREE.RepeatWrapping;
  puddleMap.repeat.set(6, 6);
  return puddleMap;
}

// โหมดต่ำเท่านั้นที่ใช้ roughness map (โหมดสูงใช้แผนที่แอ่งน้ำ) จึงโหลดเฉพาะตรงนี้
function LowFloorMaterial({ normalMap }: { normalMap: THREE.Texture }) {
  const roughnessMap = useTexture("/assets/textures/tiles052_roughness.jpg");
  useMemo(() => {
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(105, 105);
  }, [roughnessMap]);
  return <meshStandardMaterial color="#1d1f25" metalness={0.7} roughness={0.45} normalMap={normalMap} normalScale={new THREE.Vector2(0.7, 0.7)} roughnessMap={roughnessMap} />;
}

function Floor({ high }: { high: boolean }) {
  // พื้นกระเบื้องดำแผ่นใหญ่เงา (ตามรูปตัวอย่าง): normal + roughness จาก ambientCG Tiles052 (CC0) ให้เห็นรอยต่อกระเบื้อง
  const normalMap = useTexture("/assets/textures/tiles052_normal.jpg");
  useMemo(() => {
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(105, 105);
  }, [normalMap]);
  const puddles = useMemo(() => getPuddleMap(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[420, 420]} />
      {high ? (
        <MeshReflectorMaterial
          normalMap={normalMap}
          // พื้นกระเบื้องดำเงาเกือบกระจก (แบบรูปตัวอย่าง): สะท้อนแรง เบลอน้อย ไม่จางตามระยะ — รอยต่อกระเบื้องมาจาก normal/roughness
          normalScale={new THREE.Vector2(0.7, 0.7)}
          // เบลอแนวตั้งแรง (ขยายภาพสะท้อนเป็นริ้วยาว) + แผนที่แอ่งน้ำคูณความหยาบ: ใต้ป้ายเป็นริ้วยาว ที่อื่นเป็นหย่อม
          roughnessMap={puddles}
          resolution={1024}
          blur={[2, 120]}
          mixBlur={0.35}
          mixStrength={2.1}
          mixContrast={1.15}
          roughness={0.35}
          depthScale={0}
          // สีของวัสดุนี้ "คูณ" กับภาพสะท้อน (สูตรของ drei) — ถ้าดำ ภาพสะท้อนจะหายเกือบหมด
          // จึงใช้เทาอ่อน + mirror 1 + ไม่เป็นโลหะ: ความมืดของพื้นมาจากฉากที่สะท้อนเอง
          color="#2e3446"
          metalness={0}
          envMapIntensity={0.15}
          mirror={1}
        />
      ) : (
        <LowFloorMaterial normalMap={normalMap} />
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
