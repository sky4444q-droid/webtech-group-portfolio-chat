# NEXORA Round 4 Graphics Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the whole city's graphics. Every light gets a visible source. Buildings get tiers, real windows and a skyline. The city fills with moving life. All of this stays within the fps budget.

**Architecture:**
- Pure layout logic in `world/street/*.ts` returns plain data and is unit-tested with Vitest. R3F components render that data, one instanced mesh or merged geometry per kind.
- Heavy effects are gated through `fxEnabled(quality)`.
- No new dependencies and no new asset files.

**Tech Stack:** React 19, TypeScript, three 0.187, @react-three/fiber 9, drei 10, @react-three/postprocessing 3, Vitest 5 + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-17-graphics-overhaul-design.md`. Executors read it, together with the reference images in `docs/reference/`.

## Global Constraints

**Do not touch:**
- `BE/`. No API keys anywhere.
- No new npm dependencies. No new files under `FE/public/assets`; everything is generated from code, shaders or canvas.
- `EffectComposer` keeps `multisampling={0}`.
- `COLORS` in `config/theme.ts` is unchanged. Brand colours go in a new `config/brand.ts`: purple `#8B5CF6`, magenta `#D946EF`, silver `#C0C4D0`.
- District positions, street polylines and `TEAM_TOWER` are unchanged.

**Content rules:**
- No people and no ground vehicles.
- No content copied from the reference images: no faces, animals from the pictures, brand names or logos. Our own logo `/images/nexora-emblem.png` may be used.

**Performance budget:**
- High mode must not drop below 50 fps at 1280×720 with dpr `[1,2]`, quality forced high, in the preview pane.
- Low mode must not drop below 55 fps on the same machine.
- If `PerformanceMonitor` lowers quality during a measurement, that measurement fails.
- Every new heavy feature gets an `fxEnabled` flag in the task that adds it.

**Tests and layout:**
- Existing tests may be rewritten only where this work changes their assumption, and they must keep their intent: both street sides covered, the walking corridor clear (no item lower than y 2.6 within 1.2 of the centreline), nothing inside the Team HQ tower, and the same output for the same seed. Never delete a test just to make it pass.
- Each street's key `WaterScreen`, its first bigScreen, stays the brightest and easiest thing to find in that street. Giant screens sit higher or farther away.

**Workflow:**
- Commit locally after each task. Never push without the user's word. Never commit `FE/tsconfig.tsbuildinfo`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Code comments are in Thai, matching the codebase.
- Tasks are ordered by visual impact. If time runs out, drop tasks from the end. Every finished task must stand on its own.

## Review Focus

Most likely to bite first:

1. **Travelling between districts.** Mid-trip, the camera passes through streets and Nexus corners. Fish, cables, skyline towers and giant screens must never clip the camera path or block the mascot. Expected: a clear view for the whole trip. Test in Task 9: no fish path within 4 m of any street centreline below y 9.
2. **Team HQ lobby.** New tiers, roof items and stacked signs must stay out of `TEAM_TOWER`. Expected: none intrude. Covered by extending the Team HQ test to all new types in Task 3.
3. **Low quality.** Each new feature must either render something cheap or turn off. Nothing should be half-drawn. Expected: no errors and the fps budget is met. Test in Task 1: the new `fxEnabled` flags are false in low.
4. **Language switch or HMR re-mount.** New canvas textures and shaders must be disposed or cached, not rebuilt on every render. Expected: the memory texture count stays steady. Checked in each component task by keying `useMemo` on stable inputs; verified with the perf probe in Task 11.
5. **Narrow viewport or very wide aspect.** The skyline and the sky must not show gaps or a hard horizon edge. Expected: towers continue all round. Test in Task 5: skyline towers cover every 15° sector.

---

### Task 1: Brand palette, fx flags, perf probe

**Files:**
- Create: `FE/src/config/brand.ts`, `FE/src/debug/perfProbe.ts`
- Modify: `FE/src/world/fx/fxEnabled.ts`, `FE/src/world/World.tsx`, `FE/src/world/fx/fx.test.ts`

**Interfaces:**
- Produces:
  - `BRAND: { purple: "#8B5CF6"; magenta: "#D946EF"; silver: "#C0C4D0" }`.
  - `FxFlags` loses `cones` and `flare`, and gains `fish: boolean`, `dust: boolean` and `skylineDetail: boolean` (all equal to `high`).
  - `perfProbeEnabled(): boolean` returns true only when DEV is set and the URL has `?debug=perf`.
  - `<PerfProbe />` sets `gl.info.autoReset = false`, resets `gl.info` itself once per frame, and exposes `window.__perf()` returning `{ fps, calls, triangles, textures, geometries }` averaged over the last 60 frames.

- [ ] **Step 1: Update the fx tests.**
  - "turns everything on in high" and "turns every heavy effect off in low" now cover `fish`, `dust` and `skylineDetail`.
  - Add `expect(fxEnabled("high")).not.toHaveProperty("cones")`.
  - Add `expect(BRAND).toEqual({ purple: "#8B5CF6", magenta: "#D946EF", silver: "#C0C4D0" })`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `cd FE && npx vitest run src/world/fx/fx.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement the changes.**
  - Add `brand.ts` and the flags.
  - `cones` and `flare` are still used by `StreetLights` in `Environment.tsx`. Delete `StreetLights`, the `LIGHTS` table, and the `VolumetricCone` and `LensFlare` exports in `Effects.tsx`, including their imports.
  - Add `perfProbe.ts`, mounted in `World.tsx` next to `FlickerProbe`.
- [ ] **Step 4: Run all tests and the build.**
  - Run: `cd FE && npx vitest run && npm run build`
  - Expected: all tests pass and the build succeeds.
- [ ] **Step 5: Record a baseline.**
  - Open `http://localhost:5173/?debug=perf#/nexus` at 1280×720, then `#/projects`.
  - Run `__perf()` and record the numbers in the ledger.
- [ ] **Step 6: Commit** with the message `feat(fe): brand palette, perf probe, remove floating street lights`.

### Task 2: Light from sources, plus haze and palette

**Files:**
- Create: `FE/src/world/street/lightSpill.ts`, `FE/src/world/street/lightSpill.test.ts`, `FE/src/world/street/LightSpill.tsx`
- Modify:
  - `FE/src/world/street/StreetKit.tsx` (mount it)
  - `FE/src/world/street/kitMeshes.tsx` (`NEON` weighting)
  - `FE/src/world/street/kitLayout.ts` (lamp cords)
  - `FE/src/world/World.tsx` (fog)
  - `FE/src/world/street/Sky.tsx`
  - `FE/src/world/fx/Effects.tsx` (`GroundFog` tint)

**Interfaces:**
- Consumes: `KitItem` and `neonColor` from `kitMeshes.tsx`.
- Produces:
  - `interface Spill { kind: "floor" | "wall"; position: Vec3; rotationY: number; size: [number, number]; variant: number; strength: number }`
  - `spillsFor(items: KitItem[]): Spill[]`
  - `<LightSpill spills={Spill[]} />` renders one additive instanced plane per kind. It uses a radial-gradient canvas alpha, `depthWrite={false}` and `toneMapped={false}`. Floor planes sit at y 0.02.

- [ ] **Step 1: Write the failing tests.**
  - `"gives every signH, signV, lightbox, screen and bigScreen one floor spill and one wall spill"`: the counts equal 2 × the source count.
  - `"puts the floor spill on the street side of its source, on the ground"`: `position[1] === 0.02`, and the spill is nearer the centreline than its source.
  - `"scales floor spill length with source height"`: a source at y 10 gets a longer spill than one at y 4.
  - `"keeps spill strength in (0, 1]"`.
  - `"sets the floor spill variant to the source variant"`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `cd FE && npx vitest run src/world/street/lightSpill.test.ts`
  - Expected: FAIL (module missing).
- [ ] **Step 3: Implement `spillsFor`.**
  - **Floor spill:** length = `clamp(source.y * 0.9, 2, 10)`, width = `source.size[0] * 1.2`. It starts at the facade base and extends toward the centreline.
  - **Wall spill:** 1.8× the source size, at the same y, 0.05 behind the source.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Add `LightSpill.tsx` and mount it in `StreetKit` for all streets and Nexus.**
- [ ] **Step 6: Add lamp cords.** In `kitLayout`, each `lamp` gets a `cable`-type item running vertically from the lamp top up to its cable height, size `[0.03, h, 0.03]`.
  - Extend the existing corridor test: lamps are already above 2.6, so it still passes.
- [ ] **Step 7: Retune the palette and atmosphere.**
  - **`NEON`:** reorder and duplicate it so that, out of the 8 slots, purple `#8B5CF6`, magenta `#D946EF`, cyan `#05d9e8` and blue `#2d6bff` take 6. Pink and red take 1 each. Drop orange.
  - **Fog:** in `World.tsx`, change it to `["#120c2a", 40, 210]`.
  - **Sky:** the horizon glow becomes `vec3(0.10, 0.05, 0.16)` and the top stays near black.
  - **`GroundFog`:** colour `#3a2a6a`.
  - **Check:** compare against `docs/reference/city-reference-2.webp`. Near walls must stay near-black, and the existing test "near-black background" must still pass.
- [ ] **Step 8: Run all tests and the build.**
  - Run: `cd FE && npx vitest run && npm run build`
  - Expected: pass.
- [ ] **Step 9: Visual check.**
  - Screenshot the first viewpoint of nexus, projects, team and sanctuary.
  - Confirm: no floating cones remain, coloured pools sit under the signs, and `__perf().fps` is at least 50 in high.
- [ ] **Step 10: Commit** with the message `feat(fe): light spills from signs, purple haze, brand-weighted neon`.

### Task 3: Tiered buildings and roof clutter

**Files:**
- Modify: `FE/src/world/street/kitLayout.ts`, `FE/src/world/street/kitLayout.test.ts`, `FE/src/world/street/StreetKit.tsx`

**Interfaces:**
- Produces:
  - `KitType` gains `"tier" | "roof" | "antenna" | "edgeStrip" | "beacon"`.
  - **`facade`** is now the base body.
  - **`tier`** is a setback block on top of the facade: inset 0.6–1.5 m from the street face, height 25–45% of the base.
  - **`roof`** is a water tank, plant room or roof billboard frame.
  - **`antenna`** is a thin mast, and every antenna gets a **`beacon`** at its tip.
  - **`edgeStrip`** is a thin emissive vertical line on a building corner.

- [ ] **Step 1: Write the failing tests** in `kitLayout.test.ts`.
  - `"builds streets as canyons"`: street facade heights lie in [18, 60], and the mean is at least 32.
  - `"stacks a setback tier on at least 40% of facades, never overhanging the street face"`: for every tier, its distance to the centreline is at least that of its facade plus 0.5.
  - `"tops every antenna with a beacon"`.
  - `"keeps every street piece out of the Team HQ tower"`: extend the existing test so it explicitly includes the new types.
  - `"lines both sides with facades"`: keep it unchanged; it must still pass.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `cd FE && npx vitest run src/world/street/kitLayout.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement the layout.** Facade height becomes `pick(r, 18, 60)`. Add the tier, roof, antenna, beacon and edgeStrip placement in `layoutStreet`, and corner towers in `layoutNexus`.
  - Each `edgeStrip` goes on about 30% of buildings.
  - Signs, panels and AC units keep their current height rules.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Render the new types in `StreetKit`.**
  - `tier`, `roof` and `antenna` reuse the facade or metal materials.
  - `edgeStrip` uses `meshBasicMaterial` with `toneMapped={false}` and `neonColor(v, 1.4)`.
  - `beacon` is a small red sphere. A shared `useFrame` blinks it by scaling its instance colour on a 1.6 s cycle with a per-instance phase. Blinking only happens when `fx.signFlicker` is on; otherwise it stays steady.
- [ ] **Step 6: Run all tests, the build, and a screenshot of a mid-street view.** Commit with the message `feat(fe): tiered canyon buildings with roof clutter and beacons`.

### Task 4: Constant-size window material

**Files:**
- Create: `FE/src/world/street/windowMaterial.ts`, `FE/src/world/street/windowMaterial.test.ts`
- Modify:
  - `FE/src/world/textures.ts` (new texture)
  - `FE/src/world/street/StreetKit.tsx`
  - `FE/src/world/districts/TeamDistrict.tsx`

**Interfaces:**
- Produces:
  - `windowGrid(widthM: number, heightM: number): { cols: number; rows: number }`, using a bay of 1.3 m and a floor of 3.3 m, each at least 1.
  - `curtainWallTexture(): THREE.CanvasTexture` is a 256×1024 tile of 8×16 bays. Each bay has a floor band and mullions. About 35% of windows are lit, with this split: 55% warm white `#ffd9a8`, 30% cool `#9fc4ff` and 15% magenta `#D946EF`. The texture is cached.
  - `patchWindowUv(mat: THREE.MeshStandardMaterial): void` uses `onBeforeCompile`. It derives the emissive UV from the instance scale (from `instanceMatrix` column lengths) so windows keep their real size on every box face.

- [ ] **Step 1: Write the failing tests.**
  - `windowGrid(13, 33)` returns `{cols:10, rows:10}`.
  - `windowGrid(0.5, 1)` returns `{cols:1, rows:1}`.
  - `curtainWallTexture()` returns the same instance twice.
- [ ] **Step 2: Run the tests and confirm they fail.** Then implement the three functions.
- [ ] **Step 3: Run the tests and confirm they pass.**
- [ ] **Step 4: Apply the material.**
  - Apply it to the facade, tier, endCap and the Nexus towers in `StreetKit`.
  - For the `TEAM_TOWER` mesh, set `repeat` from `windowGrid(size)` instead of `(1,1)`.
  - Remove the old `buildingWindowsTexture` usage where it is replaced.
  - Facades darken with height: in the patched shader, multiply the diffuse colour by `mix(1.0, 0.45, smoothstep(4.0, 40.0, worldY))`.
- [ ] **Step 5: Screenshots and perf.**
  - Take screenshots of all four districts.
  - Windows must look the same size on narrow and wide buildings.
  - `__perf().fps` must be at least 50.
- [ ] **Step 6: Commit** with the message `feat(fe): constant-size curtain-wall windows`.

### Task 5: Distant skyline and the Energy Core tower

**Files:**
- Create: `FE/src/world/street/skyline.ts`, `FE/src/world/street/skyline.test.ts`, `FE/src/world/street/Skyline.tsx`, `FE/src/world/street/EnergyCoreTower.tsx`
- Modify: `FE/src/world/Environment.tsx` (mount both)

**Interfaces:**
- Produces:
  - `interface SkyTower { position: Vec3; size: Vec3; variant: number }`
  - `layoutSkyline(seed: number): SkyTower[]`: between 90 and 120 towers, heights 60–160, placed on a ring of radius 95–150 around the origin.
  - `ENERGY_CORE_POS: Vec3`. The builder chooses it with these rules: visible from at least 3 street ends, outside every street and district plot, and not behind any key `WaterScreen` from its street's first viewpoint.
  - `<EnergyCoreTower />` is built from stacked tapered cylinders with 3 ring lights and a core:
    - The core is an additive shader sphere in a hexagonal frame. It pulses between `BRAND.purple` and `BRAND.magenta` with a 4 s period.
    - A red beacon sits on the tip.
    - Height is about 180.

- [ ] **Step 1: Write the failing tests.**
  - `"rings the city with 90–120 towers"`.
  - `"never enters a street or district plot"`: every tower footprint is at least 6 m from every street polyline (`distanceToPolyline`) and outside a 30 m radius of every district position.
  - `"covers every 15° sector"`: this is Review Focus 5.
  - `"is deterministic"`.
  - `"keeps ENERGY_CORE_POS clear of streets"`.
- [ ] **Step 2: Run the tests and confirm they fail.** Then implement `layoutSkyline` and `ENERGY_CORE_POS`.
- [ ] **Step 3: Run the tests and confirm they pass.**
- [ ] **Step 4: Render the skyline.**
  - `Skyline.tsx`: one instanced box using the Task 4 window material, with no normal map and envMap intensity 0.
  - When `fx.skylineDetail` is off, use a plain dark `meshBasicMaterial` with the window texture as `map`.
- [ ] **Step 5: Mount both in `Environment.tsx`, then run tests, build, screenshots and perf.** Commit with the message `feat(fe): distant skyline and Energy Core landmark tower`.

### Task 6: Signs climbing high, and sagging cables

**Files:**
- Create: `FE/src/world/street/cables.ts`, `FE/src/world/street/cables.test.ts`, `FE/src/world/street/Cables.tsx`
- Modify: `FE/src/world/street/kitLayout.ts`, `kitLayout.test.ts`, `StreetKit.tsx`

**Interfaces:**
- Produces:
  - `catenary(a: Vec3, b: Vec3, sag: number, segments: number): Vec3[]`, where the lowest point is `sag` below the chord midpoint.
  - `cableSpans(items: KitItem[]): { a: Vec3; b: Vec3; sag: number }[]`. It turns every horizontal `cable` item into a span from facade to facade.
  - `<Cables spans={...} />` merges every span into one `LineSegments`, coloured `#0b0b12`.

- [ ] **Step 1: Write the failing tests.**
  - `catenary` keeps both endpoints exact.
  - The midpoint y equals the chord mid y minus `sag`.
  - The lowest cable point in every street is at least 3.2: this keeps the corridor clear.
  - `"stacks vertical signs up building edges"`: every street has at least 2 stacks of 3 or more `signV` sharing x/z (within 0.1) with rising y, and the top sign in each stack sits above y 20.
  - `"places mid-height signs"`: at least 25% of `signH` and `lightbox` items per street are above y 9.
  - `"cables span several heights"`: cable count per street is at least 8, and the y range across them is at least 6.
- [ ] **Step 2: Run the tests and confirm they fail.** Then implement the changes in `kitLayout.ts` and `cables.ts`.
  - The existing "is dense like the reference" test must still pass.
- [ ] **Step 3: Run the tests and confirm they pass.**
- [ ] **Step 4: Render.** Replace the cable box rendering with `<Cables>`. The vertical lamp cords from Task 2 stay as boxes.
- [ ] **Step 5: Run tests, build, a mid-street screenshot and perf.** Commit with the message `feat(fe): sign stacks to the sky and sagging cables`.

### Task 7: Giant wrap-around screens

**Files:**
- Create: `FE/src/world/street/GiantScreen.tsx`, `FE/src/world/street/giantPrograms.ts`
- Modify: `kitLayout.ts`, `kitLayout.test.ts`, `StreetKit.tsx`

**Interfaces:**
- Produces:
  - `KitType` gains `"giantScreen"`. The item's size is `[arcWidth, height, radius]`, with height 12–20 and bottom y of at least 14.
  - `GIANT_PROGRAMS = ["core", "koi", "type", "water"] as const`. The program is chosen by `variant % 4`.
  - `<GiantScreen item={KitItem} />` is a `CylinderGeometry` open segment, 90° arc, wrapped round a building corner. It uses one `ShaderMaterial` with `uProgram`, `uTime` and `uEmblem` (the texture `/images/nexora-emblem.png`). Output brightness is capped below the key `WaterScreen` gain: `WaterScreen` uses `col*1.25`, and giant screens use at most `0.85`.
  - When `fx.screensAnimated` is off, `uTime` is frozen at `5 + variant`.

- [ ] **Step 1: Write the failing tests.**
  - Nexus has at least 2 giant screens and every street has exactly 1.
  - Every giant screen has its bottom at y 14 or higher.
  - On every street, the giant screen is either higher than the street's first `bigScreen` or more than 15 m from it along the street.
- [ ] **Step 2: Run the tests and confirm they fail.** Then add the layout.
- [ ] **Step 3: Run the tests and confirm they pass.**
- [ ] **Step 4: Implement the shader programs.**
  - **core:** the emblem plus a pulsing glow in brand purple and magenta.
  - **koi:** 3 stylised fish silhouettes, built from sine-warped ellipses, swimming across a deep blue field with ripples.
  - **type:** large "NEXORA" text and words from `SIGN_WORDS.nexus` scrolling vertically. Pre-render one canvas strip, cached, and scroll it in UV.
  - **water:** reuse the `water()` function from `WaterScreen.tsx` by exporting its GLSL string.
- [ ] **Step 5: Run tests, build, screenshots and perf.**
  - Confirm the key `WaterScreen` is still the brightest thing at each street's first viewpoint.
  - Commit with the message `feat(fe): giant wrap-around brand screens`.

### Task 8: Hover traffic along streets, and dust motes

**Files:**
- Create: `FE/src/world/fx/trafficLanes.ts`, `FE/src/world/fx/trafficLanes.test.ts`
- Modify: `FE/src/world/fx/Effects.tsx` (`Traffic`, plus a new `DustMotes`), `FE/src/world/Environment.tsx`

**Interfaces:**
- Produces:
  - `interface Lane { from: Vec3; to: Vec3; speed: number; phase: number }`
  - `trafficLanes(seed: number): Lane[]`: 2 or 3 lanes per street along its polyline, offset ±1.5 from the centreline, at y 12–25, plus a ring over Nexus.
  - `Traffic` reads the lanes. Each vehicle gets a body, white headlights at the front and red tail lights at the back, in 3 instanced meshes. There are 30 vehicles in total.
  - `<DustMotes />` is 300 points, size 0.04, additive and pale, drifting slowly. Like `Rain`, the box follows the camera at 20×8×20.

- [ ] **Step 1: Write the failing tests.**
  - Every street has at least 2 lanes.
  - Every lane y lies in [12, 25].
  - Every lane endpoint is within `halfWidth` of its street.
- [ ] **Step 2: Run the tests and confirm they fail.** Then implement and wire it up.
  - `DustMotes` is gated on `fx.dust`.
  - `Traffic` stays gated on `fx.traffic`.
- [ ] **Step 3: Run tests, build, a mid-street screenshot and perf.** Commit with the message `feat(fe): street-following hover traffic and dust motes`.

### Task 9: Holographic fish

**Files:**
- Create: `FE/src/world/fx/fishPaths.ts`, `FE/src/world/fx/fishPaths.test.ts`, `FE/src/world/fx/HoloFish.tsx`
- Modify: `FE/src/world/Environment.tsx`

**Interfaces:**
- Produces:
  - `interface FishPath { center: Vec3; radiusX: number; radiusZ: number; y: number; speed: number; phase: number; length: number }`
  - `fishPaths(seed: number): FishPath[]`: 8 fish, each 4–8 long, at y 10–25.
  - `fishAt(p: FishPath, t: number): { position: Vec3; heading: number }`
  - `<HoloFish />` is one instanced plane-strip geometry with 16 segments. Its vertex shader bends the body with `sin(x*3 - t*4)` and amplitude growing toward the tail. Its fragment shader is additive, with scanlines, a fresnel-like edge and colour mixed from `BRAND.magenta` to `BRAND.purple`. It is gated on `fx.fish`.

- [ ] **Step 1: Write the failing tests.**
  - Exactly 8 paths.
  - Every y lies in [10, 25].
  - Every sampled `fishAt` position over one loop (64 samples) that is below y 9 is at least 4 m from every street centreline. Paths are all above 10 already, so this mainly checks Review Focus 1 holds for any later tuning.
  - Every sampled position is at least 3 m from every district camera position from `DISTRICTS[*].camera.position`.
  - `fishAt` is periodic.
- [ ] **Step 2: Run the tests and confirm they fail.** Then implement `fishPaths` and `fishAt`, and confirm the tests pass.
- [ ] **Step 3: Implement and mount `HoloFish`.**
- [ ] **Step 4: Run tests, build, screenshots and perf.** Commit with the message `feat(fe): holographic fish swimming between towers`.

### Task 10: Wet-floor streaks, ticker strips, final grading

**Files:**
- Modify:
  - `FE/src/world/Environment.tsx` (`Floor`)
  - `FE/src/world/street/FakeReflections.tsx`
  - `FE/src/world/street/kitLayout.ts` (the `ticker` type) and `StreetKit.tsx`
  - `FE/src/world/World.tsx` (Bloom)

**Interfaces:**
- Consumes: `screenPrograms` program index 2 (`ticker`) and the `ScreenGroup` from `kitMeshes.tsx`.
- Produces: `KitType` gains `"ticker"`. This is a thin LED strip, `[w*0.8, 0.35, 0.08]`, placed just above about 40% of shopfronts at y 3.1–3.3. It renders through `ScreenGroup` with the ticker program.

- [ ] **Step 1: Write the failing test.** At least 30% of shopfronts per street have a ticker within 0.5 m horizontally and above them.
- [ ] **Step 2: Implement it and confirm the test passes.**
- [ ] **Step 3: Retune the floor reflector.**
  - Start the anisotropic blur at `blur={[6, 260]}` so reflections smear vertically.
  - Raise `mixBlur` to about 0.6 and keep `mirror={1}`.
  - Make the roughness map create puddle patches: multiply it by a low-frequency noise canvas texture, 256², cached and repeated 6×.
  - Compare against `city-reference-2.webp`. The pools under signs must read as long streaks.
- [ ] **Step 4: Extend `FakeReflections`.** Include giant screens, stacked signs and floor spills in low mode.
- [ ] **Step 5: Retune Bloom.**
  - Test `luminanceThreshold` between 0.35 and 0.5 and `intensity` between 0.9 and 1.2. Pick the values where signs glow but the screen does not wash out.
  - Add `ChromaticAberration` with offset `[0.0006, 0.0006]` only if fps holds at 50 or above and `?debug=flicker` reports 0 NaN/Inf.
- [ ] **Step 6: Run tests and the build, then commit** with the message `feat(fe): streaky wet floor, ticker strips, tuned bloom`.

### Task 11: Performance and visual verification pass

**Files:**
- Modify: only what the measurements require. Write the results to the ledger `.superpowers/sdd/2026-11-17-graphics-overhaul/progress.md`.

- [ ] **Step 1: Measure.**
  - For each of nexus, projects, team and sanctuary, plus one mid-trip moment, run `__perf()` in high and low at 1280×720.
  - Record fps, calls, triangles and textures.
- [ ] **Step 2: If any high-mode reading is below 50, cut in this order, re-measuring after each step:**
  1. Reflector resolution 1024 → 512.
  2. Skyline towers to 70.
  3. Fish 8 → 5.
  4. Dust 300 → 150.
  5. `ChromaticAberration` off.
- [ ] **Step 3: Check that textures and geometries stay steady.** Switch language twice and travel a full loop. The `textures` and `geometries` counts must not grow.
- [ ] **Step 4: Check for flicker.** Run `?debug=flicker` then `__flickerProbe()`. Expected: 0 NaN/Inf.
- [ ] **Step 5: Take the final screenshots.** Capture the 4 first viewpoints and 1 mid-street view. Put them side by side with both references for the user.
- [ ] **Step 6: Run the full suite and the build.**
  - Run: `cd FE && npx vitest run && npm run build`
  - Expected: all tests pass and the build succeeds.
- [ ] **Step 7: Commit** with the message `perf(fe): round 4 budget pass`. Do not push.
