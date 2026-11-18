# Graphics Round 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the floor read as a wet street, make the Nexus bridge feel like standing on an overpass, make distant buildings sharp, and turn the lower building faces into screens and holograms, with dim, realistic window lights above them.

**Architecture:**
- Placement logic lives in pure `.ts` modules with Vitest tests: kit layout, floor decals, viewpoint paths and the depth-of-field policy.
- Each new kind of object renders as one instanced mesh.
- New layout randomness uses separate `mulberry32` streams, so existing kit positions do not move.

**Tech Stack:** React 19, TypeScript, Vite 8, three 0.187, R3F 9, drei 10, postprocessing 3, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-graphics-round3-design.md`

## Global Constraints

**Repo rules**
- Never touch `BE/`. Never put API keys anywhere.
- Commit locally only. Never commit `FE/tsconfig.tsbuildinfo`.
- No new asset files: draw everything with canvas or shaders.
- Comments are in Thai.
- File names must not collide case-insensitively with existing ones.

**Rendering rules**
- `EffectComposer` keeps `multisampling={0}`, and dpr stays `[1,1]`.
- Patch shaders before the first compile: create the material in `useMemo`, then attach it with `<primitive attach="material">`.
- Each new kind of object uses one draw call (instanced).
- Use normal blending for large translucent sprites.

**Layout and flicker rules**
- Nothing may be coplanar with a facade front plane. Every wall-mounted item sits at least 0.02 m in front of it. The test "no coplanar faces on street walls" in `kitLayout.test.ts` must cover every new type.
- Floor layers keep distinct heights:

  | Layer | Height |
  |---|---|
  | decals | 0.01 |
  | floor spills | 0.02 |
  | steam glow | 0.02 |
  | haze | 0.25 |

  Decals must not share 0.02.
- Existing kit positions must stay unchanged. The tests compare `layoutStreet` output for the existing types before and after.

**Brightness and content**
- Brightness order is neon signs > screens and holograms > windows.
- Brand colours are purple `#8B5CF6`, magenta `#D946EF` and silver `#C0C4D0`. The bridge rail uses brand colours, not `COLORS.red`.
- No real brand text, faces or people on screens or holograms.

**Budgets**
- High mode ≥ 50 fps in every district.
- Gate must not drop more than 4 fps below its current 54.
- Low mode ≥ 55 fps.
- Measure only when `document.hasFocus()` is true and a bare rAF counter reads ≥ 55/s. Otherwise the pane is throttled and the reading is invalid.

## Review Focus

1. **Bridge viewpoint.**
   - The camera must not clip into the bridge roof or rails.
   - The Nexus fragment and markers must stay clickable. The existing fragment line-of-sight test stays green.
2. **Travel and viewpoint transitions.**
   - The stair path must not trap the camera.
   - If the target changes mid-move, the camera follows the new target.
3. **Low mode.**
   - New screens and holograms must render cheaply or be skipped.
   - Decals render in both modes.
4. **Flicker.**
   - No new coplanar planes, including decals against spills and holograms against facades.
5. **Content.**
   - Screens reuse the existing `SCREEN_PROGRAMS`. No new text with real brands.

---

### Task 1: Floor that reads as a floor

**Files:**
- Modify: `FE/src/world/Environment.tsx` (`Floor`, `getPuddleMap`, `LowFloorMaterial`)
- Create:
  - `FE/src/world/street/floorDecals.ts`
  - `FE/src/world/street/floorDecals.test.ts`
  - `FE/src/world/street/FloorDecals.tsx`

  Check the names first: `floorDecals.ts` and `FloorDecals.tsx` differ only in case, which collides on Windows. Name the component file `DecalMeshes.tsx` (export `FloorDecals`).

**Interfaces:**

```ts
export type DecalKind = "manhole" | "laneMark" | "tileTint";
export interface Decal { kind: DecalKind; position: Vec3; rotationY: number; size: [number, number]; variant: number }
export const DECAL_Y = 0.01;
export function floorDecals(): Decal[]; // mulberry32(CITY_SEED ^ 0xdeca1)
```

- [ ] **Step 1: Write failing tests** in `floorDecals.test.ts`.
  - Every street gets 2–4 manholes, 6+ lane marks and 10+ tile tints.
  - Every decal sits on the road (`distanceToPolyline ≤ halfWidth − 0.2`, or inside the Nexus square).
  - Every `position[1] === DECAL_Y`, and `DECAL_Y !== 0.02`.
  - The output is deterministic.
  - No decal lies within 1.5 m of a steam vent (`steamSources()`).
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `cd FE && npx vitest run src/world/street/floorDecals.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `floorDecals()` and the decal component.**
  - Draw a canvas atlas of 3 cells: a round grated manhole, a faded dashed lane mark, and a subtle tile-shade patch.
  - Use one instanced plane with `transparent`, `depthWrite:false` and `polygonOffset` (factor −1) at `DECAL_Y`.
  - Render it in both quality modes from `Environment`.
- [ ] **Step 4: Retune the reflector so dry tiles and sharp puddles both show.**
  - Suggested start: `blur [2,120]`, `mixBlur 0.35`, `mixStrength 1.6`.
  - Raise the puddle-map contrast: fewer, sharper puddles.
  - Raise `normalScale` so tile joints show.
  - Give the floor a dark grey base instead of reflection only.
  - Check Nexus, Gate and Projects at 1280×760 in the browser.
  - Floor spills must still read as coloured light.
- [ ] **Step 5: Run the full suite** with `npx vitest run`, then commit:
  `feat(fe): floor reads as a wet street — tuned reflector, decals`

---

### Task 2: The Nexus bridge feels like a bridge

**Files:**
- Modify:
  - `FE/src/world/districts/NexusDistrict.tsx` (bridge group)
  - `FE/src/config/viewpoints.ts` (bridge viewpoint)
  - `FE/src/world/CameraRig.tsx` (follow waypoints)
- Create:
  - `FE/src/config/viewpointPaths.ts`
  - `FE/src/config/viewpointPaths.test.ts`
- Test: `FE/src/config/viewpoints.test.ts`

**Interfaces:**
- Export `BRIDGE` from `NexusDistrict.tsx` or a new `config/bridge.ts`:

  ```ts
  { y: number /* deck top */; z: number; width: number; length: number }
  ```

  The deck top stays about 4.9 m.
- Produce the path helper:

  ```ts
  export function viewpointPath(district: DistrictId, from: number, to: number): Vec3[]; // world-space waypoints, excluding both endpoints; [] when no special path
  ```

- [ ] **Step 1: Write failing tests.**
  - The bridge viewpoint position y is in `[BRIDGE.y + 1.6, BRIDGE.y + 1.9]`, and its |z − BRIDGE.z| ≤ 0.6.
  - Its mode is `"eye"` with `lookRange` 0.43.
  - `viewpointPath("nexus", 0, 1)` returns ≥ 2 waypoints that climb monotonically in y along a stair at a deck end.
  - `viewpointPath("nexus", 1, 0)` is the same path reversed.
  - Other pairs return `[]`.
  - The existing fragment line-of-sight and marker-on-screen tests still pass.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `cd FE && npx vitest run src/config/viewpoints.test.ts src/config/viewpointPaths.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Bridge structure:**
    - A deck with an anti-slip plate texture drawn on canvas.
    - Glass rails with posts every 2 m and an LED strip in a brand gradient (replacing `COLORS.red`).
    - A thin roof frame with a long screen strip over the walkway. The screen uses `ScreenGroup` or the same program shader.
    - Stairs at both deck ends.
  - **Viewpoint:** move the bridge viewpoint onto the deck.
  - **CameraRig:** when `viewpoint` changes and `viewpointPath` is non-empty, follow the waypoints, then hand off to the normal lerp. Keep the existing behaviour when the path is empty. Store the path in a ref; do not allocate per frame.
  - **Check:** in the browser, the deck and rails are visible in the foreground, and the camera visibly walks up the stairs.
- [ ] **Step 4: Run the full suite** with `npx vitest run`, then commit:
  `feat(fe): walkable-looking Nexus bridge with stair approach`

---

### Task 3: Sharp distant city

**Files:**
- Create:
  - `FE/src/world/fx/dofPolicy.ts`
  - `FE/src/world/fx/dofPolicy.test.ts`
- Modify:
  - `FE/src/world/World.tsx` (DOF bokeh, fog near)
  - `FE/src/world/street/Skyline.tsx`
  - `FE/src/world/street/skylineLayout.ts` (screen strips)
- Test: `FE/src/world/street/skylineLayout.test.ts`

**Interfaces:**

```ts
export function dofBokeh(opts: { enabled: boolean; mode: "wide" | "eye"; traveling: boolean }): number; // 0 when !enabled || mode==="wide" || traveling; else 1.6
export const FOG_NEAR = 70;
export interface SkyStrip { tower: number; face: 0|1|2|3; y: number; height: number; width: number; variant: number }
export function skylineStrips(towers: SkyTower[], seed: number): SkyStrip[]; // own RNG stream
```

- [ ] **Step 1: Write failing tests.**
  - `dofBokeh` returns 0 for wide, for travelling and when disabled, and 1.6 for eye.
  - `skylineStrips` puts strips on 30–50% of towers.
  - Each strip lies within its tower's height and face width.
  - Strips are deterministic, and `layoutSkyline` output is unchanged.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.**
  - `World.tsx` uses `dofBokeh` with the current viewpoint mode and travel state.
  - Fog becomes `["#120c2a", FOG_NEAR, 230]`.
  - `Skyline` renders the strips as one instanced mesh of emissive vertical and horizontal screen bands in the NEON/brand colours, high mode only.
  - Check from the bridge viewpoint that the far towers are crisp.
- [ ] **Step 4: Run the full suite**, then commit:
  `feat(fe): sharp distant city — no DOF on wide/travel, later fog, skyline screens`

---

### Task 4: Real night window lights

**Files:**
- Modify:
  - `FE/src/world/street/windowPlan.ts`
  - `FE/src/world/textures.ts` (`curtainWallTexture`)
  - the `emissiveIntensity` values in `StreetKit.tsx` and `Skyline.tsx` if needed
- Test: `FE/src/world/street/windowPlan.test.ts`

- [ ] **Step 1: Update the tests to the new rules.**
  - Lit bays are 12–18% (seeds 11, 12, 13).
  - Lit bays come in small groups. The mean run length of consecutive lit bays in a row is ≥ 1.5, and no row is ≥ 7 of 8 lit.
  - Tones are only `warm` (≥ 55% of lit) and `cool`; `brand` is ≤ 3%.
  - `level` is mostly low: the median lit level is ≤ 0.55.
  - Keep the toggle tests.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.**
  - Redraw lit bays with an uneven interior glow (curtain edges, a darker lower half, an occasional lamp hotspot) using warm orange-amber and cool office white.
  - Dark bays are glass with a faint city-light gradient.
  - Check at Nexus that windows read as dim real lights and that signs and screens dominate.
- [ ] **Step 4: Run the full suite**, then commit:
  `feat(fe): dim, realistic night window lights`

---

### Task 5: Screens and holograms on lower facades

**Files:**
- Modify:
  - `FE/src/world/street/kitLayout.ts` (new types and a `dressScreens` pass with its own RNG `mulberry32(seed ^ hash(s.id) ^ 0x5c4ee7)`)
  - `FE/src/world/street/StreetKit.tsx`
  - `FE/src/world/street/kitMeshes.tsx` if needed
- Create: `FE/src/world/street/HoloSigns.tsx`
- Test: `FE/src/world/street/kitLayout.test.ts`

**Interfaces:**
- `KitType` gains `"monitor" | "videoWall" | "holo"`.
- `monitor`: width 2–5 m, height 1.2–2.8 m, depth 0.1, front face ≥ 0.02 m in front of the facade.
- `videoWall`: a 2×2 or 3×2 grid of cells. Emit one item per cell, size about 1.4×0.9.
- `holo`: a plane 0.6–1.2 m off the wall, width 1.5–3.5 m.
- All three sit within y ∈ [4, 25] and below the facade height minus 1.

- [ ] **Step 1: Write failing tests.**
  - The existing types' layout is byte-identical to before: snapshot the filtered output of the old types at `CITY_SEED` before the change, as a JSON fixture created in this step from the current HEAD.
  - The new items cover 35–50% of each facade's area between y 4 and min(25, h) on average per street.
  - No new item overlaps an existing sign, screen, panel, bigScreen or giantScreen box. Use an AABB test in the facade's local frame.
  - Extend the coplanar test to `monitor`/`videoWall`: front face ≥ 0.02 m in front of the facade plane.
  - `holo` lies 0.6–1.2 m off the facade.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.**
  - Render `monitor` and `videoWall` through `ScreenGroup` with the existing `SCREEN_PROGRAMS`, split by program. Bezels use the dark instanced box.
  - `holo` is one instanced translucent plane with a shader: a glowing edge, scanlines moving up, a faint abstract icon or bars (no text), in brand or NEON tint, using normal blending and `depthWrite:false`.
  - In low mode, render `monitor` and `videoWall` statically (screensAnimated off) and skip `holo`.
  - Set brightness to neon > screens > windows.
  - Check at Gate, Projects and Nexus.
- [ ] **Step 4: Run the full suite**, then commit:
  `feat(fe): screen and hologram facades on lower floors`

---

### Task 6: Budget pass and evidence

- [ ] **Step 1: Measure.**
  - Confirm the pane is not throttled first: `document.hasFocus()` is true and a 2 s rAF counter reads ≥ 55/s.
  - Measure each district at its first viewpoint, plus the bridge viewpoint, in high and low mode (`?debug=perf`, `window.__perf()`, and a 3 s rAF counter).
  - Run `__flickerProbe()` at Nexus, the bridge and Gate.
- [ ] **Step 2: Tune if over budget,** in this order:
  1. hologram count
  2. skyline strip count
  3. decal count
  4. reflector resolution, 1024 → 768
- [ ] **Step 3: Run `cd FE && npx vitest run && npm run build`.**
  Take screenshots of the bridge, Nexus, Gate and Projects, and write the results to `docs/superpowers/handoff/2026-11-17-graphics-round3-results.md`.
- [ ] **Step 4: Commit any tuning:**
  `perf(fe): graphics round 3 budget pass`
