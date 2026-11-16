// วัสดุเรืองแสงที่ขอบ (fresnel) ใช้ร่วมกันในร่าง AI

import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vView)), 2.5);
    float scan = 0.85 + 0.15 * sin(vNormal.y * 30.0 + uTime * 3.0);
    gl_FragColor = vec4(uColor * uIntensity * scan, f * 0.9);
  }
`;

export function fresnelMaterialProps(color: string): THREE.ShaderMaterialParameters {
  return {
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 1.2 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  };
}
