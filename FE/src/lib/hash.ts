// ผูกพื้นที่ปัจจุบันกับ URL เช่น #/projects (ปุ่ม Back ใช้ได้ แชร์ลิงก์ตรงได้)

import type { DistrictId } from "../types";
import { DISTRICT_ORDER } from "../config/districts";

export function districtFromHash(hash: string): DistrictId | null {
  const id = hash.replace(/^#\/?/, "");
  return (DISTRICT_ORDER as string[]).includes(id) ? (id as DistrictId) : null;
}

export function hashFor(id: DistrictId): string {
  return `#/${id}`;
}
