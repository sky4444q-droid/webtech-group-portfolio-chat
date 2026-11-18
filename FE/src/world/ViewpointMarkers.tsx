// วงแหวนเรืองแสงของจุดชมในพื้นที่ปัจจุบัน — ชี้แล้วเห็นชื่อจุด คลิกแล้วกล้องเลื่อนไป

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { VIEWPOINTS } from "../config/viewpoints";
import { DISTRICTS } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { useAi } from "../store/useAi";
import { useT } from "../i18n";
import * as sfx from "../audio/sfx";

export function ViewpointMarkers() {
  const district = useWorld((s) => s.district);
  const viewpoint = useWorld((s) => s.viewpoint);
  const travel = useWorld((s) => s.travel);
  const introDone = useWorld((s) => s.introDone);
  const panel = useWorld((s) => s.panel);
  if (!introDone || travel || panel) return null;
  const cfg = DISTRICTS[district];
  return (
    <group position={cfg.position}>
      {VIEWPOINTS[district].map((vp, i) =>
        i === viewpoint ? null : <Marker key={vp.id} index={i} position={vp.marker} label={vp.label} color={cfg.color} />,
      )}
    </group>
  );
}

function Marker({ index, position, label, color }: { index: number; position: [number, number, number]; label: Parameters<ReturnType<typeof useT>>[0]; color: string }) {
  const tr = useT();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (ring.current) {
      const s = (hovered ? 1.25 : 1) + Math.sin(t * 3 + index) * 0.06;
      ring.current.scale.setScalar(THREE.MathUtils.damp(ring.current.scale.x, s, 8, dt));
      ring.current.rotation.z += dt * 0.8;
    }
    if (beam.current) beam.current.opacity = THREE.MathUtils.damp(beam.current.opacity, hovered ? 0.35 : 0.12, 6, dt);
  });

  return (
    <group position={position}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          useAi.getState().noticeHover();
          sfx.play("hover");
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          sfx.play("click");
          useWorld.getState().goToViewpoint(index);
        }}
      >
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.75, 6]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.55, 0.7, 1.8, 6, 1, true]} />
          <meshBasicMaterial ref={beam} color={color} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        {/* พื้นที่คลิกให้ใหญ่พอ */}
        <mesh position={[0, 0.9, 0]} visible={false}>
          <cylinderGeometry args={[1, 1, 2, 8]} />
        </mesh>
      </group>
      {hovered && (
        <Html position={[0, 2.3, 0]} center distanceFactor={10} zIndexRange={[20, 0]}>
          <div className="vp-label">{tr(label)}</div>
        </Html>
      )}
    </group>
  );
}
