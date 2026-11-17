// ฟ้าแคบเหนือถนน: เกือบดำ มีแสงเมืองสะท้อนเมฆจาง ๆ ใกล้ขอบฟ้า (แทนดาว)

import { useMemo } from "react";
import * as THREE from "three";

export function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {},
        vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 glow = vec3(0.03, 0.045, 0.07); // หมอกฟ้าจาง ๆ ไกล ๆ (ไม่ติดม่วง)
            vec3 top = vec3(0.008, 0.008, 0.014);
            gl_FragColor = vec4(mix(glow, top, pow(h, 0.45)), 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[300, 24, 12]} />
    </mesh>
  );
}
