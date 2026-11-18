// หอ Energy Core: หอทรงเรียวสูง ~130 ม. (ย่อให้แกนอยู่ในกรอบมุมแรก) วงแหวนไฟ 3 ชั้น แกนพลังงานกลางเต้นม่วง–ชมพู และไฟเตือนแดงบนยอด

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BRAND } from "../../config/brand";
import { ENERGY_CORE_POS, ENERGY_CORE_Y } from "./skylineLayout";

/** ช่วงลำตัว: [y ฐาน, รัศมีล่าง, รัศมีบน, สูง] — เว้นช่องว่าง y 24–40 ให้แกนพลังงานลอยในกรอบหกเหลี่ยม */
const SEGMENTS: [number, number, number, number][] = [
  [0, 10, 7.5, 24],
  [40, 7, 5, 36],
  [76, 5, 2.8, 32],
  [108, 2.8, 0.5, 18],
];
const CORE_Y = ENERGY_CORE_Y;
const RING_YS = [24, 40, 90];
const RING_RS = [8.8, 8.2, 5.2];
const TIP_Y = 126;
const PULSE_PERIOD = 4;
const BEACON_PERIOD = 1.6;

const coreVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const coreFrag = /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform float uT;
varying vec3 vN;
varying vec3 vV;
void main() {
  float k = 0.5 + 0.5 * sin(uT * 6.2831853 / ${PULSE_PERIOD.toFixed(1)});
  vec3 c = mix(uA, uB, k);
  // กลางสว่าง ขอบจางแบบแก้วเรือง
  float f = pow(max(dot(vN, vV), 0.0), 1.5);
  gl_FragColor = vec4(c * (0.6 + 2.4 * f) * (0.8 + 0.4 * k), 1.0);
}`;

export function EnergyCoreTower() {
  const coreMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coreVert,
        fragmentShader: coreFrag,
        uniforms: { uA: { value: new THREE.Color(BRAND.purple) }, uB: { value: new THREE.Color(BRAND.magenta) }, uT: { value: 0 } },
        blending: THREE.AdditiveBlending,
        transparent: true,
        fog: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }), []);
  const beacon = useRef<THREE.MeshBasicMaterial>(null);
  const ringA = useMemo(() => new THREE.Color(BRAND.purple), []);
  const ringB = useMemo(() => new THREE.Color(BRAND.magenta), []);
  const red = useMemo(() => new THREE.Color("#ff2a2a").multiplyScalar(3), []);

  useEffect(() => () => (coreMat.dispose(), ringMat.dispose()), [coreMat, ringMat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    coreMat.uniforms.uT.value = t;
    const k = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / PULSE_PERIOD);
    ringMat.color.copy(ringA).lerp(ringB, k).multiplyScalar(2.2);
    // กะพริบแบบเดียวกับ Beacons ใน StreetKit: ติด 30% ของรอบ
    beacon.current?.color.copy(red).multiplyScalar((t % BEACON_PERIOD) / BEACON_PERIOD < 0.3 ? 1 : 0.08);
  });

  return (
    <group position={ENERGY_CORE_POS}>
      {SEGMENTS.map(([by, rb, rt, h], i) => (
        <mesh key={i} position={[0, by + h / 2, 0]}>
          <cylinderGeometry args={[rt, rb, h, 16]} />
          <meshStandardMaterial color="#14101f" metalness={0.8} roughness={0.35} emissive={BRAND.purple} emissiveIntensity={0.08} envMapIntensity={0} />
        </mesh>
      ))}
      {/* วงแหวนไฟ 3 ชั้น (ใช้ material เดียวกันเปลี่ยนสีตามจังหวะแกน) */}
      {RING_YS.map((ry, i) => (
        <mesh key={ry} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]} material={ringMat}>
          <torusGeometry args={[RING_RS[i], 0.45, 8, 48]} />
        </mesh>
      ))}
      {/* แกนพลังงานในกรอบหกเหลี่ยม */}
      <mesh position={[0, CORE_Y, 0]} material={coreMat}>
        <sphereGeometry args={[6, 32, 24]} />
      </mesh>
      <mesh position={[0, CORE_Y, 0]}>
        <cylinderGeometry args={[8.5, 8.5, 16, 6, 1, true]} />
        <meshBasicMaterial color={BRAND.silver} wireframe toneMapped={false} fog={false} />
      </mesh>
      {/* เสาและไฟเตือนบนยอด */}
      <mesh position={[0, TIP_Y + 2.5, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 5, 6]} />
        <meshStandardMaterial color="#2a2a33" />
      </mesh>
      <mesh position={[0, TIP_Y + 5.4, 0]}>
        <sphereGeometry args={[0.9, 10, 8]} />
        <meshBasicMaterial ref={beacon} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}
