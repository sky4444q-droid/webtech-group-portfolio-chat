// ควบคุมกล้องทั้งหมด: Intro, การเดินทาง 5 แบบ (บิน/เดิน/ลิฟต์/Portal/จาง), จุดชม + หันตามเมาส์, ซูมดูผลงาน

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, type Vec3 } from "../config/districts";
import { INTRO_MS, WALK_PRE_MS } from "../config/timing";
import { usePortfolio } from "../store/usePortfolio";
import { useWorld } from "../store/useWorld";
import { showcaseCamera } from "./layout";
import { viewpointWorld } from "../config/viewpoints";
import { walkPath, type WalkPlan } from "./travel/paths";
import { elevatorCamera, elevatorDoors } from "./travel/ElevatorScene";
import { tripDuration } from "./travel/tripDurations";
import type { TravelKind } from "./travel/kind";
import * as sfx from "../audio/sfx";
import { introCamera } from "./intro/introPath";
import { prefersReducedMotion } from "./travel/kind";

const v = (p: Vec3) => new THREE.Vector3(...p);
const UP = new THREE.Vector3(0, 1, 0);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
/** ช่วงย่อยของ progress: a..b → 0..1 */
const span = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));


/** ประตูหน้าล็อบบี้ Team HQ — ออกจากล็อบบี้ต้องถอยออกทางนี้ก่อนบิน */
const TEAM_DOOR = v([DISTRICTS.team.position[0], 1.9, DISTRICTS.team.position[2] + 14]);

interface Trip {
  start: number;
  kind: TravelKind;
  duration: number;
  fromPos: THREE.Vector3;
  fromLook: THREE.Vector3;
  walk: WalkPlan | null;
  steps: number;
  cues: Set<string>;
}

export function CameraRig() {
  const lookAt = useRef(v(introCamera(0).target));
  const introStart = useRef<number | null>(null);
  const trip = useRef<Trip | null>(null);
  const pos = useRef(new THREE.Vector3()).current;
  const look = useRef(new THREE.Vector3()).current;
  const dir = useRef(new THREE.Vector3()).current;
  const tmp = useRef(new THREE.Vector3()).current;

  useFrame(({ camera, pointer }, delta) => {
    const s = useWorld.getState();
    const now = performance.now();

    // 1) Intro
    if (!s.introDone) {
      if (introStart.current === null) introStart.current = now;
      // ซอย Arrival Alley: กล้องเดินตามหลังตัวจิ๋ว (ลดการเคลื่อนไหว → ภาพนิ่งปลายทาง)
      const k = prefersReducedMotion() ? 1 : Math.min(1, (now - introStart.current) / INTRO_MS);
      const cam = introCamera(k);
      pos.set(...cam.position);
      pos.y += Math.sin(now / 260) * 0.03 * (1 - k);
      look.set(...cam.target);
      camera.position.copy(pos);
      lookAt.current.copy(look);
      camera.lookAt(lookAt.current);
      return;
    }

    // 2) เดินทาง
    if (s.travel) {
      if (!trip.current) {
        const kind = s.travelKind ?? "fly";
        const walk = kind === "walk" ? walkPath(s.travel.from, s.travel.to) : null;
        trip.current = {
          start: now,
          kind,
          duration: tripDuration(kind, !!walk?.pre),
          fromPos: camera.position.clone(),
          fromLook: lookAt.current.clone(),
          walk,
          steps: 0,
          cues: new Set(),
        };
      }
      const tr = trip.current;
      const cue = (name: string, fn: () => void) => {
        if (!tr.cues.has(name)) {
          tr.cues.add(name);
          fn();
        }
      };
      let k = Math.min(1, (now - tr.start) / tr.duration);
      if (s.skipRequested) k = 1;
      const dest = viewpointWorld(s.travel.to, 0);

      if (tr.kind === "walk" && tr.walk) {
        const preK = tr.walk.pre ? WALK_PRE_MS / tr.duration : 0;
        if (tr.walk.pre && k < preK) {
          // บินไปต้นถนนก่อน
          const e = easeInOut(k / preK);
          pos.lerpVectors(tr.fromPos, tr.walk.pre, e);
          pos.y += Math.sin((k / preK) * Math.PI) * 18;
          look.lerpVectors(tr.fromLook, tr.walk.walk.getPointAt(0.05), e);
          cue("whoosh", () => sfx.play("whoosh"));
        } else {
          const wk = span(k, preK, 1);
          const e = THREE.MathUtils.smootherstep(wk, 0, 1);
          tr.walk.walk.getPointAt(e, pos);
          tr.walk.walk.getPointAt(Math.min(1, e + 0.05), look);
          look.y = pos.y - 0.05;
          // ก้าวเดิน: โยกขึ้นลงตามจังหวะก้าว
          const stride = e * tr.walk.walk.getLength() / 1.4;
          pos.y += Math.abs(Math.sin(stride * Math.PI)) * 0.07;
          const step = Math.floor(stride);
          if (step > tr.steps && wk < 0.98) {
            tr.steps = step;
            sfx.play("step");
          }
          if (wk < 0.08) {
            // ช่วงแรก: หันจากมุมเดิมเข้าหาทางเดินนุ่ม ๆ
            look.lerpVectors(tr.fromLook, look, wk / 0.08);
          }
        }
      } else if (tr.kind === "elevator") {
        // ดำ → อยู่ในลิฟต์ ประตูปิด → ลิฟต์ขึ้น → ดำ → ล็อบบี้
        if (k < 0.15) {
          pos.copy(camera.position);
          look.copy(lookAt.current);
          cue("door1", () => sfx.play("elevatorDoor"));
        } else if (k < 0.85) {
          elevatorDoors.current = k < 0.3 ? 1 - span(k, 0.18, 0.3) : k > 0.75 ? span(k, 0.75, 0.83) : 0;
          elevatorCamera(easeInOut(span(k, 0.3, 0.78)), pos, look);
          cue("run", () => sfx.play("elevatorRun"));
          if (k > 0.75) cue("ding", () => sfx.play("ding"));
        } else {
          // ออกจากลิฟต์เข้าล็อบบี้
          const e = easeInOut(span(k, 0.85, 1));
          pos.set(...dest.position).add(tmp.set(0, 0, 2.5 * (1 - e)));
          look.set(...dest.target);
        }
      } else if (tr.kind === "portal") {
        // พุ่งเข้าประตู → อุโมงค์แสง → โผล่ออกที่ปลายทาง
        if (k < 0.5) {
          const e = easeInOut(span(k, 0, 0.45));
          dir.subVectors(tr.fromLook, tr.fromPos).normalize();
          pos.copy(tr.fromPos).addScaledVector(dir, e * 9);
          look.copy(tr.fromLook);
          cue("portal", () => sfx.play("portal"));
        } else {
          const e = easeInOut(span(k, 0.55, 1));
          dir.subVectors(v(dest.target), v(dest.position)).normalize();
          pos.set(...dest.position).addScaledVector(dir, -6 * (1 - e));
          look.set(...dest.target);
        }
      } else if (tr.kind === "fade") {
        if (k < 0.5) {
          pos.copy(camera.position);
          look.copy(lookAt.current);
        } else {
          pos.set(...dest.position);
          look.set(...dest.target);
        }
      } else {
        // บิน — ออกจากล็อบบี้ Team HQ ทางประตูก่อน
        let from = tr.fromPos;
        let fk = k;
        if (s.travel.from === "team") {
          if (k < 0.25) {
            const e = easeInOut(k / 0.25);
            pos.lerpVectors(tr.fromPos, TEAM_DOOR, e);
            look.lerpVectors(tr.fromLook, tmp.copy(TEAM_DOOR).add(dir.set(0, 0, 10)), e);
            camera.position.copy(pos);
            lookAt.current.copy(look);
            camera.lookAt(lookAt.current);
            return;
          }
          from = TEAM_DOOR;
          fk = (k - 0.25) / 0.75;
        }
        const e = easeInOut(fk);
        cue("whoosh", () => sfx.play("whoosh"));
        pos.lerpVectors(from, v(dest.position), e);
        pos.y += Math.sin(fk * Math.PI) * 22; // โค้งขึ้นเหนือเมือง
        look.lerpVectors(tr.fromLook, v(dest.target), e);
      }

      camera.position.copy(pos);
      lookAt.current.copy(look);
      camera.lookAt(lookAt.current);
      if (k >= 1) {
        trip.current = null;
        elevatorDoors.current = 1;
        s.finishTravel();
      }
      return;
    }
    trip.current = null;

    // 3) อยู่กับที่: จุดชม หรือท่าซูมดูผลงาน
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
