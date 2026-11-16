// สถานะต่อเฟรมของตัวจิ๋วและ AI ระหว่างเดินทาง — CameraRig เขียน, Mascot/AiPresence อ่านใน useFrame
// (แบบเดียวกับ elevatorDoors: ไม่ผ่าน React state เพื่อไม่ให้ re-render ทุกเฟรม)

import * as THREE from "three";
import type { DistrictId } from "../../types";

export const guideState = {
  mascot: new THREE.Vector3(),
  heading: 0,
  /** ตัวจิ๋วแสดงอยู่ (หลัง Intro) */
  visible: false,
  /** กำลังเดิน (ใช้ทำท่าเดิน) */
  walking: false,
  /** ความชัดของ AI ต้นทาง/ปลายทาง 0..1 */
  aiFrom: 1,
  aiTo: 1,
  from: null as DistrictId | null,
  to: null as DistrictId | null,
};
