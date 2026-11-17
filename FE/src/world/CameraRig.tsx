// ควบคุมกล้องทั้งหมด: Intro, การเดินทาง (ตัวจิ๋วเดินนำ / จางภาพ), จุดชม + หันตามเมาส์, ซูมดูผลงาน

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "../config/districts";
import type { DistrictId } from "../types";
import { INTRO_MS } from "../config/timing";
import { usePortfolio } from "../store/usePortfolio";
import { useWorld } from "../store/useWorld";
import { showcaseCamera } from "./layout";
import { teamHoloCamera, viewpointWorld } from "../config/viewpoints";
import { guideAt, planGuideTrip, type GuidePlan } from "./travel/guideTrip";
import { guideState } from "./travel/guideState";
import { mascotAt } from "./intro/introPath";
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


interface Trip {
  start: number;
  kind: TravelKind;
  duration: number;
  fromPos: THREE.Vector3;
  fromLook: THREE.Vector3;
  plan: GuidePlan | null;
  steps: number;
  cues: Set<string>;
}

/** หลังถึงที่หมาย: ตัวจิ๋วยืนรอเฉพาะที่ Gate (ที่อื่นแปลงร่างเป็น AI แล้ว) */
function settleGuide(at: DistrictId) {
  guideState.from = null;
  guideState.to = null;
  guideState.walking = false;
  guideState.aiFrom = 1;
  guideState.aiTo = 1;
  guideState.visible = at === "gate";
  if (at === "gate") {
    guideState.mascot.set(...mascotAt(1).position);
    guideState.heading = -Math.PI / 2; // หันหน้าออกไปทางซุ้มประตู (หาผู้ชม)
  }
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
        const kind = s.travelKind ?? "guide";
        const plan = kind === "guide" ? planGuideTrip(s.travel.from, s.travel.to) : null;
        trip.current = {
          start: now,
          kind,
          duration: plan ? plan.totalMs : tripDuration(kind, s.travel.from, s.travel.to),
          fromPos: camera.position.clone(),
          fromLook: lookAt.current.clone(),
          plan,
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
      const ms = s.skipRequested ? tr.duration : now - tr.start;
      const k = Math.min(1, ms / tr.duration);
      const dest = viewpointWorld(s.travel.to, 0);
      const toTeam = s.travel.to === "team";
      const fromTeam = s.travel.from === "team";

      if (tr.plan) {
        const g = guideAt(tr.plan, ms);
        guideState.from = s.travel.from;
        guideState.to = s.travel.to;
        guideState.mascot.set(...g.mascot);
        guideState.heading = g.heading;
        guideState.walking = g.segment === "walk";
        guideState.aiFrom = g.aiFrom;
        guideState.aiTo = g.aiTo;
        // ออกจากล็อบบี้: ตัวจิ๋วยังไม่โผล่จนลงลิฟต์ถึงถนน · ไป Team: แปลงร่างในล็อบบี้ (AI โผล่ ไม่ต้องเห็นตัวจิ๋ว)
        guideState.visible = g.mascotVisible && !(fromTeam && g.segment === "shrink") && !(toTeam && g.segment === "morph");
        const gk = g.k;

        if (g.segment === "shrink") {
          if (fromTeam) {
            pos.copy(tr.fromPos);
            look.copy(tr.fromLook);
          } else {
            const e = easeInOut(gk);
            pos.lerpVectors(tr.fromPos, tmp.set(...g.camera!.position), e);
            look.lerpVectors(tr.fromLook, dir.set(...g.camera!.target), e);
          }
        } else if (g.segment === "elevatorUp" || g.segment === "elevatorDown") {
          // ประตูปิด → ลิฟต์วิ่ง → ประตูเปิด
          elevatorDoors.current = gk < 0.2 ? 1 - span(gk, 0.05, 0.2) : gk > 0.8 ? span(gk, 0.8, 0.95) : 0;
          const run = easeInOut(span(gk, 0.2, 0.8));
          elevatorCamera(g.segment === "elevatorUp" ? run : 1 - run, pos, look);
          cue(`door-${g.segment}`, () => sfx.play("elevatorDoor"));
          if (gk > 0.2) cue(`run-${g.segment}`, () => sfx.play("elevatorRun"));
          if (gk > 0.78) cue(`ding-${g.segment}`, () => sfx.play("ding"));
        } else if (g.segment === "walk") {
          pos.set(...g.camera!.position);
          look.set(...g.camera!.target);
          // ก้าวเดิน: โยกเบา ๆ และเสียงฝีเท้าตามก้าวของตัวจิ๋ว
          const stride = (ms / 1000) * 2.6;
          pos.y += Math.abs(Math.sin(stride * Math.PI)) * 0.05;
          const step = Math.floor(stride);
          if (step > tr.steps) {
            tr.steps = step;
            sfx.play("step");
          }
          // ช่วงแรกของการเดิน (ไม่มีช่วงหดตัวก่อน เช่นออกจาก Gate): ไหลจากมุมเดิมนุ่ม ๆ
          if (tr.plan.segments[0].kind === "walk" && gk < 0.12) {
            const e = easeInOut(gk / 0.12);
            pos.lerpVectors(tr.fromPos, pos, e);
            look.lerpVectors(tr.fromLook, look, e);
          }
        } else {
          // แปลงร่าง/หันทักทาย: กล้องค่อย ๆ ไปจุดชมแรกของปลายทาง
          cue("morph", () => sfx.play("discover"));
          if (toTeam) {
            pos.set(...dest.position);
            look.set(...dest.target);
          } else {
            const e = easeInOut(gk);
            pos.lerpVectors(tmp.set(...g.camera!.position), v(dest.position), e);
            look.lerpVectors(dir.set(...g.camera!.target), v(dest.target), e);
          }
        }
      } else {
        // จางภาพ: ครึ่งแรกอยู่ที่เดิม ครึ่งหลังอยู่ปลายทาง
        if (k < 0.5) {
          pos.copy(camera.position);
          look.copy(lookAt.current);
        } else {
          pos.set(...dest.position);
          look.set(...dest.target);
        }
      }

      camera.position.copy(pos);
      lookAt.current.copy(look);
      camera.lookAt(lookAt.current);
      if (k >= 1) {
        trip.current = null;
        elevatorDoors.current = 1;
        settleGuide(s.travel.to);
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
    // การ์ดทีมเปิดอยู่: ถอยกล้องให้เห็นการ์ดทั้งใบ และหยุดหันตามเมาส์ (ไม่งั้นการ์ดถูกเหวี่ยงไปข้าง ๆ ตอนเลื่อนเมาส์ไปกด)
    if (s.panel?.kind === "team" && s.panel.display === "holo" && s.district === "team") {
      pose = teamHoloCamera();
      parallax = 0.15;
      eye = false;
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
