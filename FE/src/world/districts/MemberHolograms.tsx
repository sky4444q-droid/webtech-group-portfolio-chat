// แท่นฉายโฮโลแกรมสมาชิกในล็อบบี้ Team HQ — รูปจริงย้อมสีประจำตัว + เส้นสแกน + ชิปทักษะหมุนรอบตัว · คลิก = เปิดโปรไฟล์

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { usePortfolio } from "../../store/usePortfolio";
import { useWorld } from "../../store/useWorld";
import { usePick } from "../../i18n";
import * as sfx from "../../audio/sfx";
import type { Member } from "../../types";
import { HOLO_ROW_Z } from "../../config/viewpoints";

/** ระยะห่างแท่น · ตำแหน่งแถว (พิกัดล็อบบี้) */
export const HOLO_SPACING = 2.05;
const PEDESTAL_H = 0.5;
const PHOTO_W = 1.25;
const PHOTO_H = PHOTO_W * (1024 / 765);
const PHOTO_Y = PEDESTAL_H + 0.55 + PHOTO_H / 2;
const ORBIT_R = 0.82;
const MAX_CHIPS = 5;

const photoVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// ย้อมสีแต่ยังเห็นหน้า · เส้นสแกน · แถบแสงวิ่งขึ้น · glitch นาน ๆ ครั้ง · ขอบจางเป็นวงรี
const photoFrag = /* glsl */ `
uniform sampler2D map; uniform vec3 tint; uniform float time; uniform float seed; uniform float hover;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  float g = step(0.965, fract(sin(floor(time * 6.0 + seed) * 12.9898) * 43758.5453));
  uv.x += g * sin(uv.y * 80.0 + time * 40.0) * 0.012;
  vec3 c = texture2D(map, uv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // พื้นผิวเป็น linear (มืดกว่าที่เห็นในไฟล์) → ยกความสว่างขึ้นก่อนย้อมสี
  c = pow(c, vec3(0.6)) * 1.15;
  lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(c, tint * (lum * 1.5 + 0.06), 0.32) * 1.35;
  col *= 0.82 + 0.18 * sin(vUv.y * 420.0 - time * 5.0);
  float band = smoothstep(0.06, 0.0, abs(vUv.y - fract(time * 0.22 + seed)));
  col += tint * band * 0.35;
  vec2 d = (vUv - vec2(0.5, 0.56)) * vec2(1.05, 0.82);
  float mask = 1.0 - smoothstep(0.30, 0.48, length(d));
  mask *= smoothstep(0.0, 0.16, vUv.y);
  float flick = 0.9 + 0.1 * sin(time * 23.0 + seed * 7.0);
  gl_FragColor = vec4(col * (1.0 + hover * 0.35), mask * flick * (0.92 - g * 0.3));
}`;

const beamFrag = /* glsl */ `
uniform vec3 tint; uniform float time; varying vec2 vUv;
void main() {
  float a = (1.0 - vUv.y) * 0.22 * (0.85 + 0.15 * sin(vUv.y * 40.0 - time * 6.0));
  gl_FragColor = vec4(tint, a);
}`;

/** canvas → texture ข้อความ (รองรับไทย) */
function textTexture(lines: { text: string; size: number; weight: number; color: string }[], w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const total = lines.reduce((s, l) => s + l.size * 1.25, 0);
  let y = (h - total) / 2;
  for (const l of lines) {
    ctx.font = `${l.weight} ${l.size}px "Orbitron", "Noto Sans Thai", sans-serif`;
    ctx.fillStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 12;
    ctx.fillText(l.text, w / 2, y + (l.size * 1.25) / 2, w - 24);
    y += l.size * 1.25;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function chipTexture(text: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(10,10,24,0.55)";
  ctx.beginPath();
  ctx.roundRect(4, 6, 248, 52, 26);
  ctx.fill();
  ctx.stroke();
  ctx.font = `600 26px "Orbitron", "Noto Sans Thai", sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 33, 224);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** สัญลักษณ์งาน: คลาวด์ (DevOps) · </> (Frontend) · ฐานข้อมูล (Backend) */
function iconTexture(icon: NonNullable<Member["icon"]>, color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  if (icon === "code") {
    ctx.font = `800 64px "Orbitron", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", 64, 66);
  } else if (icon === "cloud") {
    ctx.beginPath();
    ctx.arc(44, 66, 20, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(64, 46, 24, Math.PI, Math.PI * 1.85);
    ctx.arc(88, 62, 18, Math.PI * 1.4, Math.PI * 0.5);
    ctx.closePath();
    ctx.stroke();
    // ลูกศร deploy ขึ้นคลาวด์
    ctx.beginPath();
    ctx.moveTo(64, 112);
    ctx.lineTo(64, 76);
    ctx.moveTo(52, 88);
    ctx.lineTo(64, 76);
    ctx.lineTo(76, 88);
    ctx.stroke();
  } else {
    for (const y of [34, 64, 94]) {
      ctx.beginPath();
      ctx.ellipse(64, y, 34, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(30, 34);
    ctx.lineTo(30, 94);
    ctx.moveTo(98, 34);
    ctx.lineTo(98, 94);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;

function Projector({ member, color, x }: { member: Member; color: string; x: number }) {
  const p = usePick();
  const openPanel = useWorld((s) => s.openPanel);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const orbit = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  const tint = useMemo(() => new THREE.Color(color), [color]);

  const photo = useMemo(() => {
    if (!member.photo) return null;
    const t = new THREE.TextureLoader().load(member.photo);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [member.photo]);
  const photoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { map: { value: photo }, tint: { value: tint }, time: { value: 0 }, seed: { value: seed }, hover: { value: 0 } },
        vertexShader: photoVert,
        fragmentShader: photoFrag,
        ...additive,
      }),
    [photo, tint, seed],
  );
  const beamMat = useMemo(
    () => new THREE.ShaderMaterial({ uniforms: { tint: { value: tint }, time: { value: 0 } }, vertexShader: photoVert, fragmentShader: beamFrag, side: THREE.DoubleSide, ...additive }),
    [tint],
  );
  // ชื่อเล่นอยู่หน้า " — " (เช่น "สกาย (Sky) — ชื่อจริง")
  const nick = p(member.name).split(" — ")[0];
  const label = useMemo(
    () => textTexture([{ text: nick, size: 40, weight: 800, color }, { text: p(member.role), size: 26, weight: 500, color: "#e9e6ff" }], 512, 128),
    [nick, member.role, color, p],
  );
  const icon = useMemo(() => (member.icon ? iconTexture(member.icon, color) : null), [member.icon, color]);
  const chips = useMemo(() => member.skills.slice(0, MAX_CHIPS).map((s) => chipTexture(p(s), color)), [member.skills, color, p]);
  useEffect(() => () => [photo, label, icon, ...chips].forEach((t) => t?.dispose()), [photo, label, icon, chips]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    photoMat.uniforms.time.value = t;
    beamMat.uniforms.time.value = t;
    photoMat.uniforms.hover.value = THREE.MathUtils.damp(photoMat.uniforms.hover.value, hovered ? 1 : 0, 8, dt);
    if (orbit.current) orbit.current.rotation.y = t * 0.35 + seed;
  });

  const open = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    sfx.play("panelOpen");
    openPanel({ kind: "member", id: member.id });
  };

  return (
    <group position={[x, 0, HOLO_ROW_Z]}>
      {/* แท่นฉาย */}
      <mesh position={[0, PEDESTAL_H / 2, 0]}>
        <cylinderGeometry args={[0.42, 0.5, PEDESTAL_H, 32]} />
        <meshStandardMaterial color="#14141f" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, PEDESTAL_H + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, PEDESTAL_H * 0.35, 0]}>
        <torusGeometry args={[0.47, 0.012, 8, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* ป้ายชื่อหน้าแท่น */}
      <mesh position={[0, PEDESTAL_H * 0.62, 0.5]}>
        <planeGeometry args={[0.9, 0.225]} />
        <meshBasicMaterial map={label} {...additive} />
      </mesh>
      {/* ลำแสงฉายขึ้น */}
      <mesh position={[0, PEDESTAL_H + 0.3, 0]} material={beamMat}>
        <cylinderGeometry args={[0.62, 0.36, 0.6, 32, 1, true]} />
      </mesh>
      {/* ภาพโฮโลแกรม: หันหาผู้ชมเสมอ */}
      <Billboard position={[0, PHOTO_Y, 0]} lockX lockZ>
        {photo && (
          <mesh
            material={photoMat}
            onClick={open}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
            }}
            onPointerOut={() => setHovered(false)}
          >
            <planeGeometry args={[PHOTO_W, PHOTO_H]} />
          </mesh>
        )}
        {icon && (
          <mesh position={[PHOTO_W * 0.42, PHOTO_H * 0.38, 0.05]}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial map={icon} {...additive} />
          </mesh>
        )}
      </Billboard>
      {/* ชิปทักษะจริงหมุนรอบตัว */}
      <group ref={orbit}>
        {chips.map((tex, i) => {
          const a = (i / chips.length) * Math.PI * 2;
          return (
            <Billboard key={i} position={[Math.cos(a) * ORBIT_R, PEDESTAL_H + 0.75 + (i % 3) * 0.45, Math.sin(a) * ORBIT_R]}>
              <mesh>
                <planeGeometry args={[0.5, 0.125]} />
                <meshBasicMaterial map={tex} {...additive} opacity={0.9} />
              </mesh>
            </Billboard>
          );
        })}
      </group>
    </group>
  );
}

export function MemberHolograms({ fallbackColor }: { fallbackColor: string }) {
  const members = usePortfolio((s) => s.data.members);
  const shown = members.filter((m) => m.photo);
  return (
    <group>
      {shown.map((m, i) => (
        <Projector key={m.id} member={m} color={m.accent ?? fallbackColor} x={(i - (shown.length - 1) / 2) * HOLO_SPACING} />
      ))}
    </group>
  );
}
