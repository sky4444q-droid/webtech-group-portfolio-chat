// ควบคุมกล้องทั้งหมด: Intro แบบ Cinematic, บินระหว่างพื้นที่, ท่าประจำพื้นที่ + ขยับตามเมาส์, ซูมดูผลงาน

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, type Vec3 } from "../config/districts";
import { INTRO_MS, TRAVEL_MS } from "../config/timing";
import { usePortfolio } from "../store/usePortfolio";
import { useWorld } from "../store/useWorld";
import { showcaseCamera } from "./layout";
import { viewpointWorld } from "../config/viewpoints";

const v = (p: Vec3) => new THREE.Vector3(...p);
const UP = new THREE.Vector3(0, 1, 0);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// เส้นทาง Intro: บินลงจากเหนือเมืองเข้าหาประตูทางเข้า
const gate = DISTRICTS.gate;
const INTRO_PATH = new THREE.CatmullRomCurve3([
  v([gate.position[0] - 70, 55, gate.position[2] + 90]),
  v([gate.position[0] - 30, 30, gate.position[2] + 55]),
  v([gate.position[0] - 6, 12, gate.position[2] + 30]),
  v(gate.camera.position),
]);
const INTRO_LOOK_FROM = v([gate.position[0] + 30, 0, gate.position[2]]);

export function CameraRig() {
  const lookAt = useRef(v(DISTRICTS.gate.camera.target));
  const introStart = useRef<number | null>(null);
  const flight = useRef<{ start: number; fromPos: THREE.Vector3; fromLook: THREE.Vector3 } | null>(null);
  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3()).current;

  useFrame(({ camera, pointer }, delta) => {
    const s = useWorld.getState();
    const now = performance.now();
    const pos = tmpPos.current;
    const look = tmpLook.current;

    // 1) Intro
    if (!s.introDone) {
      if (introStart.current === null) introStart.current = now;
      const k = Math.min(1, (now - introStart.current) / INTRO_MS);
      const e = easeInOut(k);
      INTRO_PATH.getPointAt(e, pos);
      look.lerpVectors(INTRO_LOOK_FROM, v(gate.camera.target), e);
      camera.position.copy(pos);
      lookAt.current.copy(look);
      camera.lookAt(lookAt.current);
      return;
    }

    // 2) บินระหว่างพื้นที่
    if (s.travel) {
      if (!flight.current) {
        flight.current = { start: now, fromPos: camera.position.clone(), fromLook: lookAt.current.clone() };
      }
      const f = flight.current;
      const to = viewpointWorld(s.travel.to, 0);
      const k = Math.min(1, (now - f.start) / TRAVEL_MS);
      const e = easeInOut(k);
      pos.lerpVectors(f.fromPos, v(to.position), e);
      pos.y += Math.sin(k * Math.PI) * 22; // โค้งขึ้นเหนือเมือง
      look.lerpVectors(f.fromLook, v(to.target), e);
      camera.position.copy(pos);
      lookAt.current.copy(look);
      camera.lookAt(lookAt.current);
      if (k >= 1) {
        flight.current = null;
        s.finishTravel();
      }
      return;
    }
    flight.current = null;

    // 3) อยู่กับที่: ท่าของพื้นที่ หรือท่าซูมดูผลงาน
    const vp = viewpointWorld(s.district, s.viewpoint);
    let pose: { position: Vec3; target: Vec3 } = vp;
    let parallax = 1;
    let eye = vp.mode === "eye";
    if (s.panel?.kind === "project" && s.district === "projects") {
      const panel = s.panel;
      const projects = usePortfolio.getState().data.projects.slice(0, 3);
      const index = projects.findIndex((p) => p.id === panel.id);
      if (index >= 0) {
        pose = showcaseCamera(index, projects.length);
        parallax = 0.25;
        eye = false;
      }
    }
    pos.set(...pose.position);
    look.set(...pose.target);
    if (eye) {
      // ระดับสายตา: กล้องอยู่กับที่ แต่หันมองตามเมาส์ได้กว้าง
      dir.subVectors(look, pos);
      dir.applyAxisAngle(UP, -pointer.x * vp.lookRange);
      const dist = dir.length();
      look.copy(pos).add(dir);
      look.y += pointer.y * vp.lookRange * 0.5 * dist;
    } else {
      pos.x += pointer.x * 0.9 * parallax;
      pos.y += pointer.y * 0.45 * parallax;
    }

    const a = 1 - Math.exp(-Math.min(delta, 0.1) * 3.2);
    camera.position.lerp(pos, a);
    lookAt.current.lerp(look, a);
    camera.lookAt(lookAt.current);
  });

  return null;
}
