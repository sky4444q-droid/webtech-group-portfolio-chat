// ฉาก 3D ทั้งหมด (Canvas เดียว) — เรนเดอร์เฉพาะพื้นที่ที่อยู่ และพื้นที่ต้นทาง/ปลายทางตอนเดินทาง

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import type { DepthOfFieldEffect } from "postprocessing";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { flickerProbeEnabled, installFlickerProbe } from "../debug/flickerProbe";
import { perfProbeEnabled, installPerfProbe } from "../debug/perfProbe";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { MascotFocus } from "./fx/MascotFocus";
import * as THREE from "three";
import type { DistrictId } from "../types";
import { COLORS } from "../config/theme";
import { DISTRICTS } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { CameraRig } from "./CameraRig";
import { fxEnabled } from "./fx/fxEnabled";
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

  return (
    <Canvas
      className="world-canvas"
      dpr={high ? [1, 2] : [1, 1.25]}
      camera={{ fov: 55, near: 0.1, far: 500, position: DISTRICTS.gate.camera.position }}
      gl={{ antialias: !high, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={["#120c2a", 40, 210]} />
      {high && <PerformanceMonitor onDecline={autoLowerQuality} />}
      <Suspense fallback={null}>
        <Environment />
        <StreetKit />
        <ActiveDistricts />
        <ViewpointMarkers />
        <TravelScenes />
        <IntroMascot />
        <DataFragments />
      </Suspense>
      <CameraRig />
      {flickerProbeEnabled() && <FlickerProbe />}
      {perfProbeEnabled() && <PerfProbe />}
      {/* multisampling ต้องเป็น 0: MSAA ใน composer ทำให้ภาพดำเป็นช่วง ๆ (กะพริบ) บนการ์ดจอบางรุ่น */}
      {fx.bloom && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.35} luminanceSmoothing={0.25} />
          {/* ปรับสี: ดำลึก + คอนทราสต์ (ไม่ใช้ HueSaturation: บนฉากนี้ทำให้ผนังตึกขาวโพลน) */}
          <BrightnessContrast brightness={-0.03} contrast={fx.grading ? 0.16 : 0} />
          {/* ระยะชัดตื้นเบา ๆ โฟกัสที่ระยะตัวจิ๋ว */}
          <DepthOfField ref={dof} worldFocusDistance={6} worldFocusRange={14} bokehScale={fx.dof ? 1.6 : 0} />
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
