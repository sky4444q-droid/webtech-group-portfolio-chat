// เครื่องมือตรวจภาพกะพริบ (เฉพาะโหมดพัฒนา + ?debug=flicker): เรนเดอร์ฉากลง HalfFloat render target 8 ครั้ง
// แล้วนับพิกเซลที่เป็น NaN/Inf — ต้นเหตุของเฟรมดำทั้งจอเมื่อผ่าน Bloom

import * as THREE from "three";

export interface FlickerResult {
  frames: number;
  badPixels: number;
}

const FRAMES = 8;
const SIZE = 256;

export function flickerProbeEnabled(): boolean {
  return import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "flicker";
}

/** ผูก window.__flickerProbe เข้ากับ renderer/ฉาก/กล้องปัจจุบัน คืนฟังก์ชันถอดออก */
export function installFlickerProbe(get: () => { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }): () => void {
  const w = window as unknown as { __flickerProbe?: () => Promise<FlickerResult> };
  w.__flickerProbe = async () => {
    const { gl, scene, camera } = get();
    const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.HalfFloatType });
    const buf = new Uint16Array(SIZE * SIZE * 4);
    let bad = 0;
    const prev = gl.getRenderTarget();
    try {
      for (let f = 0; f < FRAMES; f++) {
        await new Promise((r) => requestAnimationFrame(r));
        gl.setRenderTarget(target);
        gl.render(scene, camera);
        gl.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, buf);
        for (let i = 0; i < buf.length; i++) {
          // half float: exponent ทั้งหมดเป็น 1 = Inf หรือ NaN
          if ((buf[i] & 0x7c00) === 0x7c00) bad++;
        }
      }
    } finally {
      gl.setRenderTarget(prev);
      target.dispose();
    }
    return { frames: FRAMES, badPixels: bad };
  };
  return () => {
    delete w.__flickerProbe;
  };
}
