// ฉาก 3D ทั้งหมด (Canvas เดียว) — เรนเดอร์เฉพาะพื้นที่ที่อยู่ และพื้นที่ต้นทาง/ปลายทางตอนเดินทาง

import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { DistrictId } from "../types";
import { COLORS } from "../config/theme";
import { DISTRICTS } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { CameraRig } from "./CameraRig";
import { fxEnabled } from "./fx/fxEnabled";
import { ViewpointMarkers } from "./ViewpointMarkers";
import { GalleryAvenue } from "./travel/GalleryAvenue";
import { ElevatorScene } from "./travel/ElevatorScene";
import { Mascot } from "./ai/Mascot";
import { useAi } from "../store/useAi";
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
  const setQuality = useWorld((s) => s.setQuality);
  const high = quality === "high";

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
      <fog attach="fog" args={[COLORS.fog, 30, 170]} />
      {high && <PerformanceMonitor onDecline={() => setQuality("low")} />}
      <Suspense fallback={null}>
        <Environment />
        <ActiveDistricts />
        <ViewpointMarkers />
        <TravelScenes />
        <IntroMascot />
      </Suspense>
      <CameraRig />
      {fxEnabled(quality).bloom && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.35} luminanceSmoothing={0.25} />
          <Vignette eskil={false} offset={0.15} darkness={0.85} />
        </EffectComposer>
      )}
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
  }
  return (
    <>
      {[...ids].map((id) => (
        <group key={id}>{SCENES[id]()}</group>
      ))}
    </>
  );
}

/** ฉากของการเดินทาง: ถนน Gallery Avenue (เห็นจาก Nexus/Projects หรือตอนเดิน) และตู้ลิฟต์ (เฉพาะตอนนั่งลิฟต์) */
function TravelScenes() {
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  const kind = useWorld((s) => s.travelKind);
  const touches = (d: DistrictId) => district === d || travel?.from === d || travel?.to === d;
  return (
    <>
      {(touches("nexus") || touches("projects")) && <GalleryAvenue />}
      {kind === "elevator" && <ElevatorScene />}
    </>
  );
}

function IntroMascot() {
  const phase = useAi((s) => s.mascotPhase);
  return phase === "gone" ? null : <Mascot />;
}
