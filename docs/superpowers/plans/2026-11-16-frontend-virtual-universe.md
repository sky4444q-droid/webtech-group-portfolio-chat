# Virtual Universe Frontend (รอบแรก) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แทนที่ `FE/` ด้วยเว็บ Virtual Universe แบบ Hybrid 3D ที่ครบ 5 พื้นที่ เดินทางได้ แชทได้ (ต่อหลังบ้านเดิม/โหมดจำลอง) สลับ TH/EN ได้ และทุกช่องข้อมูลจริงแสดง "รอข้อมูล"

**Architecture:** React + Vite + TypeScript. ฉาก 3D เดียว (React Three Fiber) ที่วาง 5 พื้นที่ไว้คนละพิกัด กล้องบินระหว่างกัน สถานะกลางอยู่ใน zustand สองก้อน (`useWorld`, `useChat`) UI ทั้งหมดเป็น HTML ซ้อนบน Canvas ข้อมูลและคำแปลอยู่ในไฟล์ TS ล้วน การเรียกหลังบ้านอยู่ใน `chatApi.ts` ไฟล์เดียว

**Tech Stack:** react/react-dom 19.3, vite 8, @vitejs/plugin-react 6, typescript 5, three 0.187, @react-three/fiber 9.8, @react-three/drei 10.7, @react-three/postprocessing 3.2 (+ postprocessing), zustand 5, vitest 5 + jsdom

**Spec:** `docs/superpowers/specs/2026-11-16-frontend-virtual-universe-design.md`

## Global Constraints

- ห้ามแก้อะไรใน `BE/`
- ห้ามแต่งข้อมูลสมาชิก/โปรเจกต์/ติดต่อ/ชื่อกลุ่ม/Logo — ทุกช่องใช้ `PENDING = { th: "รอข้อมูล", en: "Awaiting data" }` และ `placeholder: true`
- ข้อความภาษาไทยแสดงเป็น HTML เท่านั้น; ป้ายในฉาก 3D ใช้ CanvasTexture (ฟอนต์ระบบ) ไม่ใช้ฟอนต์ 3D
- Intro 4–5 วินาที (ใช้ 4500 ms) มี Skip
- การเดินทาง 1.5–2 วินาที (ใช้ 1800 ms) กดซ้ำระหว่างเดินทางไม่ได้
- ค่าเริ่มต้นภาษา `th`; จำภาษา/คุณภาพ/guide/sessionId ใน localStorage (ห่อ try/catch ทุกครั้ง)
- `VITE_API_URL` ว่าง → โหมดจำลอง; มีค่า → `POST {VITE_API_URL}/messages`
- DPR สูงสุด 2; โหมด `low` ปิด bloom, ฝน, พื้นสะท้อน
- Desktop เป็นหลัก; จอกว้าง < 900px แสดงคำแนะนำ (ปิดได้)
- commit บน branch `feature/virtual-universe-fe` เท่านั้น ไม่ push

## Review Focus

1. หลังบ้าน Render หลับ คำขอแรกช้า 30–60 วินาที → แสดง "กำลังปลุกระบบ AI" หลัง 8 วินาที และ timeout 70 วินาที (test ใน Task 2)
2. หลังบ้านเดิมไม่มี `sources`/`sessionId` หรือส่ง `sources` รูปแบบผิด → ต้องไม่พัง แสดงคำตอบได้ (test ใน Task 2)
3. ผู้ใช้กดพื้นที่ใหม่ระหว่างกล้องกำลังบิน → ไม่รับคำสั่ง (test ใน Task 3)
4. URL hash แปลก ๆ (`#/xyz`) หรือเปิดลิงก์ตรงเข้าพื้นที่ → ไม่พัง, เล่น Intro แล้วพาไปพื้นที่นั้น (test ใน Task 3)
5. localStorage ใช้ไม่ได้ (private mode) → เว็บยังทำงาน (test ใน Task 3)
6. พิมพ์ไทยด้วย IME แล้วกด Enter ระหว่าง composing → ไม่ส่งข้อความ (Task 5, ตรวจด้วยมือ)

---

### Task 1: ตั้งโปรเจกต์ FE ใหม่

**Files:** ลบไฟล์เดิมทั้งหมดใน `FE/`; Create `FE/package.json`, `FE/vite.config.ts`, `FE/tsconfig.json`, `FE/index.html`, `FE/.env.example`, `FE/src/main.tsx`, `FE/src/App.tsx`, `FE/src/vite-env.d.ts`, `FE/src/styles.css`

- [ ] ลบ `FE/` เดิม (ประวัติอยู่ใน git) และสร้างไฟล์ใหม่ตาม Tech Stack; scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `typecheck`, `test` (`vitest run`)
- [ ] `vite.config.ts` ตั้ง vitest `environment: "jsdom"`
- [ ] `.env.example`: `VITE_API_URL=` พร้อมคอมเมนต์ (ว่าง = โหมดจำลอง; ตัวอย่าง `http://localhost:3000` หรือ URL Render)
- [ ] `npm install` แล้ว `npm run build` ผ่าน
- [ ] Commit `feat(fe): replace mini chat with Virtual Universe scaffold`

### Task 2: ชนิดข้อมูล, คำแปล, ข้อมูล Portfolio, chatApi

**Files:** Create `src/types.ts`, `src/i18n/th.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`, `src/data/portfolio.ts`, `src/config/districts.ts`, `src/config/theme.ts`, `src/services/chatApi.ts`, `src/lib/storage.ts`; Test `src/i18n/i18n.test.ts`, `src/services/chatApi.test.ts`

**Interfaces (Produces):**
- `types.ts`: `Lang = "th"|"en"`, `Localized = {th:string; en:string}`, `DistrictId = "gate"|"nexus"|"projects"|"team"|"sanctuary"`, `AiForm = "orb"|"geometric"|"fluid"`, `Group`, `Member`, `Project`, `Contact`, `Portfolio`, `ChatSource = {title:string; url:string|null}`, `ChatMessage = {id:string; role:"user"|"assistant"; text:string; sources:ChatSource[]; error?:boolean}`, `ChatRequest = {text:string; sessionId:string|null; language:Lang; district:DistrictId}`, `ChatResult = {sessionId:string|null; reply:string; sources:ChatSource[]; mock:boolean}`
- `i18n/index.ts`: `type Dict = typeof th`; `t(lang:Lang, key:keyof Dict):string`; `pick(lang:Lang, v:Localized):string`; `useT(): (key) => string`
- `data/portfolio.ts`: `PENDING`, `portfolio: Portfolio` (group, 3 members, 3 projects, 2 contacts — ทั้งหมด placeholder)
- `config/districts.ts`: `DISTRICT_ORDER: DistrictId[]`, `DISTRICTS: Record<DistrictId, DistrictConfig>` (`name`, `tagline`, `position:[x,y,z]`, `camera:{position, target}`, `aiForm`, `color`, `map:[x,y]`), `isLinked(a,b)` (Hub: nexus ↔ ทุกที่)
- `services/chatApi.ts`: `sendChat(req, opts?:{baseUrl?:string; fetchImpl?:typeof fetch; timeoutMs?:number; mockDelayMs?:number}): Promise<ChatResult>`; `class ChatApiError extends Error { kind: "rate_limit"|"server"|"network"|"timeout"|"bad_response" }`; `isMockMode(baseUrl?)`; `WAKING_NOTICE_MS = 8000`; `DEFAULT_TIMEOUT_MS = 70000`
- `lib/storage.ts`: `load<T>(key, fallback:T):T`, `save(key, value):void` (กลืน error)

- [ ] เขียน test: ทุก key ใน `th` มีใน `en` และไม่ว่าง; `pick("en", {th:"ก", en:"A"}) === "A"`
- [ ] เขียน test chatApi:
  - ไม่มี baseUrl → `mock: true`, `reply` ไม่ว่าง, `sources.length >= 1`
  - fetch ได้ `{userMessage, assistantMessage:{text:"สวัสดี"}}` (ไม่มี sources/sessionId) → `{reply:"สวัสดี", sources:[], sessionId:null, mock:false}`
  - ได้ `sources:[{title:"A",url:null},{bad:1}]` → เก็บเฉพาะ `{title:"A",url:null}`
  - ได้ `sessionId:"s1"` → คืน `"s1"`; request body มี `text, sessionId, language, district`; URL = `${baseUrl}/messages` (ตัด `/` ท้าย baseUrl)
  - status 429 → `ChatApiError` kind `rate_limit`; 502 → `server` และ message = `body.error`
  - fetch throw TypeError → `network`; abort จาก timeout → `timeout`
  - JSON ไม่มี `assistantMessage.text` → `bad_response`
- [ ] รัน `npm test` เห็น FAIL
- [ ] เขียนโค้ดให้ผ่าน; คำตอบจำลองบอกชัดว่าเป็นโหมดจำลอง ไม่อ้างข้อมูลทีม (TH/EN ตาม `language`)
- [ ] `npm test` ผ่าน · Commit

### Task 3: สถานะกลางและการเดินทาง

**Files:** Create `src/store/useWorld.ts`, `src/store/useChat.ts`, `src/lib/hash.ts`; Test `src/store/world.test.ts`, `src/store/chat.test.ts`, `src/lib/hash.test.ts`

**Interfaces (Produces):**
- `useWorld` state: `lang`, `district`, `travel:{from,to}|null`, `introDone`, `pendingTarget:DistrictId`, `chatOpen`, `panel: {kind:"project"; id:string}|{kind:"team"}|{kind:"contact"}|null`, `quality:"high"|"low"`, `guideSeen`; actions: `setLang`, `travelTo(id)`, `finishTravel()`, `finishIntro()`, `setChatOpen(b)`, `toggleChat()`, `openPanel(p)`, `closePanel()`, `setQuality(q)`, `dismissGuide()`, `closeTopmost()` (ปิด panel ก่อน แล้วค่อยแชท)
- `useChat` state: `messages`, `sessionId`, `pending`, `waking`, `mock`; actions: `send(text)`, `retry()`
- `hash.ts`: `districtFromHash(h:string): DistrictId|null`, `hashFor(id): string` (`#/projects` ฯลฯ)

- [ ] test world: `travelTo` ระหว่าง `travel !== null` → ไม่เปลี่ยน; `travelTo(district ปัจจุบัน)` → ไม่เปลี่ยน; `finishTravel` → `district = to`, `travel = null`, ปิด panel; ก่อน `introDone` → `travelTo` ตั้ง `pendingTarget` แทน; `closeTopmost` ปิด panel ก่อนแชท; storage throw → `setLang` ยังเปลี่ยน state ได้
- [ ] test chat: `send("hi")` → messages = user + assistant (มี sources); error → assistant message `error:true`; `retry()` ส่งข้อความผู้ใช้ล่าสุดซ้ำ; `send("  ")` → ไม่ทำอะไร; ระหว่าง `pending` ส่งซ้ำไม่ได้
- [ ] test hash: `"#/projects"` → `"projects"`; `"#/xyz"`, `""` → `null`
- [ ] FAIL → implement → PASS · Commit

### Task 4: โลก 3D (ฉาก, กล้อง, 5 พื้นที่, ร่าง AI)

**Files:** Create `src/world/World.tsx`, `src/world/CameraRig.tsx`, `src/world/Environment.tsx` (ท้องฟ้า, หมอก, แสง, เมือง instanced, ฝน, อนุภาค, พื้น), `src/world/signTexture.ts`, `src/world/NeonSign.tsx`, `src/world/Portal.tsx`, `src/world/districts/{Gate,Nexus,Projects,Team,Sanctuary}District.tsx`, `src/world/ai/{EnergyOrb,GeometricEntity,FluidEntity,AiPresence}.tsx`, `src/world/useHashSync.ts`

**Interfaces:** Consumes `useWorld`, `useChat.pending`, `DISTRICTS`, `portfolio.projects`. Produces `<World/>` (Canvas ทั้งหมด)

- [ ] CameraRig: Intro = เคลื่อนผ่านเมืองเข้าหา Gate; travel = โค้งยกสูงระหว่างตำแหน่งกล้อง 1800 ms ease แล้ว `finishTravel()`; ปกติ = ค่อย ๆ เข้าท่าพื้นที่ + parallax ตามเมาส์; panel project เปิด = ซูมเข้าแท่นนั้น
- [ ] เรนเดอร์เฉพาะพื้นที่ `district`, `travel.from`, `travel.to`
- [ ] Portal คลิกได้ → `travelTo`; Nexus มีประตูไปทุกพื้นที่; พื้นที่อื่นมีประตูกลับ Nexus
- [ ] Projects: แท่นตามจำนวน `portfolio.projects` (1–3) คลิก → `openPanel({kind:"project", id})`
- [ ] Team: จอ Team และจอ Contact คลิก → panel ตามชนิด
- [ ] AI: ร่างตาม `DISTRICTS[id].aiForm` เต้นแรงขึ้นเมื่อ `pending`; คลิก → เปิดแชท
- [ ] `quality === "low"` ปิด bloom/ฝน/พื้นสะท้อน; `PerformanceMonitor` onDecline → `setQuality("low")`
- [ ] useHashSync: อ่าน hash ตอนเริ่ม → `pendingTarget`; district เปลี่ยน → เขียน hash; `hashchange` → `travelTo`
- [ ] `npm run build` ผ่าน · ตรวจในเบราว์เซอร์ว่าเดินทางครบทุกพื้นที่ · Commit

### Task 5: HUD, แชท, Panel

**Files:** Create `src/ui/Hud.tsx`, `src/ui/MiniMap.tsx`, `src/ui/LangSwitch.tsx`, `src/ui/SettingsMenu.tsx`, `src/ui/Guide.tsx`, `src/ui/ChatPanel.tsx`, `src/ui/ProjectPanel.tsx`, `src/ui/TeamPanel.tsx`, `src/ui/ContactPanel.tsx`, `src/ui/Pending.tsx`, `src/ui/useEscape.ts`, `src/ui/SmallScreenNotice.tsx`, `src/ui/CursorGlow.tsx`

- [ ] MiniMap SVG 5 จุดตาม `DISTRICTS[*].map` เส้นตาม `isLinked` จุดปัจจุบันเรือง คลิก → `travelTo`
- [ ] ChatPanel: ข้อความ User/AI, sources ใต้คำตอบ (ลิงก์เปิดแท็บใหม่ `rel="noopener noreferrer"`; url null = ข้อความเฉย ๆ), ป้ายโหมดจำลอง, สถานะกำลังคิด, ข้อความปลุกระบบเมื่อ `waking`, error + ปุ่มลองใหม่, textarea: Enter ส่ง / Shift+Enter ขึ้นบรรทัด / ไม่ส่งเมื่อ `isComposing`; กว้างขึ้นเมื่ออยู่ `sanctuary`
- [ ] Panel ทุกตัวใช้ `<Pending/>` แสดงป้าย "รอข้อมูล" เมื่อ `placeholder`; ลิงก์ demo/github ที่เป็น null กดไม่ได้
- [ ] Esc → `closeTopmost()`
- [ ] Guide 3 ขั้นที่ Nexus ครั้งแรก ปิดแล้วไม่แสดงอีก
- [ ] `npm run build` ผ่าน · ตรวจในเบราว์เซอร์ · Commit

### Task 6: Intro, เอฟเฟกต์, ตรวจรับ

**Files:** Create `src/ui/Intro.tsx`; Modify `src/App.tsx`, `src/styles.css`; Create `FE/README.md`

- [ ] Intro 4500 ms: ความคืบหน้าการโหลด + ชื่อกลุ่ม (PENDING) + Skip → ปุ่ม Enter → `finishIntro()` แล้วเดินทางไป `pendingTarget` (ค่าเริ่ม nexus)
- [ ] README ของ FE: วิธีรัน, `.env`, โครงไฟล์, จุดที่ต้องใส่ข้อมูลจริง
- [ ] รัน `npm test`, `npm run build` ผ่าน; เดินตาม Acceptance ข้อ 14 ของ spec ในเบราว์เซอร์ (รวมโหมดต่ำ, สลับภาษา, Back ของเบราว์เซอร์, Console ไม่มี error)
- [ ] Commit
