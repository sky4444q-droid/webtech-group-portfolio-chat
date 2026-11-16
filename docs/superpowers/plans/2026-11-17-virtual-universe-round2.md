# NEXORA Virtual Universe รอบสอง Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ต่อยอดโลก 3D รอบแรกให้ครบตาม Handoff — AI มีชีวิต + เสียง, จุดชมด้วยเมาส์, กล้องผสม, การเดินทาง 4 แบบ, Intro ซอยนีออนกับตัวจิ๋ว, ฉาก/เอฟเฟกต์แน่นขึ้น, การเปิดดูแบบผสม และ Discovery

**Architecture:** คงโครง R3F เดิม (Canvas เดียว, `useWorld` เป็นสถานะกลาง, เรนเดอร์เฉพาะพื้นที่ปัจจุบัน/ปลายทาง) เพิ่ม store ใหม่ที่ทดสอบได้แบบไม่พึ่ง WebGL: `useAi` (อารมณ์/คำพูด), `useAudio` (ค่าเสียง), `useDiscovery`, และ viewpoint ใน `useWorld` · ตรรกะเส้นทางกล้อง/ชนิดการเดินทางเป็นฟังก์ชันบริสุทธิ์ใน `src/world/travel/` · เสียงใช้ Web Speech API + Web Audio API สร้างเสียงด้วยโค้ด

**Tech Stack:** React 19, TypeScript 5, Vite 8, three 0.187, @react-three/fiber 9, @react-three/drei 10, @react-three/postprocessing 3, zustand 5, Vitest 5 + jsdom

**Spec:** `docs/superpowers/specs/2026-11-17-virtual-universe-round2-design.md` (อ่านคู่กับ spec รอบแรก `2026-11-16-frontend-virtual-universe-design.md`)

## Global Constraints

- ทำงานบน branch `feature/vu-round2` ใน `C:\web port\webtech-group-portfolio-chat` · commit ได้ **ห้าม push** จนผู้ใช้สั่ง · ห้ามแก้ `BE/`
- ห้ามแต่งข้อมูลทีม — ข้อมูลทีมมาจาก `usePortfolio` (`GET /portfolio`) เท่านั้น บทพูด AI พูดถึงพื้นที่/วิธีใช้เท่านั้น
- ข้อความใหม่ทุกข้อความอยู่ใน `src/i18n/th.ts` และ `src/i18n/en.ts` (en ต้องมีคีย์ครบตาม th — มี type บังคับอยู่แล้ว)
- ข้อความภาษาไทยในฉากใช้ HTML (`drei` `Html` หรือ overlay) เท่านั้น
- บังคับด้วยเมาส์อย่างเดียว ไม่มี WASD/ลูกศร
- ไฟล์ภายนอก: เฉพาะ CC0 จาก ambientCG และ Poly Haven, รวม ≤ ~6 MB, ทุกไฟล์บันทึกใน `FE/CREDITS.md`, เก็บใน `FE/public/assets/` · ไม่มีไฟล์เสียง (เสียงสร้างด้วยโค้ด)
- โหมดคุณภาพต่ำต้องปิดของหนักใหม่ทุกตัว (กรวยแสง, แฟลร์, โดรน/รถ, ฝน, พื้นสะท้อน, Bloom) และ `prefers-reduced-motion`/โหมดต่ำ → การเดินทางเป็นการจางสั้น ๆ
- ทุก task จบด้วย `npm test`, `npm run typecheck`, `npm run build` ผ่าน (รันใน `FE/`) และดูในเบราว์เซอร์ (`fe-dev` ใน `C:\web port\.claude\launch.json`) ว่าไม่มี error ใน Console
- ของเดิมต้องไม่พัง: แชทกับหลังบ้าน, `/portfolio`, Mini Map, TH/EN, hash URL + ปุ่ม Back, Esc, Skip

## Review Focus

1. เดินทางซ้อน: คลิก Mini Map ระหว่างเดิน Gallery Avenue/ลิฟต์/Portal → ต้องไม่เริ่มการเดินทางใหม่ (ยกเว้นคลิกเพื่อข้ามการเดิน) และจบที่พื้นที่ปลายทางที่ถูก — ทดสอบใน Task 3
2. ปุ่ม Back ของเบราว์เซอร์ระหว่างเดินทาง/ที่จุดชมรอง → ไปพื้นที่ก่อนหน้าได้ถูก ไม่ค้าง viewpoint ของพื้นที่เดิม — ทดสอบใน Task 2
3. เสียง: เปลี่ยนภาษาระหว่าง AI พูด, เครื่องไม่มีเสียงภาษาไทย, ผู้ชมปิดเสียงก่อนกด Enter → ไม่ error, ซับไตเติลยังขึ้น, ไม่พูดเมื่อปิด — ทดสอบใน Task 1
4. localStorage ใช้ไม่ได้ (private mode) → ค่าเสียง/Discovery ยังทำงานในหน่วยความจำ ไม่พัง — ทดสอบใน Task 1 และ Task 7
5. ข้อมูลทีมยังโหลดไม่เสร็จ/โหลดไม่ได้ ตอนเปิด Hologram การ์ดทีม → แสดง "รอข้อมูล" ไม่ว่างเปล่า — ทดสอบใน Task 6

---

### Task 1: AI มีชีวิต + ระบบเสียง

**Files:**
- Create: `FE/src/store/useAi.ts`, `FE/src/store/ai.test.ts`
- Create: `FE/src/store/useAudio.ts`, `FE/src/store/audio.test.ts`
- Create: `FE/src/audio/voice.ts` (Web Speech), `FE/src/audio/sfx.ts` (Web Audio: ambience + effects), `FE/src/audio/voice.test.ts`
- Create: `FE/src/ui/Subtitle.tsx`
- Modify: `FE/src/world/ai/AiPresence.tsx`, `EnergyOrb.tsx`, `GeometricEntity.tsx`, `FluidEntity.tsx` (อ่าน mood จาก `useAi`)
- Modify: `FE/src/store/useChat.ts` (ตั้ง mood listening/thinking/happy/error), `FE/src/ui/ChatPanel.tsx` (พิมพ์ → listening)
- Modify: `FE/src/ui/Hud.tsx` (ปุ่มลำโพง + ตัวเลือกแยกใน ⚙), `FE/src/ui/Intro.tsx` (Enter → `unlockAudio()` + ทักทาย), `FE/src/App.tsx`
- Modify: `FE/src/i18n/th.ts`, `en.ts` (บทพูด: `voiceGreeting`, `voiceArrive_<district>` ×5, ปุ่มเสียง)

**Interfaces:**
- Produces: `type AiMood = "idle"|"curious"|"listening"|"thinking"|"speaking"|"happy"|"error"`
- Produces: `useAi` state `{ mood: AiMood; subtitle: string | null; setMood(m: AiMood, holdMs?: number): void; say(key: DictKey): void; }` — `say` ตั้ง subtitle (ข้อความตามภาษาปัจจุบัน), mood `speaking`, เรียก `voice.speak` ถ้าเปิดเสียงพูด, คืน `idle` เมื่อพูดจบ/หมดเวลา
- Produces: `useAudio` state `{ master: boolean; voice: boolean; ambience: boolean; unlocked: boolean; toggleMaster(); setVoice(b); setAmbience(b); unlock(); }` จำค่าผ่าน `lib/storage` คีย์ `audio`
- Produces: `voice.speak(text: string, lang: Lang, onEnd: () => void): void`, `voice.cancel(): void` — ไม่มีเสียงภาษานั้นหรือไม่มี `speechSynthesis` → เรียก `onEnd` ทันที ไม่ throw
- Produces: `sfx.play(name: SfxName): void`, `sfx.setAmbience(district: DistrictId | "alley" | null): void`, `sfx.duck(on: boolean): void` · `SfxName = "hover"|"click"|"panelOpen"|"panelClose"|"send"|"reply"|"step"|"whoosh"|"portal"|"elevatorDoor"|"elevatorRun"|"ding"|"discover"`
- Produces: `arrivedOnce: Set<DistrictId>` อยู่ใน `useAi` — `say("voiceArrive_x")` เฉพาะครั้งแรกของการเข้าชม

- [ ] **Step 1: เขียนทดสอบที่ล้มเหลว**

`ai.test.ts`:
- `say("voiceGreeting")` → `mood === "speaking"`, `subtitle` = ข้อความ th ของคีย์นั้น; เมื่อ voice เรียก onEnd → `mood === "idle"` และ subtitle ถูกล้างหลังหน่วงเวลา (ใช้ fake timers)
- `say` ตอน `useAudio.voice === false` → ไม่เรียก `voice.speak` แต่ subtitle ยังขึ้น
- `setMood("happy", 1200)` → หลัง 1200ms กลับ `idle`
- ไปถึง `team` สองครั้ง → `say` ถูกเรียกครั้งเดียว (ผ่านฟังก์ชัน `arrive(district)`)

`audio.test.ts`:
- ค่าเริ่มต้นเปิดทั้งหมด; `toggleMaster()` แล้วโหลดใหม่ (`initialAudioState()`) ได้ค่าเดิมจาก storage
- storage throw → ยังสลับค่าได้ ไม่ throw

`voice.test.ts`:
- ไม่มี `window.speechSynthesis` → `speak` เรียก `onEnd` ทันที
- ไม่มี voice ที่ `lang` ขึ้นต้นด้วย `th` → เรียก `onEnd` ทันที
- เปลี่ยนภาษาระหว่างพูด → `cancel()` ถูกเรียกก่อนพูดใหม่

`chat.test.ts` (เพิ่ม): ส่งข้อความ → mood `thinking` ระหว่างรอ, สำเร็จ → `happy`, ผิดพลาด → `error`

- [ ] **Step 2: รัน `npm test` ยืนยันว่าล้ม** (โมดูลยังไม่มี)
- [ ] **Step 3: เขียน store/โมดูลเสียงให้ผ่าน** — `sfx.ts` สร้าง `AudioContext` เมื่อ `unlock()` เท่านั้น, ambience = noise กรองความถี่ (ฝน) + oscillator ทุ้ม (ฮัม) + โทนประจำพื้นที่ crossfade 1.5s, effects = envelope สั้น ๆ, ใน jsdom (ไม่มี AudioContext) ทุกฟังก์ชันเป็น no-op
- [ ] **Step 4: ต่อเข้ากับฉากและ UI** — ทุกร่าง AI อ่าน `mood`: สเกลหายใจ (idle), หันหาเมาส์ (curious เมื่อ hover วัตถุ `onPointerOver` ใด ๆ ที่คลิกได้), ความเร็วหมุน/การแตกตัว (thinking), พัลส์ตามเวลา (speaking), เด้ง+อนุภาค (happy), สีแดงอมชมพู+สั่น (error); สีผสมกับ `DISTRICTS[d].color`; `Subtitle` แสดงใต้/ใกล้ AI ด้วย `Html`; AI พูด → `sfx.duck(true)`
- [ ] **Step 5: รัน `npm test`, `npm run typecheck`, `npm run build` ผ่าน + ดูในเบราว์เซอร์:** กด Enter ได้ยินคำทักทาย + ซับไตเติล, ไปพื้นที่ใหม่ครั้งแรก AI แนะนำพื้นที่, พิมพ์ในแชทแล้ว AI เปลี่ยนท่า, ปุ่มลำโพงปิดเสียงได้
- [ ] **Step 6: Commit** `feat(fe): living AI moods, contextual voice and generated sound`

---

### Task 2: จุดชม + มุมกล้องผสม + ล็อบบี้ Team HQ

**Files:**
- Create: `FE/src/config/viewpoints.ts`, `FE/src/config/viewpoints.test.ts`
- Create: `FE/src/world/ViewpointMarker.tsx`
- Modify: `FE/src/store/useWorld.ts` (+ viewpoint), `FE/src/store/world.test.ts`
- Modify: `FE/src/world/CameraRig.tsx` (ไปยัง viewpoint, ขอบเขตหันตามเมาส์ต่อ viewpoint)
- Modify: `FE/src/world/districts/*.tsx` (วาง marker), `TeamDistrict.tsx` (ล็อบบี้ภายใน: ผนัง เพดานไฟ จอระดับสายตา ประตูหน้าอาคาร)
- Modify: `FE/src/ui/Hud.tsx` (ปุ่มย้อนกลับจุดชม), `FE/src/ui/Overlays.tsx` (คลิกขวา = ย้อนกลับ), i18n (ชื่อจุดชม)

**Interfaces:**
- Produces: `interface Viewpoint { id: string; label: DictKey; mode: "wide" | "eye"; position: Vec3; target: Vec3; lookRange: number /* เรเดียน */; marker: Vec3 }` (พิกัดสัมพัทธ์กับ `DISTRICTS[d].position`)
- Produces: `VIEWPOINTS: Record<DistrictId, Viewpoint[]>` — ตัวแรกของแต่ละพื้นที่ = จุดเริ่มต้น; จุดตามตาราง spec ข้อ 7.2; `team` และ `sanctuary` ทุกจุดเป็น `mode: "eye"` ความสูงกล้อง ~1.7
- Produces: `useWorld` เพิ่ม `{ viewpoint: number; viewpointStack: number[]; goToViewpoint(i: number): void; backViewpoint(): boolean }` — `finishTravel` รีเซ็ต viewpoint เป็น 0 และล้าง stack; `goToViewpoint` ใช้ไม่ได้ระหว่างเดินทาง/ก่อน intro จบ
- Consumes: `sfx.play("click")` จาก Task 1

- [ ] **Step 1: เขียนทดสอบที่ล้มเหลว**
  - `viewpoints.test.ts`: ทุกพื้นที่มี 2–4 จุด, `id` ไม่ซ้ำในพื้นที่, `team`/`sanctuary` ทุกจุด `mode === "eye"`, ทุก `label` มีใน `th`
  - `world.test.ts`: `goToViewpoint(2)` แล้ว `backViewpoint()` → 0 และคืน `true`; ที่จุด 0 `backViewpoint()` คืน `false`; ระหว่าง `travel !== null` `goToViewpoint` ไม่เปลี่ยนค่า; `travelTo`+`finishTravel` → `viewpoint === 0`, stack ว่าง; `closeTopmost` เมื่อไม่มี panel/แชท และ viewpoint ≠ 0 → ย้อนจุดชม
- [ ] **Step 2: รันให้ล้ม**
- [ ] **Step 3: เขียน config + store ให้ผ่าน**
- [ ] **Step 4: ต่อเข้ากล้องและฉาก** — `CameraRig` damp ไป `position/target` ของ viewpoint ~1s; `lookRange` 0.08 (wide) / 0.43 (eye ≈ ±25°); `ViewpointMarker` วงแหวนเรืองแสง + ป้าย `Html` ตอน hover, ซ่อน marker ของจุดที่อยู่; ล็อบบี้ Team HQ ให้จอทีม/ติดต่อที่ระดับสายตา; ออกจากล็อบบี้ด้วยการบิน → path เริ่มด้วยถอยออกทางประตู (ใส่ใน Task 3)
- [ ] **Step 5: ตรวจ:** test/typecheck/build ผ่าน; เบราว์เซอร์: คลิก marker ทุกพื้นที่, ปุ่ม/คลิกขวาย้อนกลับ, Esc, ปุ่ม Back ของเบราว์เซอร์ที่จุดรองแล้วไปพื้นที่ก่อนหน้าถูก
- [ ] **Step 6: Commit** `feat(fe): mouse viewpoints, eye-level views and Team HQ lobby`

---

### Task 3: การเดินทาง 4 แบบ (บิน / เดิน Gallery Avenue / ลิฟต์ / Portal ลึก)

**Files:**
- Create: `FE/src/world/travel/kind.ts`, `FE/src/world/travel/paths.ts`, `FE/src/world/travel/travel.test.ts`
- Create: `FE/src/world/travel/GalleryAvenue.tsx` (ถนนจริงระหว่าง nexus กับ projects), `ElevatorScene.tsx` (ฉากตู้ลิฟต์วางนอกเมือง), `PortalTunnel.tsx` (อุโมงค์แสงเต็มจอ), `FadeVeil.tsx`
- Modify: `FE/src/world/CameraRig.tsx` (เล่นตามชนิด), `FE/src/store/useWorld.ts` (`skipWalk()`), `FE/src/world/World.tsx`, `FE/src/world/Environment.tsx` (เว้นตึกตามแนวถนน), `FE/src/config/timing.ts`

**Interfaces:**
- Produces: `type TravelKind = "fly" | "walk" | "elevator" | "portal" | "fade"`
- Produces: `travelKind(from: DistrictId, to: DistrictId, opts: { reducedMotion: boolean; quality: Quality }): TravelKind` — `reducedMotion || quality==="low"` → `"fade"`; `to==="projects"` หรือ (`from==="projects"` && `to==="nexus"`) → `"walk"`; `to==="team"` → `"elevator"`; `to==="sanctuary"` → `"portal"`; อื่น ๆ → `"fly"`
- Produces: `walkPath(from, to): { pre: CatmullRomCurve3 | null; walk: CatmullRomCurve3; reverse: boolean }` — `from !== "nexus" && from !== "projects"` → `pre` = เส้นบินไปต้นถนนฝั่ง nexus
- Produces: `TIMING`: `WALK_MS` 6000, `ELEVATOR_MS` 2600, `PORTAL_MS` 2400, `FADE_MS` 600 (TRAVEL_MS 1800 เดิมสำหรับ fly)
- Produces: `useWorld.skipWalk(): void` — เมื่อ kind เป็น walk ให้กระโดดไปจุดท้ายแล้ว `finishTravel()`
- Consumes: `sfx.play("step"|"whoosh"|"portal"|"elevatorDoor"|"elevatorRun"|"ding")`, `useAi.arrive()` จาก Task 1, viewpoint reset จาก Task 2

- [ ] **Step 1: เขียนทดสอบที่ล้มเหลว** (`travel.test.ts`)
  - ตาราง `travelKind`: nexus→projects `walk`, projects→nexus `walk`, gate→projects `walk`, nexus→team `elevator`, projects→team `elevator`, nexus→sanctuary `portal`, gate→nexus `fly`, team→nexus `fly`, ทุกคู่เมื่อ `reducedMotion` → `fade`, ทุกคู่เมื่อ `quality:"low"` → `fade`
  - `walkPath("team","projects").pre !== null`; `walkPath("nexus","projects").pre === null`; `walkPath("projects","nexus").reverse === true`; จุดเริ่ม/จบของ `walk` อยู่ห่างตำแหน่ง nexus/projects ไม่เกิน 20 หน่วย; ทุกจุดบนเส้นมี `y` ≈ 1.7 (ระดับสายตา)
  - store: ระหว่าง `travel` เรียก `travelTo` อีก → ไม่เปลี่ยน `travel`; `skipWalk()` ตอน kind ไม่ใช่ walk → ไม่ทำอะไร
- [ ] **Step 2: รันให้ล้ม**
- [ ] **Step 3: เขียน `kind.ts`, `paths.ts`, `skipWalk` ให้ผ่าน**
- [ ] **Step 4: สร้างฉากและต่อกล้อง** — Gallery Avenue: พื้นเปียก, ป้าย/จอสองข้าง, ประตูหอจัดแสดงที่เปิดเมื่อกล้องเข้าใกล้; กล้องเดินโยกขึ้นลง + `step` ทุกก้าว; คลิกระหว่างเดิน → `skipWalk`; Elevator: veil จาง → ตู้ลิฟต์กระจก ประตูปิด เมืองเลื่อนลงข้างนอก ประตูเปิด → ล็อบบี้; Portal ลึก: ประตูหมุนเปิดหน้ากล้อง → `PortalTunnel` shader ม่วงบิดแบบใต้น้ำ → ปลายทาง; ออกจากล็อบบี้ Team HQ ด้วย fly → ถอยออกทางประตูก่อน; ระหว่างเดินทางเรนเดอร์ GalleryAvenue/ElevatorScene เฉพาะเมื่อใช้
- [ ] **Step 5: ตรวจ:** test/typecheck/build ผ่าน; เบราว์เซอร์: ทุกเส้นทางจากประตูและ Mini Map, คลิกข้ามการเดิน, Mini Map ระหว่างเดินทางไม่ทำงาน, ⚙ ต่ำ → จาง, ไม่มีกล้องทะลุตึก/ผนัง
- [ ] **Step 6: Commit** `feat(fe): walk, elevator and portal travel between districts`

---

### Task 4: Intro ใหม่ — Arrival Alley + ตัวจิ๋ว

**Files:**
- Create: `FE/src/world/ArrivalAlley.tsx` (ส่วนถาวรของ gate), `FE/src/world/ai/Mascot.tsx` (Fluid เล็ก มีท่าเดิน), `FE/src/world/intro/introPath.ts`, `FE/src/world/intro/intro.test.ts`
- Modify: `FE/src/world/districts/GateDistrict.tsx`, `FE/src/world/CameraRig.tsx` (Intro ใหม่), `FE/src/ui/Intro.tsx` (overlay บางลงให้เห็นฉาก), `FE/src/config/viewpoints.ts` (gate จุด "มองย้อนเข้าซอย"), `FE/src/world/Environment.tsx` (เว้นตึกให้ซอย)

**Interfaces:**
- Produces: `introCamera(t: number /* 0..1 */): { position: Vec3; target: Vec3 }` และ `mascotAt(t): { position: Vec3; step: number /* 0..1 phase ของก้าว */ }` — กล้องอยู่หลังตัวจิ๋ว ~4 หน่วย สูง ~1.8, ตัวจิ๋วเดินจากปลายซอยไปหน้าประตู gate ภายใน `INTRO_MS`
- Produces: `MascotPhase = "walk" | "turn" | "morph" | "gone"` ใน `useAi` (`mascotPhase`, `setMascotPhase`)
- Consumes: `useAi.say("voiceGreeting")`, `useAudio.unlock()`, `sfx.setAmbience("alley")`, `sfx.play("step")` จาก Task 1

- [ ] **Step 1: เขียนทดสอบที่ล้มเหลว** (`intro.test.ts`): `introCamera(0)` และ `introCamera(1)` อยู่หลัง `mascotAt` (ระยะ 3–5 หน่วยตามแกนเดิน); `mascotAt(1)` ใกล้ประตู gate ≤ 3 หน่วย; `mascotAt(t).position.y` ≥ 0; `step` วนรอบ ≥ 6 ครั้งตลอด intro
- [ ] **Step 2: รันให้ล้ม**
- [ ] **Step 3: เขียน `introPath.ts` ให้ผ่าน**
- [ ] **Step 4: สร้างฉาก** — ซอยกว้าง ~8 ยาว 40–60 ป้ายซ้อนหลายชั้น จอโฮโลแกรม ท่อ/สายไฟ ฝน หมอก; ตัวจิ๋วบีบ-ยืดตามก้าว; กด Enter → `turn` → `morph` เป็น Orb (สเกล/สีเปลี่ยนนุ่ม) → บินนำกล้องไป `pendingTarget`; reduced motion → ภาพนิ่ง; กลับมา gate ภายหลังเห็นซอยแต่ไม่เล่น intro; ลิงก์ตรง `#/team` ยังเล่น intro แล้วไป team
- [ ] **Step 5: ตรวจ:** test/typecheck/build ผ่าน; เบราว์เซอร์: Intro, Skip, Enter + เสียงทักทาย, ลิงก์ตรง, กลับ gate
- [ ] **Step 6: Commit** `feat(fe): Arrival Alley intro with the walking mascot`

---

### Task 5: ฉาก บรรยากาศ และเอฟเฟกต์ + ไฟล์ CC0

**Files:**
- Create: `FE/public/assets/textures/…`, `FE/public/assets/hdri/…` (ดาวน์โหลดจาก ambientCG/Poly Haven), `FE/CREDITS.md`
- Create: `FE/src/world/fx/VolumetricCone.tsx`, `LensFlare.tsx`, `GroundFog.tsx`, `Traffic.tsx` (โดรน/รถลอยตามเส้น), `FE/src/world/fx/fx.test.ts`
- Modify: `FE/src/world/Environment.tsx` (พื้นผิวพื้นเปียก, HDRI, หมอกชั้น, ฝนกระเซ็น), `FE/src/world/districts/*.tsx` (เพิ่มความแน่นป้าย/จอ/ลำแสง), `FE/src/ui/Overlays.tsx` (หางแสงเคอร์เซอร์ + วงแหวนเมื่อชี้วัตถุคลิกได้), `FE/src/world/World.tsx`

**Interfaces:**
- Produces: `fxEnabled(quality: Quality): { cones: boolean; flare: boolean; traffic: boolean; rain: boolean; reflector: boolean; bloom: boolean; fogLayers: number }` — `low` ปิดทุกตัวและ `fogLayers: 1`; `high` เปิดทั้งหมด `fogLayers: 3`
- Consumes: `useWorld.quality`

- [ ] **Step 1: ดาวน์โหลดไฟล์** — ใช้ `curl` ลงโฟลเดอร์ใหม่ใน scratchpad ก่อน ตรวจชนิด/ขนาด แล้วย่อ/แปลงเป็น 1K–2K `.jpg`/`.webp` (HDRI `.hdr` 1K) ก่อนคัดลอกเข้า `public/assets/` · รวม ≤ ~6 MB · บันทึกชื่อ ลิงก์ และใบอนุญาต CC0 ใน `CREDITS.md` ต่อไฟล์
- [ ] **Step 2: เขียนทดสอบที่ล้มเหลว** (`fx.test.ts`): ตาราง `fxEnabled` สำหรับ high/low ตามข้างบน; ทุกไฟล์ใน `public/assets/` ถูกกล่าวถึงใน `CREDITS.md` (อ่านไฟล์ด้วย `node:fs`); ขนาดรวม `public/assets/` ≤ 6.5 MB
- [ ] **Step 3: รันให้ล้ม แล้วเขียน `fxEnabled` + `CREDITS.md` ให้ผ่าน**
- [ ] **Step 4: ใส่เอฟเฟกต์และความแน่นของฉาก** ตามตาราง spec ข้อ 12; ไฟล์ CC0 โหลดแบบทยอย (`Suspense` แยกจาก Intro ไม่ให้ Intro รอ)
- [ ] **Step 5: ตรวจ:** test/typecheck/build ผ่าน; เบราว์เซอร์: โหมดสูงเห็นครบ, โหมดต่ำปิดครบ, ข้อความไม่ถูกบัง, ไม่มี error
- [ ] **Step 6: Commit** `feat(fe): denser scenes, volumetric light, flare, fog, traffic and CC0 materials`

---

### Task 6: การเปิดดูรายละเอียดแบบผสม (Hologram / เต็มจอ / ซูม)

**Files:**
- Create: `FE/src/ui/Fullscreen.tsx` (overlay เต็มจอ: ผลงานครบ, โปรไฟล์สมาชิก, ไดอะแกรม Architecture), `FE/src/world/HoloCard.tsx` (`Html` + เส้นสแกน), `FE/src/lib/architecture.ts`, `FE/src/lib/architecture.test.ts`, `FE/src/ui/fullscreen.test.tsx`
- Modify: `FE/src/store/useWorld.ts` (`Panel` เพิ่ม `{ kind: "member"; id: string }` และ `display: "holo" | "full"`), `FE/src/world/districts/ProjectsDistrict.tsx` (ซูม → Hologram เหนือแท่น), `FE/src/world/districts/TeamDistrict.tsx` (การ์ดสมาชิกกางจากจอ), `FE/src/ui/Panels.tsx` (contact คง Panel ข้าง), i18n

**Interfaces:**
- Produces: `type Panel = { kind: "project"; id: string; display: "holo" | "full" } | { kind: "team"; display: "holo" } | { kind: "member"; id: string } | { kind: "contact" } | { kind: "architecture"; projectId: string } | null`
- Produces: `parseArchitecture(text: string): string[]` — แยกด้วย `→` หรือ `->` ตัดช่องว่าง ไม่เอาช่องว่าง; ข้อความไม่มีลูกศร → `[text]`
- Produces: `useWorld.expandPanel(): void` — holo → full; `closeTopmost` จาก full → ปิดทั้งหมด (ไม่ย้อนไป holo)
- Consumes: `usePortfolio`, `sfx.play("panelOpen"|"panelClose")`, `showcaseCamera` เดิม

- [ ] **Step 1: เขียนทดสอบที่ล้มเหลว**
  - `architecture.test.ts`: `"A → B -> C"` → `["A","B","C"]`; `"ข้อความเดียว"` → `["ข้อความเดียว"]`; `""` → `[]`
  - `world.test.ts`: `openPanel({kind:"project",id:"project-1",display:"holo"})` → `expandPanel()` → `display === "full"`; Esc จาก full → `panel === null`
  - `fullscreen.test.tsx` (render ด้วย React DOM ใน jsdom): โปรไฟล์สมาชิกเมื่อ `usePortfolio` ยังเป็นข้อมูลสำรอง → เห็นป้าย "รอข้อมูล"; สมาชิก id ที่ไม่มี → ไม่ render อะไร ไม่ throw
- [ ] **Step 2: รันให้ล้ม**
- [ ] **Step 3: เขียน store/`parseArchitecture`/`Fullscreen` ให้ผ่าน**
- [ ] **Step 4: ต่อเข้าฉาก** — แท่น: ซูม → `HoloCard` (ชื่อ สรุป Tech Stack + ปุ่ม "ดูทั้งหมด") → เต็มจอ (ฉากหลังมืด/เบลอ) มีปุ่ม "Architecture" → ไดอะแกรมกล่อง-ลูกศรจาก `parseArchitecture`; จอทีม: การ์ด Hologram ต่อสมาชิกกางออก → คลิก → โปรไฟล์เต็มจอ; ติดต่อ: ซูม + Panel ข้างเดิม
- [ ] **Step 5: ตรวจ:** test/typecheck/build ผ่าน; เบราว์เซอร์ TH/EN ทุกแบบ, Esc, ข้อความไทยไม่เป็นกล่อง
- [ ] **Step 6: Commit** `feat(fe): hologram cards, fullscreen details and architecture diagram`

---

### Task 7: Discovery (เศษข้อมูล 5 ชิ้น)

**Files:**
- Create: `FE/src/store/useDiscovery.ts`, `FE/src/store/discovery.test.ts`, `FE/src/world/DataFragment.tsx`
- Modify: `FE/src/world/districts/*.tsx` (ชิ้นละพื้นที่, เห็นเมื่ออยู่ viewpoint ที่กำหนด), `FE/src/world/districts/SanctuaryDistrict.tsx` + `FluidEntity.tsx` (เอฟเฟกต์เมื่อครบ: เปลี่ยนสี + โลโก้ NEXORA กลางร่าง), `FE/src/ui/Hud.tsx` (ตัวนับ x/5 ซ่อนจนเจอชิ้นแรก), i18n (`voiceDiscover`, `voiceDiscoverAll`)

**Interfaces:**
- Produces: `FRAGMENTS: { id: string; district: DistrictId; viewpoint: number; position: Vec3 }[]` (5 ชิ้น พื้นที่ละ 1)
- Produces: `useDiscovery` `{ found: string[]; find(id: string): boolean /* true ถ้าเป็นชิ้นใหม่ */; complete: boolean }` จำใน storage คีย์ `discovery`
- Consumes: `useAi.setMood("happy")`, `useAi.say("voiceDiscover" | "voiceDiscoverAll")`, `sfx.play("discover")`

- [ ] **Step 1: เขียนทดสอบที่ล้มเหลว**: `find` ชิ้นเดิมซ้ำคืน `false` และไม่นับซ้ำ; id ที่ไม่มีใน `FRAGMENTS` คืน `false`; ครบ 5 → `complete === true`; โหลดใหม่ได้ค่าเดิม; storage throw → ยังทำงานในหน่วยความจำ; `FRAGMENTS` ครบทั้ง 5 พื้นที่ไม่ซ้ำ
- [ ] **Step 2: รันให้ล้ม**
- [ ] **Step 3: เขียน store ให้ผ่าน**
- [ ] **Step 4: ต่อเข้าฉาก/HUD** — คลิกชิ้น → `find` → ถ้าใหม่: AI happy + พูด + เสียง; ครบ → พูด `voiceDiscoverAll` และ Sanctuary แสดงเอฟเฟกต์พิเศษ
- [ ] **Step 5: ตรวจรวมทั้งงานตาม spec ข้อ 18 ทุกข้อ** + test/typecheck/build ผ่าน
- [ ] **Step 6: Commit** `feat(fe): optional discovery fragments`
