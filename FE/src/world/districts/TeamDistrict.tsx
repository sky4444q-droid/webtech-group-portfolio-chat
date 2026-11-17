// Team Headquarters — อาคารวิจัย/สำนักงานใหญ่ มีจอข้อมูลทีมและจอติดต่อ

import { useAi } from "../../store/useAi";
import * as sfx from "../../audio/sfx";
import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { useWorld, type Panel } from "../../store/useWorld";
import { useT } from "../../i18n";
import { NeonSign } from "../NeonSign";
import { AiPresence } from "../ai/AiPresence";
import { screenTexture } from "../textures";
import { curtainWallTexture, windowGrid } from "../street/windowMaterial";
import { TEAM_LOBBY_OFFSET, TEAM_TOWER } from "../street/streets";
import { HoloCard } from "../HoloCard";
import { TEAM_HOLO_CARD } from "../../config/viewpoints";
import { usePortfolio } from "../../store/usePortfolio";
import { usePick } from "../../i18n";
import { Text } from "../../ui/Pending";

/** ผิวสแตนเลสขัดลายเส้น (วาดบน canvas) */
function brushed(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8a8f9c";
  g.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x++) {
    const v = 120 + Math.floor(Math.random() * 40);
    g.fillStyle = `rgba(${v},${v + 4},${v + 12},0.35)`;
    g.fillRect(x, 0, 1, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** จอบอกชั้นเหนือประตู: ลูกศรขึ้น + "L" (ชั้นล็อบบี้) */
function lobbyDisplay(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#050308";
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = "#ffb347";
  g.beginPath();
  g.moveTo(16, 42);
  g.lineTo(30, 20);
  g.lineTo(44, 42);
  g.fill();
  g.font = "bold 40px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("L", 82, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const DOOR_W = 1.1;
const DOOR_H = 2.7;

/** ทางเข้าลิฟต์ที่ฐานตึก Team HQ: กรอบสแตนเลส ประตูบานเลื่อนคู่ จอบอกชั้น ปุ่มเรียก กันสาด และผนังล็อบบี้กระจก
 * พิกัดท้องถิ่น: +z หันออกถนน · z 0 = ผิวหน้าตึก + 0.05 ม. · ประตูเลื่อนเปิดเมื่อกล้องเข้ามาใกล้ */
function ElevatorEntrance({ color }: { color: string }) {
  const steelTex = useMemo(brushed, []);
  const display = useMemo(lobbyDisplay, []);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const root = useRef<THREE.Group>(null);
  const here = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }, dt) => {
    if (!root.current) return;
    root.current.getWorldPosition(here);
    const open = camera.position.distanceTo(here) < 9 ? 1 : 0;
    for (const [ref, side] of [[left, -1], [right, 1]] as const) {
      if (!ref.current) continue;
      ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, side * (DOOR_W / 2 + open * DOOR_W * 0.95), 4, dt);
    }
  });
  const steel = <meshStandardMaterial map={steelTex} color="#c8ccd8" metalness={0.85} roughness={0.3} />;
  return (
    <group ref={root}>
      {/* ผนังล็อบบี้กระจกสองข้างประตู มีแสงอุ่นด้านใน */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 4.9, 2, 0.02]}>
          <mesh>
            <planeGeometry args={[5, 4]} />
            <meshBasicMaterial color="#3a2c1c" toneMapped={false} />
          </mesh>
          {[-2, -0.65, 0.65, 2].map((x) => (
            <mesh key={x} position={[x, 0, 0.03]}>
              <boxGeometry args={[0.08, 4, 0.06]} />
              <meshStandardMaterial color="#14151c" metalness={0.8} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
      {/* กรอบประตูสแตนเลส: เสาข้าง + คานบน */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR_W + 0.25), 1.7, 0.17]}>
          <boxGeometry args={[0.5, 3.4, 0.1]} />
          {steel}
        </mesh>
      ))}
      <mesh position={[0, DOOR_H + 0.35, 0.17]}>
        <boxGeometry args={[DOOR_W * 2 + 1, 0.7, 0.1]} />
        {steel}
      </mesh>
      {/* ผนังตู้ลิฟต์ด้านหลังประตู (เห็นเมื่อเปิด) */}
      <mesh position={[0, DOOR_H / 2, 0.005]}>
        <planeGeometry args={[DOOR_W * 2, DOOR_H]} />
        <meshBasicMaterial map={steelTex} color="#5a5650" />
      </mesh>
      {/* ไฟเพดานตู้ลิฟต์ที่มองเห็นผ่านประตู */}
      <mesh position={[0, DOOR_H - 0.12, 0.008]}>
        <planeGeometry args={[DOOR_W * 1.6, 0.1]} />
        <meshBasicMaterial color="#fff1dc" toneMapped={false} />
      </mesh>
      {/* ประตูบานเลื่อนคู่ (หลังกรอบ เหนือแผ่นไฟในช่องลิฟต์) */}
      {[left, right].map((ref, i) => (
        <mesh key={i} ref={ref} position={[(i ? 1 : -1) * (DOOR_W / 2), DOOR_H / 2, 0.03]}>
          <boxGeometry args={[DOOR_W, DOOR_H, 0.04]} />
          <meshStandardMaterial map={steelTex} color="#d6dae4" metalness={0.9} roughness={0.22} />
        </mesh>
      ))}
      {/* จอบอกชั้นบนคาน (หน้าจอห่างคาน 0.02 ม.) */}
      <mesh position={[0, DOOR_H + 0.35, 0.24]}>
        <planeGeometry args={[0.7, 0.35]} />
        <meshBasicMaterial map={display} toneMapped={false} />
      </mesh>
      {/* แผงปุ่มเรียกลิฟต์ที่เสาขวา */}
      <group position={[DOOR_W + 0.25, 1.25, 0.24]}>
        <mesh>
          <boxGeometry args={[0.2, 0.4, 0.02]} />
          <meshStandardMaterial color="#14151a" metalness={0.7} roughness={0.3} />
        </mesh>
        {[0.08, -0.08].map((y, i) => (
          <mesh key={y} position={[0, y, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
            <meshBasicMaterial color={i === 0 ? color : "#9aa0b0"} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* กันสาด + แถบไฟใต้กันสาด + ป้ายนีออน */}
      <mesh position={[0, 4.15, 0.8]}>
        <boxGeometry args={[4.4, 0.14, 1.6]} />
        <meshStandardMaterial color="#101118" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 4.06, 1.58]}>
        <boxGeometry args={[4.4, 0.04, 0.04]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <NeonSign text="TEAM HQ" color={color} height={0.42} position={[0, 4.55, 0.3]} />
      <spotLight color="#fff1dc" intensity={30} distance={7} angle={0.7} penumbra={0.6} position={[0, 4, 1.2]} target-position={[0, 0, 2]} />
    </group>
  );
}

export function TeamDistrict() {
  const cfg = DISTRICTS.team;
  const tr = useT();
  const windows = useMemo(() => {
    // ไม่ได้แพตช์ shader → ตั้ง repeat ให้หน้าต่างขนาดเท่าตึกอื่น (แผ่นละ 8×16 ช่อง)
    const tex = curtainWallTexture().clone();
    const g = windowGrid(Math.max(TEAM_TOWER.size[0], TEAM_TOWER.size[2]), TEAM_TOWER.size[1]);
    tex.repeat.set(g.cols / 8, g.rows / 16);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={cfg.position}>
      {/* ตึกสำนักงานกระจกปิดปลายถนน (หน้าตึกหันไปทาง −x หาถนน) — ล็อบบี้อยู่ข้างใน ไปได้ทางลิฟต์ */}
      <mesh position={TEAM_TOWER.center}>
        <boxGeometry args={TEAM_TOWER.size} />
        <meshStandardMaterial color="#0a0c14" metalness={0.85} roughness={0.15} emissive="#ffffff" emissiveMap={windows} emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[TEAM_TOWER.center[0], TEAM_TOWER.center[1] + TEAM_TOWER.size[1] / 2 + 0.2, TEAM_TOWER.center[2]]}>
        <boxGeometry args={[TEAM_TOWER.size[0] + 0.4, 0.3, TEAM_TOWER.size[2] + 0.4]} />
        <meshBasicMaterial color={cfg.color} toneMapped={false} />
      </mesh>
      {/* ประตูลิฟต์ที่ฐานตึก (หน้าตึกอยู่ x −1.5 · กลุ่มนี้ยื่นออก 0.05 ม.) */}
      <group position={[-1.55, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <ElevatorEntrance color={cfg.color} />
      </group>
      <pointLight color={cfg.color} intensity={18} distance={12} position={[-3.5, 3, 0]} />

      <group position={TEAM_LOBBY_OFFSET}>
      <Lobby color={cfg.color} />

      <Screen title={tr("teamScreen")} color={cfg.color} panel={{ kind: "team", display: "holo" }} position={[-3.6, 1.95, -2]} rotation={[0, 0.12, 0]} scale={0.75} />
      <Screen title={tr("contactScreen")} color={COLORS.pink} panel={{ kind: "contact" }} position={[3.6, 1.95, -2]} rotation={[0, -0.12, 0]} scale={0.75} />

      <TeamHolo />
      <AiPresence district="team" size={0.45} position={[-6.6, 2.3, -0.5]} />
      <pointLight color={cfg.color} intensity={30} distance={22} position={[0, 3.8, 3]} />
      <pointLight color={COLORS.cyan} intensity={14} distance={14} position={[0, 3.6, -4]} />
      </group>
    </group>
  );
}

function Screen({
  title,
  color,
  panel,
  ...group
}: { title: string; color: string; panel: Exclude<Panel, null> } & ThreeElements["group"]) {
  const openPanel = useWorld((s) => s.openPanel);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const texture = useMemo(() => screenTexture(title, color), [title, color]);
  const frame = useRef<THREE.Group>(null);

  useFrame(({ clock }, dt) => {
    if (!frame.current) return;
    frame.current.position.y = Math.sin(clock.elapsedTime * 1.3 + (panel.kind === "team" ? 0 : 1.5)) * 0.08;
    const s = THREE.MathUtils.damp(frame.current.scale.x, hovered ? 1.06 : 1, 8, dt);
    frame.current.scale.setScalar(s);
  });

  return (
    <group {...group}>
      <group
        ref={frame}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          useAi.getState().noticeHover();
          sfx.play("hover");
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          const s = useWorld.getState();
          if (s.introDone && !s.travel) {
            sfx.play("panelOpen");
            openPanel(panel);
          }
        }}
      >
        <mesh>
          <planeGeometry args={[5, 3.125]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} color={[1.4, 1.4, 1.4]} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[0, -2.6, 0]}>
        <cylinderGeometry args={[0.08, 0.2, 2, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** ล็อบบี้ชั้นล่างของสำนักงานใหญ่ — ผนังกระจก เพดานไฟ จอข้อมูลอยู่ระดับสายตา */
const LOBBY = { halfW: 9, back: -6, front: 11, height: 4.4 };

function Lobby({ color }: { color: string }) {
  const { halfW, back, front, height } = LOBBY;
  const depth = front - back;
  const midZ = (front + back) / 2;
  return (
    <group>
      {/* ผนังหลัง */}
      <mesh position={[0, height / 2, back]}>
        <planeGeometry args={[halfW * 2, height, 18, 4]} />
        <meshStandardMaterial color="#0a0818" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, height / 2, back + 0.02]}>
        <planeGeometry args={[halfW * 2, height, 18, 4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.08} toneMapped={false} />
      </mesh>
      <NeonSign text="TEAM HEADQUARTERS" color={color} height={0.42} position={[0, 3.55, back + 0.05]} />
      {/* ผนังข้างเป็นกระจก */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * halfW, height / 2, midZ]} rotation={[0, (-side * Math.PI) / 2, 0]}>
          <mesh>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#1a2a4a" metalness={0.9} roughness={0.08} transparent opacity={0.22} side={THREE.DoubleSide} />
          </mesh>
          {[-0.5, 0.5].map((k) => (
            <mesh key={k} position={[0, k * height * 0.92, 0.01]}>
              <boxGeometry args={[depth, 0.05, 0.05]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {/* ผนังหน้ากระจก เว้นประตูกลาง */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (halfW + 2.2) / 2, height / 2, front]}>
          <planeGeometry args={[halfW - 2.2, height]} />
          <meshStandardMaterial color="#1a2a4a" metalness={0.9} roughness={0.08} transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* เพดาน + แถบไฟ */}
      <mesh position={[0, height, midZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfW * 2, depth]} />
        <meshStandardMaterial color="#07060f" metalness={0.5} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {[-5, 0, 5].map((x) => (
        <mesh key={x} position={[x, height - 0.04, midZ]}>
          <boxGeometry args={[0.18, 0.04, depth - 1]} />
          <meshBasicMaterial color={x === 0 ? color : COLORS.cyan} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** การ์ดสมาชิกแบบ Hologram กางออกจากจอทีม — คลิกการ์ด = โปรไฟล์เต็มจอ */
function TeamHolo() {
  const tr = useT();
  const p = usePick();
  const open = useWorld((s) => s.panel?.kind === "team" && s.panel.display === "holo");
  const members = usePortfolio((s) => s.data.members);
  const expandPanel = useWorld((s) => s.expandPanel);
  const openPanel = useWorld((s) => s.openPanel);
  if (!open) return null;
  // การ์ดเดียวรวมทุกคน: ให้ CSS จัดเรียง แทนการวางการ์ดแยกตามพิกัดฉาก (ซึ่งซ้อนกันบนจอเตี้ย)
  return (
    <group position={TEAM_HOLO_CARD}>
      <HoloCard position={[0, 0, 0]} color={COLORS.green} className="holo-card-team">
        <div className="holo-team-grid">
          {members.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className="holo-member"
              style={{ animationDelay: `${i * 0.08}s` }}
              onClick={(e) => {
                e.stopPropagation();
                sfx.play("panelOpen");
                openPanel({ kind: "member", id: m.id });
              }}
            >
              <span className="member-silhouette" aria-hidden="true" />
              <strong>{p(m.name)}</strong>
              <small>
                <Text value={m.role} placeholder={m.placeholder} />
              </small>
            </button>
          ))}
        </div>
        <p className="holo-hint">{tr("holoTeamHint")}</p>
        <button
          type="button"
          className="btn btn-small holo-btn"
          onClick={(e) => {
            e.stopPropagation();
            expandPanel();
          }}
        >
          {tr("holoSeeAll")}
        </button>
      </HoloCard>
    </group>
  );
}
