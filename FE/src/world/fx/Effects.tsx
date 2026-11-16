// เอฟเฟกต์บรรยากาศ: กรวยลำแสง, แสงแฟลร์, หมอกพื้นเป็นชั้น, โดรน/รถลอย, ฝนกระเซ็น
// ทุกตัวเบา (mesh โปร่งแสงแบบ additive) และปิดได้ตามคุณภาพ (fxEnabled)

import { useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../config/theme";

// ---------- กรวยลำแสง (Volumetric light แบบหลอก) ----------

let coneAlpha: THREE.Texture | null = null;
/** ไล่ความทึบจากโคม (บน) ไปจางที่พื้น (ล่าง) */
function getConeAlpha(): THREE.Texture {
  if (coneAlpha) return coneAlpha;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.5, "#555555");
  grad.addColorStop(1, "#000000");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  coneAlpha = new THREE.CanvasTexture(c);
  return coneAlpha;
}

export function VolumetricCone({ color, height = 7, radius = 2.6, opacity = 0.35, ...group }: ThreeElements["group"] & { color: string; height?: number; radius?: number; opacity?: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const alpha = useMemo(() => getConeAlpha(), []);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = opacity * (0.85 + Math.sin(clock.elapsedTime * 1.7 + height) * 0.15);
  });
  return (
    <group {...group}>
      {/* โคมไฟ */}
      <mesh position={[0, height, 0]}>
        <cylinderGeometry args={[0.35, 0.5, 0.25, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* กรวยแสง: ใช้ material มาตรฐาน + alphaMap ไล่ระดับ (shader เขียนเองทำให้ Bloom เป็นจอดำ) */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.3, radius, height, 24, 1, true]} />
        <meshBasicMaterial
          ref={mat}
          color={color}
          alphaMap={alpha}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------- แสงแฟลร์ ----------

let flareTexture: THREE.Texture | null = null;
function getFlareTexture(): THREE.Texture {
  if (flareTexture) return flareTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.15, "rgba(255,255,255,0.6)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  // เส้นแสงแนวนอน (anamorphic streak)
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.fillRect(0, 62, 128, 4);
  flareTexture = new THREE.CanvasTexture(c);
  return flareTexture;
}

/** แสงแฟลร์ที่สว่างขึ้นเมื่อกล้องมองตรงเข้าหาแหล่งแสง */
export function LensFlare({ color, size = 6, ...group }: ThreeElements["group"] & { color: string; size?: number }) {
  const sprite = useRef<THREE.Sprite>(null);
  const ghost = useRef<THREE.Sprite>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const toLight = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const tex = useMemo(() => getFlareTexture(), []);
  useFrame(({ camera }) => {
    if (!sprite.current) return;
    sprite.current.getWorldPosition(world);
    toLight.subVectors(world, camera.position).normalize();
    camera.getWorldDirection(camDir);
    const align = Math.max(0, camDir.dot(toLight));
    const k = Math.pow(align, 10);
    (sprite.current.material as THREE.SpriteMaterial).opacity = 0.25 + k * 0.75;
    sprite.current.scale.setScalar(size * (0.6 + k * 0.8));
    if (ghost.current) (ghost.current.material as THREE.SpriteMaterial).opacity = k * 0.35;
  });
  return (
    <group {...group}>
      <sprite ref={sprite}>
        <spriteMaterial map={tex} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={ghost} scale={size * 2.4}>
        <spriteMaterial map={tex} color={color} transparent opacity={0} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

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
  const colors = [COLORS.purple, COLORS.blue, COLORS.pink];
  return (
    <group position={center}>
      {textures.map((t, i) => (
        // ทุกชั้นต่ำกว่าระดับสายตา · ใช้ blending ปกติ (additive บนแผ่นใหญ่ทำให้ภาพดำทั้งจอเมื่อมี Bloom)
        <mesh key={i} position={[0, 0.12 + i * 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
          <planeGeometry args={[160, 160]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            map={t}
            color={colors[i % colors.length]}
            transparent
            opacity={0.14 - i * 0.03}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------- โดรนและรถลอยวิ่งเป็นวงไกล ๆ ----------

const VEHICLES = 26;

export function Traffic() {
  const body = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lanes = useMemo(
    () =>
      Array.from({ length: VEHICLES }, (_, i) => ({
        radius: 70 + (i % 6) * 22,
        height: 18 + (i % 5) * 7,
        speed: (0.03 + (i % 4) * 0.012) * (i % 2 ? 1 : -1),
        phase: (i / VEHICLES) * Math.PI * 2 * 3.7,
        drone: i % 3 === 0,
      })),
    [],
  );
  const c = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    if (!body.current || !lights.current) return;
    const t = clock.elapsedTime;
    lanes.forEach((l, i) => {
      const a = l.phase + t * l.speed;
      const x = Math.cos(a) * l.radius;
      const z = Math.sin(a) * l.radius;
      const y = l.height + Math.sin(t * 0.8 + i) * (l.drone ? 1.2 : 0.3);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -a + (l.speed > 0 ? 0 : Math.PI), 0);
      dummy.scale.set(l.drone ? 0.8 : 2.2, l.drone ? 0.25 : 0.5, l.drone ? 0.8 : 0.9);
      dummy.updateMatrix();
      body.current!.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(l.drone ? 0.2 : 2.4, 0.1, l.drone ? 0.2 : 0.95);
      dummy.position.y -= 0.25;
      dummy.updateMatrix();
      lights.current!.setMatrixAt(i, dummy.matrix);
      c.set(l.drone ? COLORS.green : i % 2 ? COLORS.pink : COLORS.cyan).multiplyScalar(2.5);
      lights.current!.setColorAt(i, c);
    });
    body.current.instanceMatrix.needsUpdate = true;
    lights.current.instanceMatrix.needsUpdate = true;
    if (lights.current.instanceColor) lights.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, VEHICLES]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#1a1530" metalness={0.8} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, VEHICLES]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
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
