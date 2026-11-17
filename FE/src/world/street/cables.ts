// สายไฟข้ามถนนแบบหย่อนตามน้ำหนัก (logic ล้วน): แปลงรายการ cable แนวนอนเป็นช่วงสายจากตึกถึงตึก
import type { Vec3 } from "../../config/districts";
import type { KitItem } from "./kitLayout";

/** ความหย่อนต่อความยาวสาย */
export const SAG_RATIO = 0.06;
export const cableSag = (width: number) => width * SAG_RATIO;

/** จุดตามสายหย่อน (พาราโบลา) จาก a ถึง b: จุดกลางต่ำกว่ากึ่งกลางคอร์ดเท่า sag; ปลายสองข้างตรงเป๊ะ */
export function catenary(a: Vec3, b: Vec3, sag: number, segments: number): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    if (i === 0) pts.push([a[0], a[1], a[2]]);
    else if (i === segments) pts.push([b[0], b[1], b[2]]);
    else {
      const t = i / segments;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
    }
  }
  return pts;
}

/** สายแนวนอนทุกเส้น → ช่วงข้ามถนนจากหน้าตึกถึงหน้าตึก (สายตั้งของโคมไม่รวม ยังเป็นกล่อง) */
export function cableSpans(items: KitItem[]): { a: Vec3; b: Vec3; sag: number }[] {
  return items
    .filter((i) => i.type === "cable" && i.size[0] > i.size[1])
    .map((i) => {
      // แกน z ของชิ้นหันเข้าหาถนน = ทิศข้ามถนน
      const dx = Math.sin(i.rotationY);
      const dz = Math.cos(i.rotationY);
      const h = i.size[0] / 2;
      const [x, y, z] = i.position;
      return { a: [x - dx * h, y, z - dz * h] as Vec3, b: [x + dx * h, y, z + dz * h] as Vec3, sag: cableSag(i.size[0]) };
    });
}
