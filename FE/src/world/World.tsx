// ฉาก 3D ทั้งหมด (Canvas เดียว) — เรนเดอร์เฉพาะพื้นที่ที่อยู่ และพื้นที่ต้นทาง/ปลายทางตอนเดินทาง

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { DepthOfFieldEffect } from "postprocessing";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { flickerProbeEnabled, installFlickerProbe } from "../debug/flickerProbe";
import { perfProbeEnabled, installPerfProbe } from "../debug/perfProbe";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { MascotFocus } from "./fx/MascotFocus";
import { LightBudget, applyLightBudget } from "./fx/LightBudgetRig";
import * as THREE from "three";
import type { DistrictId } from "../types";
import { COLORS } from "../config/theme";
import { DISTRICTS } from "../config/districts";
import { CAMERA_FOV } from "../config/camera";
import { useWorld } from "../store/useWorld";
import { CameraRig } from "./CameraRig";
import { fxEnabled } from "./fx/fxEnabled";
import { dofBokeh, FOG_NEAR } from "./fx/dofPolicy";
import { VIEWPOINTS } from "../config/viewpoints";
import { ViewpointMarkers } from "./ViewpointMarkers";
import { StreetKit } from "./street/StreetKit";
import { ElevatorScene } from "./travel/ElevatorScene";
import { Mascot } from "./ai/Mascot";
import { DataFragments } from "./DataFragment";
import { Environment } from "./Environment";
import { GateDistrict } from "./districts/GateDistrict";
import { NexusDistrict } from "./districts/NexusDistrict";
import { ProjectsDistrict } from "./districts/ProjectsDistrict";
import { TeamDistrict } from "./districts/TeamDistrict";
import { SanctuaryDistrict } from "./districts/SanctuaryDistrict";

const SCENES: Record<DistrictId, () => ReactNode> = {
  gate: () => <GateDistrict />,
  nexus: () => <NexusDistrict />,
  projects: () => <ProjectsDistrict />,
  team: () => <TeamDistrict />,
  sanctuary: () => <SanctuaryDistrict />,
};

export function World() {
  const quality = useWorld((s) => s.quality);
  const autoLowerQuality = useWorld((s) => s.autoLowerQuality);
  const high = quality === "high";
  const fx = fxEnabled(quality);
  const dof = useRef<DepthOfFieldEffect>(null);
  // ปิดเบลอตอนมุมกว้าง / เดินทาง / ยืนสะพาน เพื่อให้ตึกไกลคม
  const traveling = useWorld((s) => s.travel !== null);
  const vp = useWorld((s) => VIEWPOINTS[s.district]?.[s.viewpoint]);
  const bokeh = dofBokeh({ enabled: fx.dof, mode: vp?.mode ?? "eye", traveling, viewpointId: vp?.id });

  return (
    <Canvas
      className="world-canvas"
      // ฉากนี้ติดที่ fill-rate: ล็อก dpr = 1 ทั้งสองโหมด (วัดแล้ว projects 42 -> 62 fps)
      dpr={[1, 1]}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 500, position: DISTRICTS.gate.camera.position }}
      gl={{ antialias: !high, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={["#120c2a", FOG_NEAR, 230]} />
      {high && <PerformanceMonitor onDecline={autoLowerQuality} />}
      <Suspense fallback={null}>
        <Environment />
        <StreetKit />
        <ActiveDistricts />
        <ViewpointMarkers />
        <TravelScenes />
        <IntroMascot />
        <DataFragments />
        <ShaderWarmup />
      </Suspense>
      <LightBudget />
      <CameraRig />
      {flickerProbeEnabled() && <FlickerProbe />}
      {perfProbeEnabled() && <PerfProbe />}
      {/* multisampling ต้องเป็น 0: MSAA ใน composer ทำให้ภาพดำเป็นช่วง ๆ (กะพริบ) บนการ์ดจอบางรุ่น */}
      {fx.bloom && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.42} luminanceSmoothing={0.25} />
          {/* ปรับสี: ดำลึก + คอนทราสต์ (ไม่ใช้ HueSaturation: บนฉากนี้ทำให้ผนังตึกขาวโพลน) */}
          <BrightnessContrast brightness={-0.03} contrast={fx.grading ? 0.16 : 0} />
          {/* ระยะชัดตื้นเบา ๆ โฟกัสที่ระยะตัวจิ๋ว */}
          <DepthOfField ref={dof} worldFocusDistance={6} worldFocusRange={14} bokehScale={bokeh} />
          <Vignette eskil={false} offset={0.15} darkness={0.85} />
        </EffectComposer>
      )}
      {fx.dof && <MascotFocus target={dof} />}
    </Canvas>
  );
}

function ActiveDistricts() {
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  const ids = new Set<DistrictId>([district]);
  if (travel) {
    ids.add(travel.from);
    ids.add(travel.to);
    // ทุกการเดินทางผ่านสี่แยก
    ids.add("nexus");
  }
  return (
    <>
      {[...ids].map((id) => (
        <group key={id}>{SCENES[id]()}</group>
      ))}
    </>
  );
}

/**
 * คอมไพล์ shader ของทุกเขต + ลิฟต์ล่วงหน้าตอนโหลด แล้วถอดออก
 * ไม่งั้นครั้งแรกที่ไปแต่ละเขต three ต้อง compile โปรแกรมใหม่ 5–36 ตัวกลางการเดินทาง (ภาพค้าง 0.2–2 วินาที)
 * - ซ่อนไว้ทั้งกลุ่ม เปิดให้เห็นเฉพาะตอน compile (ไฟของกลุ่มนี้ปิดไว้ จำนวนไฟจึงเท่างบเดิม)
 * - dispose={null}: ไม่ dispose material ตอนถอด → three ไม่ปล่อยโปรแกรม ไปเขตจริงแล้วใช้ต่อได้ทันที
 */
function ShaderWarmup() {
  const [done, setDone] = useState(false);
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const start = performance.now();
    const run = () => {
      const g = group.current;
      // รอ HDRI ก่อน (shader ที่มี/ไม่มี envMap เป็นคนละตัว) แต่ไม่เกิน 6 วินาที
      if (!g || (!scene.environment && performance.now() - start < 6000)) {
        raf = requestAnimationFrame(run);
        return;
      }
      g.visible = true;
      const lights: THREE.Object3D[] = [];
      g.traverse((o) => {
        if ((o as THREE.Light).isLight && o.visible) {
          o.visible = false;
          lights.push(o);
        }
      });
      applyLightBudget(scene, camera);
      // มี EffectComposer = ฉากถูกวาดลง render target (ไม่มี tone mapping ใน shader) → compile ให้ตรงกัน
      const composer = fxEnabled(useWorld.getState().quality).bloom;
      const target = composer ? new THREE.WebGLRenderTarget(1, 1) : null;
      const prev = gl.getRenderTarget();
      let pending: Promise<unknown> = Promise.resolve();
      gl.setRenderTarget(target);
      try {
        pending = gl.compileAsync(scene, camera);
      } finally {
        gl.setRenderTarget(prev);
        target?.dispose();
        g.visible = false;
        lights.forEach((o) => (o.visible = true));
      }
      pending.catch(() => undefined).then(() => !cancelled && setDone(true));
    };
    raf = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera]);

  if (done) return null;
  return (
    <group ref={group} visible={false} dispose={null}>
      {(Object.keys(SCENES) as DistrictId[]).map((id) => (
        <group key={id}>{SCENES[id]()}</group>
      ))}
      <ElevatorScene />
    </group>
  );
}

/** ฉากลิฟต์ (เฉพาะตอนไป/ออกจาก Team HQ) */
function TravelScenes() {
  const travel = useWorld((s) => s.travel);
  const kind = useWorld((s) => s.travelKind);
  return kind === "guide" && (travel?.to === "team" || travel?.from === "team") ? <ElevatorScene /> : null;
}

/** ตัวจิ๋ว: เดินใน Intro แล้วนำทางทุกการเดินทาง (ซ่อนตัวเองเมื่อแปลงร่างเป็น AI แล้ว) */
function IntroMascot() {
  return <Mascot />;
}

/** ?debug=flicker (โหมดพัฒนาเท่านั้น): ผูก window.__flickerProbe() */
function FlickerProbe() {
  const get = useThree((s) => s.get);
  useEffect(() => installFlickerProbe(() => get()), [get]);
  return null;
}

/** ?debug=perf (โหมดพัฒนาเท่านั้น): ผูก window.__perf() เฉลี่ย 60 เฟรม */
function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const probe = useRef<ReturnType<typeof installPerfProbe> | null>(null);
  useEffect(() => {
    probe.current = installPerfProbe(gl);
    return () => {
      probe.current?.dispose();
      probe.current = null;
    };
  }, [gl]);
  // ใช้ priority ปริยาย (0) เพื่อไม่ปิด auto-render ของ R3F; อ่านค่า gl.info ของเฟรมก่อนหน้าแล้วรีเซ็ต (ตัวเลขช้าไปหนึ่งเฟรม)
  useFrame((_, dt) => probe.current?.tick(dt));
  return null;
}
