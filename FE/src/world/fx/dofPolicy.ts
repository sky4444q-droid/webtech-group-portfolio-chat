// นโยบายเบลอระยะชัดตื้น (DOF) และจุดเริ่มหมอก — ให้เมืองไกลคมตอนมองกว้าง/เดินทาง/ยืนบนสะพาน

/** จุดเริ่มหมอก (ม.) — เลื่อนออกเพื่อให้ตึกไกลไม่จมหมอกเร็วเกินไป */
export const FOG_NEAR = 70;

/**
 * ค่า bokehScale: 0 เมื่อปิดเอฟเฟกต์ / มุมกว้าง / กำลังเดินทาง / จุดชมสะพาน (viewpointId "bridge")
 * นอกนั้น 1.6 (ระดับสายตา)
 */
export function dofBokeh(opts: { enabled: boolean; mode: "wide" | "eye"; traveling: boolean; viewpointId?: string }): number {
  if (!opts.enabled || opts.mode === "wide" || opts.traveling || opts.viewpointId === "bridge") return 0;
  return 1.6;
}
