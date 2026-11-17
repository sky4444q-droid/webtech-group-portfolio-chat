// เอฟเฟกต์บรรยากาศ: หมอกพื้นเป็นชั้น, โดรน/รถลอย, ฝนกระเซ็น
// ทุกตัวเบา (mesh โปร่งแสงแบบ additive) และปิดได้ตามคุณภาพ (fxEnabled)

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { trafficLanes } from "./trafficLanes";

// ---------- หมอกพื้นเป็นชั้น ----------

let fogTexture: THREE.Texture | null = null;
function getFogTexture(): THREE.Texture {
  if (fogTexture) return fogTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 30 + rand() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.18)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  fogTexture = new THREE.CanvasTexture(c);
  fogTexture.wrapS = fogTexture.wrapT = THREE.RepeatWrapping;
  return fogTexture;
}

export function GroundFog({ layers, center }: { layers: number; center: [number, number, number] }) {
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const tex = useMemo(() => getFogTexture(), []);
  const textures = useMemo(
    () =>
      Array.from({ length: layers }, () => {
        const t = tex.clone();
        t.repeat.set(4, 4);
        t.needsUpdate = true;
        return t;
      }),
    [tex, layers],
  );
  useFrame((_, dt) => {
    textures.forEach((t, i) => {
      t.offset.x += dt * 0.006 * (i + 1);
      t.offset.y += dt * 0.004 * (i % 2 ? -1 : 1);
    });
  });
  // หมอกชั้นเดียวบาง ๆ ใต้เข่า สีม่วงเข้ม
  const colors = ["#3a2a6a"];
  return (
    <group position={center}>
      {textures.map((t, i) => (
        // ทุกชั้นต่ำกว่าระดับสายตา · ใช้ blending ปกติ (additive บนแผ่นใหญ่ทำให้ภาพดำทั้งจอเมื่อมี Bloom)
        <mesh key={i} position={[0, 0.1 + i * 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
          <planeGeometry args={[160, 160]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            map={t}
            color={colors[i % colors.length]}
            transparent
            opacity={0.09 - i * 0.02}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------- รถลอยวิ่งตามเลนถนน (ไฟหน้าขาว ไฟท้ายแดง) ----------

const VEHICLES = 30;

export function Traffic() {
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const tail = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // คำนวณทิศ/ความยาวเลนไว้ล่วงหน้า ไม่สร้างของใหม่ในเฟรม
  const cars = useMemo(() => {
    const lanes = trafficLanes(7);
    return Array.from({ length: VEHICLES }, (_, i) => {
      const l = lanes[i % lanes.length];
      const dx = l.to[0] - l.from[0];
      const dz = l.to[2] - l.from[2];
      return { l, yaw: Math.atan2(dx, dz), off: i / VEHICLES + l.phase };
    });
  }, []);

  useLayoutEffect(() => {
    const h = new THREE.Color("#ffffff").multiplyScalar(3);
    const t = new THREE.Color("#ff2030").multiplyScalar(3);
    for (let i = 0; i < VEHICLES; i++) {
      head.current?.setColorAt(i, h);
      tail.current?.setColorAt(i, t);
    }
    if (head.current?.instanceColor) head.current.instanceColor.needsUpdate = true;
    if (tail.current?.instanceColor) tail.current.instanceColor.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    if (!body.current || !head.current || !tail.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < VEHICLES; i++) {
      const { l, yaw, off } = cars[i];
      const u = (off + t * l.speed) % 1;
      const x = l.from[0] + (l.to[0] - l.from[0]) * u;
      const y = l.from[1] + (l.to[1] - l.from[1]) * u + Math.sin(t * 0.8 + i) * 0.2;
      const z = l.from[2] + (l.to[2] - l.from[2]) * u;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(0.9, 0.35, 2.2);
      dummy.updateMatrix();
      body.current.setMatrixAt(i, dummy.matrix);
      // ไฟหน้า/ท้ายเป็นแท่งบางที่ปลายตัวถัง (แกน z ของรถคือทิศวิ่ง)
      const s = Math.sin(yaw);
      const c = Math.cos(yaw);
      dummy.scale.set(0.8, 0.14, 0.08);
      dummy.position.set(x + s * 1.1, y, z + c * 1.1);
      dummy.updateMatrix();
      head.current.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x - s * 1.1, y, z - c * 1.1);
      dummy.updateMatrix();
      tail.current.setMatrixAt(i, dummy.matrix);
    }
    body.current.instanceMatrix.needsUpdate = true;
    head.current.instanceMatrix.needsUpdate = true;
    tail.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, VEHICLES]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#1a1530" metalness={0.8} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, VEHICLES]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tail} args={[undefined, undefined, VEHICLES]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// ---------- ฝุ่นลอยใกล้กล้อง ----------

const MOTES = 300;
const BOX: [number, number, number] = [20, 8, 20];

export function DustMotes() {
  const pts = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const pos = new Float32Array(MOTES * 3);
    const vel = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOX[0];
      pos[i * 3 + 1] = Math.random() * BOX[1];
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOX[2];
      vel[i * 3] = (Math.random() - 0.5) * 0.15;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }
    return { pos, vel };
  }, []);

  useFrame(({ camera }, delta) => {
    const g = pts.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    // กล่องตามกล้อง (เหมือนฝน) แล้ววนค่ากลับเมื่อหลุดกล่อง
    g.position.set(camera.position.x, 0, camera.position.z);
    const a = data.pos;
    for (let i = 0; i < MOTES; i++) {
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        a[j] += data.vel[j] * dt;
        const lo = k === 1 ? 0 : -BOX[k] / 2;
        const hi = k === 1 ? BOX[1] : BOX[k] / 2;
        if (a[j] < lo) a[j] = hi;
        else if (a[j] > hi) a[j] = lo;
      }
    }
    g.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pts} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#dcd6ff" size={0.04} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

// ---------- ฝนกระเซ็นบนพื้นใกล้กล้อง ----------

const SPLASHES = 70;

export function RainSplashes() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => Array.from({ length: SPLASHES }, () => ({ x: 0, z: 0, t: Math.random() })), []);
  const { camera } = useThree();
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const dt = Math.min(delta, 0.05);
    data.forEach((d, i) => {
      d.t += dt * 2.2;
      if (d.t >= 1) {
        d.t = 0;
        d.x = camera.position.x + (Math.random() - 0.5) * 22;
        d.z = camera.position.z + (Math.random() - 0.5) * 22 - 6;
      }
      dummy.position.set(d.x, 0.03, d.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(0.03 + d.t * 0.13);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    (mesh.current.material as THREE.MeshBasicMaterial).opacity = 0.22 * (1 - data[0].t * 0.5);
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SPLASHES]} frustumCulled={false}>
      <ringGeometry args={[0.8, 1, 16]} />
      <meshBasicMaterial color="#b9c8ff" transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  );
}

// ---------- ไอน้ำจากร้านอาหาร (ชิ้น steam ของถนน) ----------

const PUFFS = 6;

/** ไอน้ำลอยขึ้นจากจุดที่กำหนด: sprite จาง ๆ ขยายตัวและจางหายขณะลอย */
export function Steam({ points }: { points: [number, number, number][] }) {
  const tex = useMemo(() => getFogTexture(), []);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((s, i) => {
      const k = (t * 0.35 + (i % PUFFS) / PUFFS + Math.floor(i / PUFFS) * 0.37) % 1;
      const base = points[Math.floor(i / PUFFS)];
      s.position.set(base[0] + Math.sin(t + i) * 0.15, base[1] + k * 2.6, base[2]);
      s.scale.setScalar(0.5 + k * 1.6);
      ((s as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 0.32 * Math.sin(k * Math.PI);
    });
  });
  return (
    <group ref={group}>
      {points.flatMap((_, p) =>
        Array.from({ length: PUFFS }, (_, i) => (
          <sprite key={`${p}-${i}`}>
            <spriteMaterial map={tex} color="#c8d4e6" transparent opacity={0} depthWrite={false} />
          </sprite>
        )),
      )}
    </group>
  );
}
