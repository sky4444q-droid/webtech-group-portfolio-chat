// ต่อสถานะของโลกเข้ากับเสียง: เปิด/ปิดตามค่า, เปลี่ยนเสียงบรรยากาศตามพื้นที่, ให้ AI แนะนำพื้นที่เมื่อไปถึง

import { useEffect } from "react";
import { useWorld } from "../store/useWorld";
import { useAudio } from "../store/useAudio";
import { useAi } from "../store/useAi";
import * as sfx from "./sfx";
import * as voice from "./voice";
import { guideState } from "../world/travel/guideState";

export function useAudioDirector(): void {
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  const introDone = useWorld((s) => s.introDone);
  const unlocked = useAudio((s) => s.unlocked);
  const master = useAudio((s) => s.master);
  const ambience = useAudio((s) => s.ambience);
  const voiceSetting = useAudio((s) => s.voice);

  useEffect(() => {
    sfx.setEnabled(unlocked && master && ambience);
  }, [unlocked, master, ambience]);

  // ปิดเสียงพูดกลางคัน → หยุดพูดทันที
  useEffect(() => {
    if (!master || !voiceSetting) voice.cancel();
  }, [master, voiceSetting]);

  useEffect(() => {
    if (!unlocked) return;
    // Intro เดินในซอยทางเข้า
    if (!introDone) {
      sfx.setAmbience("gateLane");
      return;
    }
    const update = () => sfx.setAmbience(sfx.ambienceFor(district, travel, guideState.tripK));
    update();
    if (!travel) return;
    // ระหว่างเดินทาง: เปลี่ยนเสียงตามถนนที่กำลังเดิน (เช็คเป็นระยะ ไม่ต้องทุกเฟรม)
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [unlocked, introDone, district, travel]);

  // ไปถึงพื้นที่ (หลัง Intro และไม่ได้อยู่ระหว่างเดินทาง)
  useEffect(() => {
    if (!introDone || travel || !unlocked) return;
    if (useAi.getState().subtitle) return; // ยังทักทายอยู่ ค่อยแนะนำครั้งหน้า
    useAi.getState().arrive(district);
  }, [introDone, travel, district, unlocked]);
}
