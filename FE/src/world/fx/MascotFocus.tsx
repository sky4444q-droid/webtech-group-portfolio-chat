// ระยะชัดตื้น: เลื่อนจุดโฟกัสไปตามระยะตัวจิ๋ว (ถ้ามองไม่เห็นตัวจิ๋ว โฟกัสที่ระยะกลาง)

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { DepthOfFieldEffect } from "postprocessing";
import { guideState } from "../travel/guideState";

const DEFAULT_FOCUS = 6;

export function MascotFocus({ target }: { target: RefObject<DepthOfFieldEffect | null> }) {
  useFrame(({ camera }) => {
    const e = target.current;
    if (!e) return;
    const want = guideState.visible ? camera.position.distanceTo(guideState.mascot) : DEFAULT_FOCUS;
    const coc = e.cocMaterial as unknown as { worldFocusDistance?: number };
    if (typeof coc.worldFocusDistance === "number") coc.worldFocusDistance += (want - coc.worldFocusDistance) * 0.1;
  });
  return null;
}
