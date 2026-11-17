// ผูกพื้นที่ปัจจุบันกับ URL hash: เปิดลิงก์ #/projects แล้วไปที่นั่นหลัง Intro, ปุ่ม Back ใช้ได้

import { useEffect } from "react";
import { useWorld } from "../store/useWorld";
import { districtFromHash, hashFor } from "../lib/hash";

export function useHashSync() {
  useEffect(() => {
    const fromUrl = districtFromHash(window.location.hash);
    if (fromUrl) useWorld.getState().travelTo(fromUrl); // ก่อนจบ Intro จะถูกจำไว้เป็นปลายทาง

    const onHashChange = () => {
      const id = districtFromHash(window.location.hash);
      if (id) useWorld.getState().travelTo(id, { fromHistory: true });
    };
    window.addEventListener("hashchange", onHashChange);

    const unsubscribe = useWorld.subscribe((s, prev) => {
      if (s.introDone && s.district !== prev.district) {
        // มาถึงระหว่างที่มีคิวจากปุ่ม Back/Forward: URL ชี้ไปที่ปลายทางในคิวอยู่แล้ว — ไม่แตะประวัติ
        // (ถ้าแทนที่/เพิ่มตรงนี้ ประวัติจะเพี้ยน และ Back ครั้งต่อไปพากลับไปที่ที่ผู้ชมเพิ่งหนีออกมา)
        if (prev.queuedTarget) return;
        const h = hashFor(s.district);
        if (window.location.hash !== h) window.history.pushState(null, "", h);
      }
    });

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      unsubscribe();
    };
  }, []);
}
