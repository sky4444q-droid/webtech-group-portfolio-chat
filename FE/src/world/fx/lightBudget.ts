// งบไฟคงที่ (logic ล้วน): จำนวน point/spot light ที่ renderer เห็นต้องเท่าเดิมทุกเฟรม
// เหตุผล: three ใส่จำนวนไฟลงใน shader — ถ้าจำนวนเปลี่ยน (เช่น เขตปลายทาง mount ตอนเดินทาง)
// ทุกวัตถุที่รับแสงต้อง compile shader ใหม่ทั้งหมด → ภาพค้าง 0.2–2 วินาทีบนเครื่องที่ยังไม่เคยเปิดเว็บ

export type BudgetedLight = "PointLight" | "SpotLight";

/** ค่าสูงสุดที่ยืนอยู่ในเขตใดเขตหนึ่ง (Team: point 4 + spot 1) · ตอนเดินทางเก็บดวงที่ใกล้กล้องที่สุด */
export const LIGHT_BUDGET: Record<BudgetedLight, number> = { PointLight: 4, SpotLight: 1 };

export interface LightCandidate {
  id: number;
  type: BudgetedLight;
  /** ระยะถึงกล้อง (เมตร) */
  distance: number;
}

export interface LightPlan {
  /** id ของไฟจริงที่เปิดได้ */
  keep: Set<number>;
  /** จำนวนไฟหลอก (ความสว่าง 0) ที่ต้องเปิดเพื่อให้ครบงบ */
  dummies: Record<BudgetedLight, number>;
}

export function planLights(candidates: LightCandidate[], budget: Record<BudgetedLight, number>): LightPlan {
  const keep = new Set<number>();
  const dummies = { PointLight: 0, SpotLight: 0 };
  for (const type of ["PointLight", "SpotLight"] as const) {
    const near = candidates.filter((l) => l.type === type).sort((a, b) => a.distance - b.distance).slice(0, budget[type]);
    near.forEach((l) => keep.add(l.id));
    dummies[type] = budget[type] - near.length;
  }
  return { keep, dummies };
}
