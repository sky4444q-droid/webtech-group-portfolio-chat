# NEXORA Virtual Universe — Round 3 (Neon Street) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the five separate plazas into one continuous neon street around a Nexus crossroads. The street is dense with code-built signs, screens and props, has deep-black/saturated colour and a mirror floor, and a mascot leads every trip. A flat red HUD replaces the glowing boxes and the Mini Map.

**Architecture:**
- **Pure logic modules.** These are unit-tested with Vitest:
  - street geometry and routes
  - guide-trip timeline
  - seeded street-kit layout
  - sign words and atlas packing
  - screen update policy
  - quality flags
- **R3F components.** These render what the logic modules return.
- **Shared mutable state.** One object carries per-frame mascot and AI visibility from `CameraRig` to the scene components, the same pattern as the existing `elevatorDoors`.
- **What stays.** All non-visual systems stay as they are: chat, `/portfolio`, i18n, hash routing, audio, holograms, discovery.

**Tech Stack:** React 19, TypeScript, Vite 8, three 0.187, @react-three/fiber 9, drei 10, @react-three/postprocessing 3, zustand 5, Vitest 5 + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-17-virtual-universe-round3-design.md` (Thai). The visual target is `docs/reference/street-reference.webp`. It is git-ignored and local only; compare against it in every visual step.

## Global Constraints

- **Paths and branch.** Work only in `FE/`. Never modify `BE/`. Branch `feature/vu-round3`. Commit per task. Never push.
- **External files.** Use only CC0 files from ambientCG or Poly Haven, stored under `FE/public/assets/`. List every file in `FE/CREDITS.md`. `FE/public/assets/` must total ≤ 8 MB.
- **Fonts.** Load them via the existing Google Fonts `<link>` in `FE/index.html` only. Add Noto Sans JP 700, Noto Sans SC 700 and one bold grotesk (Inter Tight 800). Never commit font files.
- **Composer.** `EffectComposer` must always keep `multisampling={0}`. MSAA there caused the high-quality flicker.
- **Sign text.** Signs and ads use invented shop names or real, correctly-meant words. Use no real brand names and no team data.
- **Team data.** Team data comes only from `GET /portfolio` (`usePortfolio`). The only project is NEXORA Virtual Universe. AI voice lines talk only about places and how to use the site.
- **Controls.** Mouse only. Add no keyboard movement.
- **Quality choice.** Do not regress `qualityChosen`: auto-lowering never overrides a visitor's choice.
- **Things that must keep working:**
  - chat with the backend
  - TH/EN switching
  - `#/district` hash routing, including Back during a trip queueing the destination
  - Esc
  - sound settings
  - hologram and fullscreen panels
  - discovery fragments
- **Layout.** District anchors, relative to Nexus at `[0,0,0]`:

  | District | Anchor | Direction |
  | --- | --- | --- |
  | gate | `[-46,0,0]` | street along −x |
  | team | `[46,0,0]` | +x |
  | projects | `[0,0,-48]` | −z, Gallery Avenue |
  | sanctuary | `[0,0,44]` | +z, the narrow alley |

  Builders may tune these by a few units, but tests assert the relations, not the numbers.
- **Trip length.** A trip, excluding elevator time, lasts ≤ 9000 ms.
- **Verification.** Each task ends with `npm test` and `npm run build`, both run in `FE/`, plus a visual check in the browser pane (launch config `fe-dev`, port 5173).

## Review Focus

1. **Navigating during a guide trip.** This covers a nav pill click, the browser Back button and a hash change, including during the elevator segment. Expected: a history-driven destination is queued and runs after arrival; a pill click mid-trip is ignored; the state never sticks with `travel` set. Test in Task 2.
2. **Leaving Team HQ, or a deep link to it.** For `#/team` on load, the reduced-motion preference, or low quality, expect a single fade. A normal trip *from* team starts with the elevator going down, then walks. Test in Task 2.
3. **Fonts not ready, or Google Fonts blocked.** Expected: the sign atlas still builds with system fallback fonts. It is rebuilt once when `document.fonts` resolves, so signs never stay blank or show tofu boxes. Test in Task 5.
4. **Language switch while standing in the street.** Expected: wayfinding signs and info panels change language. Decorative CJK/Thai signs do not change. No per-frame atlas rebuild happens. Test in Task 5.
5. **Quality switch while a trip runs.** Expected: low quality turns trips into a fade from the next trip onward; the current trip completes. Fx flags match exactly per quality. Test in Task 6.

---

### Task 1: Street layout, routes and re-placed districts

**Files:**
- Create: `FE/src/world/street/streets.ts`
- Create: `FE/src/world/street/streets.test.ts`
- Create: `FE/src/world/street/StreetBlockout.tsx` (temporary dark walls; replaced in Task 3)
- Modify: `FE/src/config/districts.ts` (positions, map coords removed later in Task 7)
- Modify: `FE/src/config/viewpoints.ts`
- Modify: `FE/src/config/viewpoints.test.ts`
- Modify: `FE/src/world/intro/introPath.ts`
- Modify: `FE/src/world/intro/intro.test.ts`
- Modify: `FE/src/store/useDiscovery.ts` (fragment positions)
- Modify: `FE/src/world/World.tsx`
- Modify: `FE/src/world/Environment.tsx` (stop rendering `City` inside the street footprint)

**Interfaces:**
- Produces:
  - `type StreetId = "gateLane" | "galleryAvenue" | "officeRow" | "sanctuaryAlley"`
  - `interface Street { id: StreetId; district: Exclude<DistrictId,"nexus">; halfWidth: number; points: [number, number][] /* xz polyline from the Nexus edge to the district anchor */; mood: "food" | "gallery" | "office" | "shrine" }`
  - `STREETS: Record<StreetId, Street>`
  - `streetOf(d: DistrictId): Street | null` (null for nexus)
  - `routeBetween(from: DistrictId, to: DistrictId): [number, number][]`: an xz polyline that passes within 3 units of `[0,0]` whenever neither end is nexus.
  - `polylineLength(p: [number, number][]): number`
  - `NEXUS_HALF = 9`: the half-size of the crossroads square.
  - `GATE_ARCH: Vec3`: the arch at the outer end of `gateLane`.
  - `introPath.mascotAt(t)` and `introCamera(t)`: unchanged signatures.

- [ ] **Step 1: Write `streets.test.ts`.**
  - `it("connects every district except nexus with one street")`: `streetOf(d)` is non-null for gate, team, projects and sanctuary; it is null for nexus.
  - `it("starts each street at the crossroads and ends at its district")`: the first point is within `NEXUS_HALF + 1` of `[0,0]`; the last point is within 2 of `DISTRICTS[d].position` (xz).
  - `it("routes through the crossroads between two outer districts")`: for every ordered pair of distinct outer districts, some point of `routeBetween` lies within 3 of `[0,0]`; the first point is near `from` (≤ 2); the last point is near `to` (≤ 2).
  - `it("keeps each street 35–55 units long")`
  - `it("makes the sanctuary alley the narrowest and gallery avenue the widest")`: compare `halfWidth` values.
- [ ] **Step 2: Run the test and confirm it fails.**
  Run: `npm test -- src/world/street/streets.test.ts` in `FE/`. Expected: FAIL, because the module is not found.
- [ ] **Step 3: Implement `streets.ts`.**
  - Move the `DISTRICTS` positions to the anchors in Global Constraints.
  - Set the half-widths: gateLane 3, galleryAvenue 6, officeRow 4.5, sanctuaryAlley 2.
  - Streets are straight polylines, with a slight bend allowed.
  - `routeBetween` = reverse(street(from)) + street(to). Use one street alone when either end is nexus.
- [ ] **Step 4: Run the test and confirm it passes.**
  Run the same command. Expected: PASS.
- [ ] **Step 5: Update `viewpoints.test.ts` to the new world.**
  - Delete the test "starts each district at its existing default camera".
  - Change the offset test to use `DISTRICTS.team.position`.
  - Add `it("keeps every viewpoint inside its street or the crossroads")`. Each viewpoint position (world xz) must be inside `NEXUS_HALF` for nexus, or within `halfWidth + 1` of its street polyline for the other districts. Team HQ's lobby viewpoints are exempt, because they are indoors and keep their lobby-relative coordinates.
  - Add `it("puts the nexus wide view on the footbridge")`: nexus viewpoint `bridge` has `mode: "wide"` and `position[1]` between 5 and 8.
- [ ] **Step 6: Update `intro.test.ts`.**
  - "camera stays 3–5 units behind": "behind" now means `cam[0] < m[0]`, the arch side, because the mascot walks toward +x.
  - "ends with the mascot at the gate anchor": the distance to `DISTRICTS.gate.position` is ≤ 2.
  - "starts at the arch": `mascotAt(0)` is within 2 of `GATE_ARCH`.
- [ ] **Step 7: Run the tests and confirm the new ones fail.** Run `npm test`. Expected: the intro and viewpoint tests FAIL.
- [ ] **Step 8: Rewrite `viewpoints.ts` and `introPath.ts`, and move the fragments.**
  - Viewpoints:
    - gate: `lane`, `toArch`
    - nexus: `center` (eye level), `bridge` (wide)
    - projects: `hall`, `pedestal`
    - team: unchanged
    - sanctuary: `edge`, `presence`
  - Keep the existing i18n keys where an id survives. Add Thai and English labels for the new ids.
  - Intro: the mascot walks from `GATE_ARCH` along +x to the gate anchor in `INTRO_MS`. The camera follows on the −x side.
  - Move each `FRAGMENTS` entry so it sits beside its viewpoint in the new layout.
  - Team HQ: the street ends at the office door, which is the team anchor. The lobby, with its unchanged scene and viewpoints, sits inside the end building past the door, at `TEAM_LOBBY_OFFSET = [8, 0, 0]` from the anchor; add it to the team viewpoint positions. The lobby is never seen from the street, because the facade (Task 4) is opaque.
- [ ] **Step 9: Add `StreetBlockout`.**
  It draws dark box walls along both sides of every street at `halfWidth`, plus a crossroads floor, so the new world is walkable. Mount it in `World.tsx`. Stop mounting `GalleryAvenue` and `ArrivalAlley` there.
- [ ] **Step 10: Run the full check.**
  Run `npm test` and `npm run build`. Expected: all tests pass and the build passes.
- [ ] **Step 11: Check in the browser.**
  The intro walks from the arch toward Nexus. Every viewpoint, reached through the hash and the existing travel, shows a street and no void.
- [ ] **Step 12: Commit.**
  `git commit -m "feat(fe): crossroads street layout, routes and re-placed viewpoints"`

### Task 2: Mascot guides every trip

**Files:**
- Create: `FE/src/world/travel/guideTrip.ts`
- Create: `FE/src/world/travel/guideTrip.test.ts`
- Create: `FE/src/world/travel/guideState.ts`
- Modify: `FE/src/world/travel/kind.ts`
- Modify: `FE/src/world/travel/tripDurations.ts`
- Modify: `FE/src/world/travel/travel.test.ts`
- Modify: `FE/src/config/timing.ts`
- Modify: `FE/src/store/useWorld.ts`
- Modify: `FE/src/store/world.test.ts`
- Modify: `FE/src/store/useAi.ts`
- Modify: `FE/src/store/ai.test.ts`
- Modify: `FE/src/ui/Intro.tsx`
- Modify: `FE/src/world/CameraRig.tsx`
- Modify: `FE/src/world/ai/Mascot.tsx`
- Modify: `FE/src/world/ai/AiPresence.tsx`
- Modify: `FE/src/ui/TravelOverlay.tsx`
- Delete: `FE/src/world/travel/paths.ts`
- Delete: `FE/src/world/Portal.tsx`
- Delete: `FE/src/world/travel/GalleryAvenue.tsx`
- Delete: `FE/src/world/ArrivalAlley.tsx`
- Delete: the CSS for the portal tunnel

**Interfaces:**
- Consumes: `routeBetween` and `polylineLength` (Task 1); `elevatorCamera` and `elevatorDoors` (existing `ElevatorScene.tsx`).
- Produces:
  - `type TravelKind = "guide" | "fade"`
  - `travelKind(from, to, opts: { reducedMotion: boolean; quality: Quality; deepLink?: boolean }): TravelKind`
  - `type SegmentKind = "shrink" | "elevatorDown" | "walk" | "elevatorUp" | "morph" | "turn"`
  - `interface GuidePlan { segments: { kind: SegmentKind; ms: number }[]; route: THREE.CatmullRomCurve3; totalMs: number }`
  - `planGuideTrip(from: DistrictId, to: DistrictId): GuidePlan`
  - `guideAt(plan: GuidePlan, ms: number)`, returning `{ segment: SegmentKind; k: number; mascot: Vec3; heading: number; mascotVisible: boolean; aiFrom: number; aiTo: number; camera: { position: Vec3; target: Vec3 } | null }`. `camera` is `null` during elevator segments, where `CameraRig` uses `elevatorCamera`.
  - `guideState`, a module-level mutable object: `{ mascot: THREE.Vector3; heading: number; visible: boolean; aiFrom: number; aiTo: number; from: DistrictId | null; to: DistrictId | null }`
  - Timing constants: `SHRINK_MS = 600`, `MORPH_MS = 900`, `TURN_MS = 600`, `GUIDE_MAX_MS = 9000`, `WALK_SPEED = 6.5` units/s. The walk speeds up when needed so that `totalMs - elevator ms ≤ GUIDE_MAX_MS`.
  - `useWorld.travelTo(id, opts?: { fromHistory?: boolean; deepLink?: boolean })`
  - `finishIntro` passes `deepLink: pendingTarget !== "nexus"`.
  - `skipWalk` works when `travelKind === "guide"`.
  - `MascotPhase` becomes `"walk" | "turn" | "guide"`. The mascot no longer disappears after the intro.

- [ ] **Step 1: Write `guideTrip.test.ts`.**
  - `it("walks nexus → projects as shrink, walk, morph")`
  - `it("starts from the gate without shrinking (the mascot is already there)")`: for gate → nexus, the segments are `["walk", "morph"]`.
  - `it("turns to greet instead of morphing when arriving at the gate")`: the last segment is `"turn"`.
  - `it("goes up the elevator after walking to team HQ")`: for nexus → team, the segments are `["shrink", "walk", "elevatorUp", "morph"]`.
  - `it("leaves team HQ by elevator first")`: for team → projects, the segments are `["shrink", "elevatorDown", "walk", "morph"]`.
  - `it("keeps every trip within 9 s excluding the elevator")`: check every ordered pair.
  - `it("keeps the camera 3–5 units behind the mascot while walking")`: sample 10 walk times; the flat distance is within [3, 5]; the camera is on the opposite side of the heading.
  - `it("hides the origin AI during shrink and reveals the destination AI during morph")`: `aiFrom` is 1 → 0 across the shrink; `aiTo` is 0 → 1 across the morph; `mascotVisible` is false at `totalMs` unless the destination is the gate.
  - `it("returns no camera during elevator segments")`
- [ ] **Step 2: Update `travel.test.ts` and `world.test.ts`.**
  - Replace the `travelKind` table with:
    - all pairs → `"guide"` normally
    - `"fade"` for reduced motion, low quality or `deepLink`
  - Delete the `walkPath` tests.
  - In `world.test.ts`, add `it("fades a deep link after the intro")`: `pendingTarget = "team"`, then `finishIntro()`, then `travelKind === "fade"`.
  - Add `it("guides the default first trip to nexus")`
  - Add `it("queues a history destination pressed during a guide trip and runs it on arrival")`
  - Add `it("ignores a non-history travel request during a trip")`
  - Add `it("lets skipWalk work during guide trips")`
  - In `ai.test.ts`, replace the morph/gone expectations with the new phases.
- [ ] **Step 3: Run the tests and confirm they fail.**
  Run `npm test`. Expected: FAIL, because `guideTrip` is missing and the travel expectations have changed.
- [ ] **Step 4: Implement the logic.**
  - Write `guideTrip.ts` and `guideState.ts`.
  - Update `kind.ts`, `tripDurations.ts` (guide uses `planGuideTrip(...).totalMs`, fade uses `FADE_MS`) and `timing.ts`.
  - Remove `TRAVEL_MS`, `WALK_MS`, `WALK_PRE_MS` and `PORTAL_MS`.
  - Update `useWorld` and `useAi`.
- [ ] **Step 5: Run the tests and confirm they pass.** Run `npm test`. Expected: PASS.
- [ ] **Step 6: Wire the scene.**
  - `CameraRig`: during a guide trip, call `guideAt` and write `guideState` every frame. During `morph`, blend the camera to `viewpointWorld(to, 0)`. Elevator segments reuse `elevatorCamera` and `elevatorDoors`; `elevatorDown` plays it in reverse. Keep the step and whoosh sound cues; footsteps play on the mascot's steps.
  - `Mascot`: reads `guideState` after the intro. It is always mounted and hides itself when `visible` is false. Add the glowing NEXORA hexagon mark on its back, a ring-shaped hexagon outline (not chevrons). Shift the body glow from green toward cyan.
  - `AiPresence`: scale by `aiFrom` when the district is the trip origin, and by `aiTo` when it is the destination.
  - `Intro.tsx`: on Enter, set the phase to `"guide"` and call `finishIntro()`. Remove the morph and gone timers.
  - `TravelOverlay`: show the skip button for `"guide"`; keep the fade veil for `"fade"`.
  - Delete the files listed above, and their mounts in `World.tsx` and `GateDistrict.tsx`.
- [ ] **Step 7: Run the full check.** Run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 8: Check in the browser.**
  - Intro → Enter → the mascot keeps walking into Nexus.
  - nexus → projects; nexus → team (elevator); team → sanctuary (elevator down, then the alley); sanctuary → gate (turn).
  - Click to skip mid-walk. Browser Back mid-trip queues the destination.
  - Set low quality → trips fade.
- [ ] **Step 9: Commit.** `git commit -m "feat(fe): mascot guides every trip; remove fly/portal travel"`

### Task 3: Seeded street kit, CC0 surfaces, environment swap

**Files:**
- Create: `FE/src/lib/rng.ts`
- Create: `FE/src/lib/rng.test.ts`
- Create: `FE/src/world/street/kitLayout.ts`
- Create: `FE/src/world/street/kitLayout.test.ts`
- Create: `FE/src/world/street/StreetKit.tsx`
- Create: `FE/src/world/street/kitMeshes.tsx` (one instanced renderer per kit type)
- Create: `FE/src/world/street/Sky.tsx` (the narrow dark sky strip)
- Modify: `FE/src/world/Environment.tsx`: remove `City`, `Stars`, the purple sparkles and the `GroundFog` layers above the knees. Keep rain, splashes, traffic and street lights, re-placed along the streets.
- Modify: `FE/src/world/fx/fx.test.ts`
- Modify: `FE/CREDITS.md`
- Add: `FE/public/assets/textures/*.jpg`
- Delete: `FE/src/world/street/StreetBlockout.tsx`

**Interfaces:**
- Consumes: `STREETS`, `NEXUS_HALF`, `routeBetween` (Task 1).
- Produces:
  - `mulberry32(seed: number): () => number`
  - `type KitType = "facade" | "shopfront" | "balcony" | "signH" | "signV" | "lightbox" | "screen" | "bigScreen" | "panel" | "ac" | "pipe" | "cable" | "vent" | "crate" | "vending" | "lamp" | "steam" | "endCap"`
  - `interface KitItem { type: KitType; street: StreetId | "nexus"; position: Vec3; rotationY: number; size: Vec3; variant: number; side: -1 | 1 }`
  - `layoutStreet(street: Street, seed: number): KitItem[]`
  - `layoutNexus(seed: number): KitItem[]` (four corner towers, each with a `bigScreen`, plus the footbridge)
  - `CITY_SEED = 2026`

- [ ] **Step 1: Write `rng.test.ts`.**
  - It is the same sequence for the same seed.
  - Values are in [0, 1).
  - Different seeds give different sequences.
- [ ] **Step 2: Write `kitLayout.test.ts`.**
  - `it("is deterministic for a seed")`
  - `it("keeps a clear walking corridor")`: no item with `position[1] < 2.6` lies within 1.2 of the street's centre polyline. Hanging items (cables, signs) are allowed above 2.6.
  - `it("lines both sides with facades from start to end")`: the facade coverage per side is ≥ 90 % of the street length.
  - `it("is dense like the reference")`: there are ≥ 1.2 items of type signH, signV, lightbox, screen or panel per unit of street length.
  - `it("puts at least one bigScreen on every street and at nexus")`
  - `it("closes the far end of every street")`: one `endCap` sits beyond the last point. On `officeRow`, the end building is the Team HQ facade from Task 4, so the kit leaves the 12 × 12 area past the anchor empty; assert that no kit item lies inside it.
  - `it("varies sign variants so neighbours differ")`: no two consecutive signs on the same side share a variant.
- [ ] **Step 3: Run the tests and confirm they fail.** Run `npm test`. Expected: FAIL, because the modules are missing.
- [ ] **Step 4: Implement `rng.ts` and `kitLayout.ts`.**
  - Facades are 4–9 wide with heights from 12 to 40.
  - Shopfronts sit on the ground floor.
  - Signs and props are placed on the facades, pushed out by their depth.
  - Mood-specific props:
    - food: steam, crates
    - office: fewer props, more lightboxes
    - shrine: dense cables, lamps
- [ ] **Step 5: Run the tests and confirm they pass.** Run `npm test`. Expected: PASS.
- [ ] **Step 6: Download the CC0 textures.**
  - Download from ambientCG at 1K: one large dark floor tile (NormalGL + Roughness), one stained concrete wall (Color + NormalGL), one metal wall panel (NormalGL + Roughness).
  - Optionally, one grimy glass texture.
  - Convert them to JPEG q80 and name them `textures/<assetid-lowercase>_<map>.jpg`.
  - Add a CREDITS row for each file.
  - Extend `fx.test.ts`: `it("keeps public/assets at or under 8 MB")`.
- [ ] **Step 7: Build `StreetKit` and `kitMeshes`.**
  - Use one `InstancedMesh` per kit type. Facades use the concrete or metal textures with an emissive window pattern; shopfronts get emissive glass.
  - In this task, signs, screens and panels render as emissive placeholders with a per-variant colour. Their real faces come in Task 5.
  - The floor uses tiles on the crossroads and gallery avenue, and the existing asphalt in the lanes.
  - Mount `StreetKit` for the current street, plus the streets in the current trip's route. Always mount the nexus.
- [ ] **Step 8: Run the full check.** Run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 9: Check in the browser and compare with the reference.**
  - At eye level in every street, the buildings close in on both sides, with no void or sky gap except the narrow strip.
  - More than 15 sign/screen placeholders are in frame.
  - Take a screenshot of each street.
- [ ] **Step 10: Commit.** `git commit -m "feat(fe): seeded neon street kit with CC0 surfaces"`

### Task 4: Places rebuilt on the street

**Files:**
- Modify: `FE/src/world/districts/GateDistrict.tsx`: a glowing arch at `GATE_ARCH`, no portal.
- Modify: `FE/src/world/districts/NexusDistrict.tsx`: the crossroads, the AI orb above its centre, and the footbridge that the `bridge` viewpoint stands on.
- Modify: `FE/src/world/districts/ProjectsDistrict.tsx`: a gallery hall closing the avenue, with the existing pedestal, hologram and showcase zoom inside.
- Modify: `FE/src/world/districts/TeamDistrict.tsx`: a glass office facade and door at the street end. The lobby stays as it is (indoors, reached by the elevator).
- Modify: `FE/src/world/districts/SanctuaryDistrict.tsx`: a glowing archway at the alley mouth and a small courtyard. Keep the large Fluid AI and `DiscoveryReward`.
- Modify: `FE/src/world/districts/common.tsx`
- Modify: `FE/src/world/layout.ts` (`showcaseCamera` for the new hall position)

**Interfaces:**
- Consumes:
  - `DISTRICTS` positions, `VIEWPOINTS`, `GATE_ARCH` and `NEXUS_HALF` (Task 1)
  - `guideState` (Task 2)
  - `layoutNexus` (Task 3)
- Produces: no new exports beyond the components above.

- [ ] **Step 1: Rebuild the five district scenes.**
  - Each district scene renders only its place-specific pieces. Facades come from `StreetKit`.
  - Remove the round plazas, platforms and the large floating district signs. The name now appears on wayfinding signs (Task 5).
- [ ] **Step 2: Check `showcaseCamera` with the existing tests.**
  - Run `npm test`. Expected: PASS.
  - If the showcase pose changed, update the expectations in the test that covers it, using the hall's new coordinates.
- [ ] **Step 3: Run the full check.** Run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 4: Check in the browser.**
  - At every viewpoint of every place, the AI form is correct, the hologram cards and the fullscreen view open, and the fragments are visible and collectable.
  - The Team lobby is still reached only through the elevator.
- [ ] **Step 5: Commit.** `git commit -m "feat(fe): rebuild the five places as parts of the street"`

### Task 5: Signs, screens, info panels and fonts

**Files:**
- Create: `FE/src/config/signWords.ts`
- Create: `FE/src/config/signWords.test.ts`
- Create: `FE/src/world/street/atlas.ts` (pure packing)
- Create: `FE/src/world/street/atlas.test.ts`
- Create: `FE/src/world/street/signAtlas.ts` (canvas drawing; not unit-tested)
- Create: `FE/src/world/street/screenPolicy.ts`
- Create: `FE/src/world/street/screenPolicy.test.ts`
- Create: `FE/src/world/street/screenPrograms.ts` (canvas 2D draw functions)
- Create: `FE/src/world/street/WaterScreen.tsx` (shader)
- Create: `FE/src/world/street/InfoPanel.tsx`
- Create: `FE/src/world/street/wayfinding.ts`
- Create: `FE/src/world/street/wayfinding.test.ts`
- Create: `FE/src/lib/fonts.ts`
- Create: `FE/src/lib/fonts.test.ts`
- Modify: `FE/src/world/street/kitMeshes.tsx`
- Modify: `FE/index.html`
- Modify: `FE/src/i18n/th.ts`
- Modify: `FE/src/i18n/en.ts`
- Modify: `FE/src/world/textures.ts`

**Interfaces:**
- Consumes: `KitItem` and `KitType` (Task 3); `usePortfolio` (existing).
- Produces:
  - `type SignLang = "ja" | "zh" | "th" | "en"`
  - `interface SignWord { text: string; lang: SignLang; vertical?: boolean }`
  - `SIGN_WORDS: Record<Street["mood"] | "nexus", SignWord[]>`
  - `BANNED_WORDS: string[]`: a small list of real brand names, checked by the tests.
  - `packAtlas(sizes: { w: number; h: number }[], atlasSize: number): { x: number; y: number; w: number; h: number; page: number }[]`
  - `screenInterval(distance: number, quality: Quality): number | null`: ms between redraws; `null` means frozen.
  - `wayfindingLabel(target: DistrictId, lang: Lang): string`: the localized place name plus an arrow.
  - `whenFontsReady(timeoutMs: number, fonts?: { ready: Promise<unknown> } | undefined): Promise<"ready" | "timeout" | "unsupported">`

- [ ] **Step 1: Write the tests.**
  - `signWords.test.ts`:
    - every mood has ≥ 20 words and contains all four languages
    - no duplicates within a mood
    - no word contains a `BANNED_WORDS` entry, case-insensitive
    - every `vertical` word is CJK
  - `atlas.test.ts`:
    - no two rects overlap on the same page
    - every rect fits inside `atlasSize`
    - an oversized item throws
    - the packing is deterministic
  - `screenPolicy.test.ts`:
    - high: near (< 12) → ≤ 100 ms; mid (12–35) → 250–600 ms; far (> 35) → `null`
    - low: always `null`
  - `wayfinding.test.ts`: `wayfindingLabel("projects", "th")` contains the Thai name from `DISTRICTS`, and the `"en"` call contains the English name. Each includes an arrow `→`.
  - `fonts.test.ts`:
    - resolves `"ready"` when `ready` resolves
    - resolves `"timeout"` after `timeoutMs` when `ready` never resolves (use fake timers)
    - resolves `"unsupported"` when no fonts object is given
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement the five pure modules.**
  Implement `signWords.ts`, `atlas.ts`, `screenPolicy.ts`, `wayfinding.ts` and `fonts.ts`. Use the words from spec §8, such as 夜市, ラーメン, 電脳, 薬局, 酒場, 营业中, ร้านซ่อมไซบอร์ก, ข้าวมันไก่, NOODLE BAR and OPEN 24H. Every CJK word must be checked for correct meaning, with nothing rude, political or religious.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Wire the visuals.**
  - Add the fonts to the Google Fonts link in `index.html`.
  - `signAtlas` draws the words into one or two atlas pages. It builds immediately with the fallback stack, then rebuilds once after `whenFontsReady(4000)`.
  - The sign kit types sample the atlas by UV. Some signs flicker; flickering is off in low quality.
  - Screens use `screenPrograms`: fake shop ad, equaliser, scrolling text, geometric scanlines, glitch. They redraw on `screenInterval`.
  - `bigScreen` items use `WaterScreen` (an animated caustic/water shader, cyan-teal, the brightest thing in frame). At least one key screen per street shows `/images/nexora-emblem.png` and a wayfinding label.
  - `InfoPanel` is a large flat panel with a thin frame, text blocks and wireframe line art, showing one of:
    - decorative words
    - place name plus how-to text (i18n)
    - on Gallery Avenue, the project name and tech stack from `usePortfolio`
  - Wayfinding signs and info panels re-render when `lang` changes. Decorative signs do not.
- [ ] **Step 6: Run the full check.** Run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 7: Check in the browser and compare with the reference.**
  - The Thai, Japanese and Chinese text renders with no boxes.
  - Switching TH/EN changes only the wayfinding signs and info panels.
  - Far screens are static, and the frame rate is steady.
- [ ] **Step 8: Commit.** `git commit -m "feat(fe): trilingual neon signs, code-drawn screens and info panels"`

### Task 6: Colour, light, reflections and quality flags

**Files:**
- Modify: `FE/src/config/theme.ts`
- Modify: `FE/src/styles.css` (`:root` colour variables)
- Modify: `FE/src/world/World.tsx`
- Modify: `FE/src/world/Environment.tsx`
- Modify: `FE/src/world/fx/fxEnabled.ts`
- Modify: `FE/src/world/fx/fx.test.ts`
- Modify: `FE/src/world/fx/Effects.tsx`
- Create: `FE/src/world/street/FakeReflections.tsx`

**Interfaces:**
- Produces:
  - `FxFlags = { cones, flare, traffic, rain, reflector, bloom, grading, dof, steam, signFlicker, screensAnimated: boolean; fogLayers: number }`
  - `fxEnabled("high")` returns all booleans true and `fogLayers: 1`.
  - `fxEnabled("low")` returns all booleans false and `fogLayers: 1`.

- [ ] **Step 1: Write the tests.**
  - Update `fx.test.ts` to the exact objects above.
  - Add `it("uses a near-black background with no purple cast")`: the `COLORS.bg` channels are each ≤ 0x0a, and blue − red ≤ 4.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npm test`. Expected: FAIL.
- [ ] **Step 3: Update `fxEnabled` and `COLORS`.**
  - New palette: bg `#040406`, fog `#05070c`. Keep the pink, cyan, purple and red accents saturated, and add `red: "#ff1f3d"` for the HUD.
  - Mirror the values in the CSS variables.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Change the lighting and effects.**
  - Remove the purple ambient, hemisphere and directional lights. Keep only a very dim neutral ambient; light now comes from emissives and street lights.
  - Reflector, high quality: `mirror` around 0.9, low blur, resolution 1024 (drop to 512 if the GPU budget fails in Task 8). Use the tile roughness so the tile seams show.
  - Low quality: `FakeReflections` draws stretched, additive, vertical gradient planes under key signs and screens.
  - Composer (`multisampling={0}`): Bloom, then `BrightnessContrast` and `HueSaturation` for grading, then `DepthOfField` (only when `dof`, focused at the mascot's distance, subtle), then Vignette.
  - Fog is one thin layer below the knees, plus a light blue distance haze. Steam comes from the steam kit items when `steam` is on.
- [ ] **Step 6: Run the full check.** Run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 7: Check in the browser.**
  - Compare side by side with the reference: deep blacks, saturated neon, a near-mirror floor in high quality, no purple haze.
  - Check low quality on the same views.
  - Run a burst of 8 screenshots at nexus and in one street in high quality. There must be no all-black frame.
- [ ] **Step 8: Commit.** `git commit -m "feat(fe): deep-black neon grade, mirror floor and quality flags"`

### Task 7: Flat HUD, nav pills, UI restyle

**Files:**
- Create: `FE/src/ui/NavPills.tsx`
- Create: `FE/src/ui/navPills.test.tsx`
- Create: `FE/src/ui/ControlHint.tsx`
- Modify: `FE/src/ui/Hud.tsx`
- Modify: `FE/src/styles.css`
- Modify: `FE/src/ui/Intro.tsx` (restyle only)
- Modify: `FE/src/config/districts.ts` (drop `map` and `short` if nothing uses them)
- Modify: `FE/src/i18n/th.ts`
- Modify: `FE/src/i18n/en.ts`
- Delete: `FE/src/ui/MiniMap.tsx`
- Delete: the Mini Map CSS

**Interfaces:**
- Consumes: `useWorld.travelTo`, `travel` and `district`; `DISTRICT_ORDER`; `DISTRICTS[id].name`.
- Produces:
  - `NavPills()`: 5 `<button>`s in `DISTRICT_ORDER`. The active one has `aria-current="location"` and the class `is-active`. The active one is `travel?.to ?? district`.
  - `ControlHint()`: a mouse-usage hint that fades after `HINT_MS = 6000` and reappears on district arrival.

- [ ] **Step 1: Write `navPills.test.tsx`.**
  Use the same `createRoot` and `act` pattern as `fullscreen.test.tsx`.
  - `it("renders the five places in order in the selected language")`
  - `it("marks the current place")`
  - `it("marks the destination during a trip")`
  - `it("travels on click")`: clicking Projects sets `travel.to` to `"projects"`.
  - `it("does nothing when clicking the current place")`
- [ ] **Step 2: Run the test and confirm it fails.** Run `npm test -- src/ui/navPills.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement `NavPills`, `ControlHint` and the HUD layout.**
  - Top-left: a large bold red "NEXORA" (Inter Tight 800) with the small logo, and 2–3 small red lines below: the current place, plus one general line about the site from i18n.
  - Top-centre: `NavPills`. Small red text; the active pill is a solid red capsule.
  - Top-right: language, sound, settings and the discovery counter, restyled flat.
  - Bottom-left: `ControlHint`.
  - Bottom-right: contact and talk-to-AI, restyled flat.
  - Remove `MiniMap`.
  - Restyle the subtitle, chat panel, hologram cards, fullscreen view and intro screen to the same flat language: thin lines, flat type, red and cyan accents, no glowing boxes.
- [ ] **Step 4: Run the full check.** Run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Check in the browser and compare with the reference HUD.**
  - Every button still works: language, sound, quality, Back, contact, chat, Esc.
  - Thai text renders at every size.
- [ ] **Step 6: Commit.** `git commit -m "feat(fe): flat red HUD with nav pills, replacing the mini map"`

### Task 8: Street ambience, flicker probe and performance pass

**Files:**
- Modify: `FE/src/audio/sfx.ts`
- Modify: `FE/src/audio/useAudioDirector.ts`
- Modify: `FE/src/store/audio.test.ts`
- Create: `FE/src/debug/flickerProbe.ts`
- Modify: `FE/src/world/World.tsx`

**Interfaces:**
- Consumes: `StreetId` and `streetOf` (Task 1); `guideState` (Task 2).
- Produces:
  - `type AmbienceId = StreetId | "nexus" | null`
  - `ambienceFor(district: DistrictId, travel: { from: DistrictId; to: DistrictId } | null, tripK: number): AmbienceId`: the street being walked mid-trip, otherwise the street (or nexus) of the district.
  - New `SfxName`: `"neonBuzz"` and `"morph"`. Remove `"portal"`.
  - `window.__flickerProbe(): Promise<{ frames: number; badPixels: number }>` exists only when `import.meta.env.DEV` is true and the URL has `?debug=flicker`.

- [ ] **Step 1: Write the tests in `audio.test.ts`.**
  - `it("maps districts to their street ambience")`: team → `"officeRow"`, nexus → `"nexus"`.
  - `it("uses the street being walked during a trip")`: for gate → team at `tripK` 0.2 → `"gateLane"`; at `tripK` 0.8 → `"officeRow"`.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npm test -- src/store/audio.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the ambience.**
  - Implement `ambienceFor` and the five ambience recipes in `sfx.ts`:
    - food lane: chatter-like noise, a sizzle hiss
    - nexus: a wide city drone, passing hovercars
    - gallery: a soft pad
    - office: an electric hum
    - alley: deep, quiet wind chimes
  - Add the `neonBuzz` sound (played when a flickering sign is within 6 units) and the `morph` sound.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Add the flicker probe.**
  `flickerProbe` renders the current scene into a `HalfFloatType` render target 8 times and counts NaN/Inf pixels. It is mounted from `World.tsx` only under the DEV and URL-flag condition.
- [ ] **Step 6: Do the performance pass on the user's laptop, in the browser pane.**
  - Read `WEBGL_debug_renderer_info` and record the GPU in the commit message.
  - In high quality at nexus, in each street and during one trip, measure the FPS over 5 s with a `requestAnimationFrame` counter in `javascript_tool`.
  - If the result is below 55 fps, reduce in this order and re-measure: reflector resolution → number of animated screens (raise `screenInterval`) → `dpr` max (2 → 1.5) → DOF off.
  - Then measure low quality on the same views, aiming for 30 fps or more.
- [ ] **Step 7: Check for flicker.**
  - Run `?debug=flicker`: `__flickerProbe()` returns `badPixels: 0` at nexus, in every street and in the lobby.
  - Take a burst of 8 screenshots at each of these places in high quality. There must be no all-black frame.
- [ ] **Step 8: Run the full check and a final comparison.**
  - Run `npm test` and `npm run build`. Expected: PASS.
  - Take screenshots of every viewpoint and compare each with `docs/reference/street-reference.webp`. Go through the spec §18 acceptance list item by item.
- [ ] **Step 9: Commit.** `git commit -m "feat(fe): street ambience, flicker probe and performance tuning"`
