// คุมจำนวนไฟให้คงที่ทุกครั้งที่ render (ดูเหตุผลใน lightBudget.ts)
// ทำงานใน scene.onBeforeRender — three เรียกหลัง updateMatrixWorld และก่อนเก็บรายการไฟ จึงครอบทุกการ render
// (รวม RenderPass ของ EffectComposer) และครอบเฟรมแรกที่เขตใหม่ mount พอดี

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LIGHT_BUDGET, planLights, type BudgetedLight, type LightCandidate } from "./lightBudget";

const BUDGETED = new Set<string>(["PointLight", "SpotLight"]);
const tmp = new THREE.Vector3();

interface Dummies {
  PointLight: THREE.PointLight[];
  SpotLight: THREE.SpotLight[];
}

/** ไฟจริงที่ renderer จะเห็น: ไล่เฉพาะกิ่งที่มองเห็น · ไฟที่เราปิดเองยังนับเป็นตัวเลือก (budgetHidden) */
function collect(o: THREE.Object3D, out: THREE.Light[]) {
  for (const ch of o.children) {
    if ((ch as THREE.Light).isLight) {
      if (!ch.userData.budgetDummy && BUDGETED.has(ch.type) && (ch.visible || ch.userData.budgetHidden)) out.push(ch as THREE.Light);
      continue;
    }
    if (ch.visible) collect(ch, out);
  }
}

/** เปิด/ปิดไฟจริงตามระยะกล้อง แล้วเติมไฟหลอกให้ครบงบ — เรียกซ้ำได้ ไม่มีผลข้างเคียงอื่น */
export function applyLightBudget(scene: THREE.Scene, camera: THREE.Camera) {
  const dummies = scene.userData.lightDummies as Dummies | undefined;
  if (!dummies) return;
  const lights: THREE.Light[] = [];
  collect(scene, lights);
  const candidates: LightCandidate[] = lights.map((l, id) => ({
    id,
    type: l.type as BudgetedLight,
    distance: tmp.setFromMatrixPosition(l.matrixWorld).distanceTo(camera.position),
  }));
  const plan = planLights(candidates, LIGHT_BUDGET);
  lights.forEach((l, id) => {
    const on = plan.keep.has(id);
    l.visible = on;
    l.userData.budgetHidden = !on;
  });
  (Object.keys(dummies) as BudgetedLight[]).forEach((type) => dummies[type].forEach((d, i) => (d.visible = i < plan.dummies[type])));
}

export function LightBudget() {
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const make = <T extends THREE.Light>(n: number, create: () => T) =>
      Array.from({ length: n }, () => {
        const l = create();
        l.intensity = 0;
        l.userData.budgetDummy = true;
        l.visible = false;
        scene.add(l);
        return l;
      });
    const dummies: Dummies = {
      PointLight: make(LIGHT_BUDGET.PointLight, () => new THREE.PointLight("#000000", 0, 1)),
      SpotLight: make(LIGHT_BUDGET.SpotLight, () => new THREE.SpotLight("#000000", 0, 1)),
    };
    scene.userData.lightDummies = dummies;
    const prev = scene.onBeforeRender;
    scene.onBeforeRender = function (renderer, s, cam, ...rest) {
      applyLightBudget(scene, cam);
      prev.call(this, renderer, s, cam, ...rest);
    };
    return () => {
      scene.onBeforeRender = prev;
      [...dummies.PointLight, ...dummies.SpotLight].forEach((l) => {
        scene.remove(l);
        l.dispose();
      });
      delete scene.userData.lightDummies;
    };
  }, [scene]);

  return null;
}
