// ฉากลิฟต์โดยสาร (วางแยกไว้นอกเมือง) — เล่นตอนเดินทางไป/กลับ Team HQ: ประตูโลหะปิด → ลิฟต์วิ่ง ตัวเลขชั้นเปลี่ยน → ประตูเปิด

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../config/theme";
import type { Vec3 } from "../../config/districts";

/** ที่ตั้งฉากลิฟต์ — ไกลจากทุกพื้นที่ */
export const ELEVATOR_ORIGIN: Vec3 = [260, 0, 260];
/** ความสูงที่ลิฟต์ขึ้นไป */
export const ELEVATOR_RISE = 60;

/** ตำแหน่งกล้องในตู้ลิฟต์ (ตาม progress 0..1 ของช่วงลิฟต์วิ่ง) */
export function elevatorCamera(k: number, out: THREE.Vector3, look: THREE.Vector3): void {
  const y = 1.7 + ELEVATOR_RISE * k;
  out.set(ELEVATOR_ORIGIN[0], y, ELEVATOR_ORIGIN[2] + 1.2);
  look.set(ELEVATOR_ORIGIN[0], y + 0.1, ELEVATOR_ORIGIN[2] + 10);
}

/** ประตูลิฟต์: 0 = ปิด, 1 = เปิด (กล้องเป็นผู้ตั้งค่า) */
export const elevatorDoors = { current: 1 };

/** จำนวนชั้นที่แสดงบนจอบอกชั้น (ชั้นล็อบบี้ = 1) */
const FLOORS = 42;
const W = 1.7; // ครึ่งความกว้างตู้
const BACK = -0.7;
const FRONT = 2.7;
const H = 3;
const MID = (FRONT + BACK) / 2;
const DEPTH = FRONT - BACK;

/** ผิวสแตนเลสขัดลายเส้นพร้อมรอยต่อแผง (วาดบน canvas) */
function brushedSteel(panels: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8a8f9c";
  g.fillRect(0, 0, 256, 256);
  // ลายขัดแนวตั้ง
  for (let x = 0; x < 256; x++) {
    const v = 120 + Math.floor(Math.random() * 40);
    g.fillStyle = `rgba(${v},${v + 4},${v + 12},0.35)`;
    g.fillRect(x, 0, 1, 256);
  }
  // รอยต่อแผง
  g.fillStyle = "#2a2c33";
  for (let i = 1; i < panels; i++) g.fillRect((i * 256) / panels - 1, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** จอบอกชั้นเหนือประตู: วาดใหม่เฉพาะตอนเลขชั้นเปลี่ยน */
function FloorDisplay() {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas, tex };
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const last = useRef({ floor: -1, up: true, y: 0 });
  useFrame(({ camera }) => {
    const k = THREE.MathUtils.clamp((camera.position.y - 1.7) / ELEVATOR_RISE, 0, 1);
    const floor = 1 + Math.round(k * (FLOORS - 1));
    const up = camera.position.y >= last.current.y;
    last.current.y = camera.position.y;
    if (floor === last.current.floor && up === last.current.up) return;
    last.current.floor = floor;
    last.current.up = up;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#050308";
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = "#ffb347";
    g.font = "bold 40px monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(floor), 78, 34);
    // ลูกศรทิศทาง
    g.beginPath();
    if (up) { g.moveTo(14, 42); g.lineTo(28, 20); g.lineTo(42, 42); }
    else { g.moveTo(14, 22); g.lineTo(28, 44); g.lineTo(42, 22); }
    g.fill();
    tex.needsUpdate = true;
  });
  return (
    <mesh position={[0, H - 0.22, FRONT - 0.06]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[0.5, 0.25]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export function ElevatorScene() {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const cabin = useRef<THREE.Group>(null);
  const wallTex = useMemo(() => brushedSteel(3), []);
  const doorTex = useMemo(() => brushedSteel(1), []);
  useEffect(() => () => { wallTex.dispose(); doorTex.dispose(); }, [wallTex, doorTex]);

  useFrame(({ camera }, dt) => {
    // ตู้ลิฟต์ตามกล้อง
    if (cabin.current) cabin.current.position.y = camera.position.y - 1.7;
    const open = elevatorDoors.current; // 0 = ปิด, 1 = เปิด
    for (const [ref, side] of [[left, -1], [right, 1]] as const) {
      if (!ref.current) continue;
      // ประตูบานเลื่อนแยกกลาง: ปิด = ชนกันที่ x 0 · เปิด = เลื่อนเข้าหลังผนังหน้า
      ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, side * (0.55 + open * 1.1), 8, dt);
    }
  });

  const steel = <meshStandardMaterial map={wallTex} color="#c8ccd8" metalness={0.85} roughness={0.32} />;

  return (
    <group position={ELEVATOR_ORIGIN}>
      <group ref={cabin}>
        {/* พื้นหินขัดสีเข้ม */}
        <mesh position={[0, 0, MID]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W * 2, DEPTH]} />
          <meshStandardMaterial color="#1c1b22" metalness={0.4} roughness={0.25} />
        </mesh>
        {/* เพดาน + แผงไฟขาวนวลตรงกลาง (ต่ำกว่าเพดาน 0.02 ม.) */}
        <mesh position={[0, H, MID]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W * 2, DEPTH]} />
          <meshStandardMaterial color="#202228" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, H - 0.02, MID]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W * 1.3, DEPTH * 0.6]} />
          <meshBasicMaterial color="#fff4e0" toneMapped={false} />
        </mesh>
        {/* ผนังหลังและผนังข้าง: สแตนเลสแบ่งแผง */}
        <mesh position={[0, H / 2, BACK]}>
          <planeGeometry args={[W * 2, H]} />
          {steel}
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * W, H / 2, MID]} rotation={[0, (-s * Math.PI) / 2, 0]}>
            <planeGeometry args={[DEPTH, H]} />
            {steel}
          </mesh>
        ))}
        {/* ราวจับที่ผนังหลัง (ห่างผนัง 0.06 ม.) */}
        <mesh position={[0, 0.95, BACK + 0.06]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, W * 1.7, 12]} />
          <meshStandardMaterial color="#d8dce6" metalness={1} roughness={0.15} />
        </mesh>
        {/* ผนังหน้า (กรอบประตู) สองข้าง + คานบน */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.35, H / 2, FRONT]}>
            <boxGeometry args={[0.7, H, 0.06]} />
            {steel}
          </mesh>
        ))}
        <mesh position={[0, H - 0.2, FRONT]}>
          <boxGeometry args={[2, 0.4, 0.06]} />
          {steel}
        </mesh>
        <FloorDisplay />
        {/* แผงปุ่มกดข้างประตู (ผนังขวา ห่างผนัง 0.03 ม.) */}
        <group position={[W - 0.03, 1.25, FRONT - 0.55]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[0.24, 0.6, 0.02]} />
            <meshStandardMaterial color="#14151a" metalness={0.7} roughness={0.3} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[(i % 2 ? 0.05 : -0.05), 0.2 - Math.floor(i / 2) * 0.12, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.01, 16]} />
              <meshBasicMaterial color={i === 1 ? COLORS.green : "#9aa0b0"} toneMapped={false} />
            </mesh>
          ))}
        </group>
        {/* ประตูบานเลื่อนโลหะ (หลังผนังหน้า 0.05 ม. ตอนเปิดจึงซ่อนหลังกรอบ) */}
        {[left, right].map((ref, i) => (
          <mesh key={i} ref={ref} position={[(i ? 1 : -1) * 0.55, 1.4, FRONT + 0.05]}>
            <boxGeometry args={[1.1, 2.8, 0.04]} />
            <meshStandardMaterial map={doorTex} color="#d0d4de" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}
        <pointLight color="#fff1dc" intensity={10} distance={6} position={[0, 2.6, 1]} />
      </group>
    </group>
  );
}
