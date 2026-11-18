# Graphics Polish (round 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the NEXORA city feel wider, smoky, lived-in and on-brand: a wider camera, steam that comes from somewhere, office-like window lights, and an intro and HUD that match the purple/magenta/silver logo.

**Architecture:**
- Placement logic lives in pure `.ts` modules with Vitest tests:
  - `steamLayout.ts`
  - `windowPlan.ts`
  - camera constants
- R3F components render each kind of object as one instanced mesh, and animate it in shaders driven by a single time uniform, so the CPU does no per-frame work.
- UI changes are CSS plus small JSX edits. CSS-contract tests read `styles.css`.

**Tech Stack:** React 19, TypeScript, Vite 8, three 0.187, @react-three/fiber 9, drei 10, postprocessing 3, Vitest (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-17-graphics-polish-design.md`

## Global Constraints

**Repo and git rules**
- Never touch `BE/`. Never put an API key anywhere.
- Commit locally only; no push. Never commit `FE/tsconfig.tsbuildinfo`.
- No new asset files. Everything is drawn with canvas or shaders (CC0 rule and the 8 MB cap still stand).
- New file names must not collide case-insensitively with existing ones (Windows), for example in `world/fx/` and `world/street/`.
- Code comments are in Thai, matching the existing files.

**Rendering rules**
- `EffectComposer` keeps `multisampling={0}`. dpr stays `[1,1]`.
- A shader patch must be installed before the material's first compile. Create and patch the material in `useMemo`, then attach it with `<primitive object={mat} attach="material" />`.
- New random placement uses its own `mulberry32` stream, so existing kit positions do not move.
- One draw call per kind of object (instanced mesh or merged geometry).
- Use normal blending for large translucent sprites. Additive blending on large planes plus Bloom blacks out the frame.

**Brand palette:** `BRAND` = purple `#8B5CF6`, magenta `#D946EF`, silver `#C0C4D0` (`FE/src/config/brand.ts`). `COLORS` in `theme.ts` is unchanged, and `COLORS.red` stays `#ff1f3d`.

**Performance budget**
- At 1440×860 in high mode: ≥ 50 fps in every district, at the first viewpoint and during travel.
- Low mode: ≥ 55 fps on the same machine.
- `?debug=flicker` reports 0 bad pixels.

**Feature flags:** steam and ground haze are on only when `fxEnabled(q).steam` is true, which means high mode.

**Window lights**
- About 30–40% of window bays are lit, clustered by floor.
- Coloured (non-white) lit bays are ≤ 6% of lit bays.
- About 2–3% of bays toggle slowly, every 20–60 s.

**Camera:** `CAMERA_FOV` starts at 65°. The final value may be anywhere in 62–68°.

**UI text:** must stay readable at 375 px width. Respect `prefers-reduced-motion`.

## Review Focus

1. **Narrow screens (375 px and 736 px wide).**
   - The team holo card must still fit at 736 px.
   - The intro lockup (logo, wordmark, bar, button) must not overflow or overlap at 375 px.
   - Pinned in Task 1 (fov-aware card test) and Task 5 (lockup layout check in the visual pass).
2. **Low quality mode.**
   - Steam and haze must be absent.
   - Windows still use the new texture.
   - Nothing must throw when the `steam` flag is false.
   - Pinned in Task 3 and Task 4 (flag-gated render) and Task 6 (low-mode screenshot).
3. **Flicker.**
   - Window toggles and steam must not produce frame-to-frame flashes.
   - Pinned in Task 2 (`windowToggle` period test) and Task 6 (`?debug=flicker` run).
4. **Guide trips.**
   - The camera follows the mascot along street centerlines at about eye height.
   - Steam vents must sit off the centerline so the camera never flies through a plume core.
   - Pinned in Task 3 (lateral offset test).
5. **Camera inside geometry.**
   - Pulling a viewpoint back can push it into a facade or tier box, and the screen goes black.
   - Pinned in Task 1 (no viewpoint inside a kit box).

---

### Task 1: Shared camera FOV and wider viewpoints

**Files:**
- Create: `FE/src/config/camera.ts`
- Modify:
  - `FE/src/world/World.tsx:50` (fov)
  - `FE/src/config/viewpoints.ts` (every `position`, `marker`, `TEAM_HOLO_DISTANCE` if needed)
- Test:
  - `FE/src/config/viewpoints.test.ts`
  - `FE/src/world/street/skylineLayout.test.ts:59-72`

**Interfaces:**
- Produces: `export const CAMERA_FOV = 65;` (degrees) in `config/camera.ts`.

- [ ] **Step 1: Write the failing tests**

In `viewpoints.test.ts`:
- Replace the hard-coded `55` in the team card test with `CAMERA_FOV`.
- Add these tests:

```ts
it("never puts a viewpoint inside a building box", () => {
  // Boxes: every cityLayout() item of type facade | tier | endCap, as world-space AABBs
  // (position is the box centre, size is [along, height, depth], rotated by rotationY).
  // Skip team district viewpoints: they are inside the lobby on purpose.
  // Expect no non-team viewpointWorld(d, i).position to be inside any box grown by 0.3 m.
});

it("keeps every viewpoint marker on screen", () => {
  // For every district d and index i: build a PerspectiveCamera(CAMERA_FOV, 16/9),
  // put it at viewpointWorld(d,i).position looking at .target, project
  // DISTRICTS[d].position + VIEWPOINTS[d][i].marker, and expect |ndc.x| <= 0.95 and -0.95 <= ndc.y <= 0.95.
});

it("eye viewpoints sit between 1.8 and 2.6 m", () => {
  // Every VIEWPOINTS[d][i] with mode "eye": position[1] in [1.8, 2.6].
});
```

In `skylineLayout.test.ts`, change the "lands the core inside the frame" test:
- Use `CAMERA_FOV`.
- Use the real first viewpoint of each district, `viewpointWorld(d, 0)` for `gate`, `nexus`, `projects` and `sanctuary`, instead of the stale `[0,5,17]` offsets.
- Keep `>= 3`. If the real poses cannot reach 3 even after Step 3, lower it to `>= 2` and write the reason in a comment and in the report.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd FE && npx vitest run src/config/viewpoints.test.ts src/world/street/skylineLayout.test.ts`
Expected: FAIL. `CAMERA_FOV` is not exported yet, and the eye heights are 1.7.

- [ ] **Step 3: Implement**

- Create `config/camera.ts`. `World.tsx` uses `fov: CAMERA_FOV`.
- Move each viewpoint back 2–4 m along the direction from target to position, and set eye heights to 1.9–2.4 m.
- Move each `marker` so it stays between camera and target and stays on screen.
- Check every district in the browser (`fe-dev` preview at 1440×860). The fov may end anywhere in 62–68° if that looks better; record the final value and why.
- If the team card text looks smaller than before, lower `TEAM_HOLO_DISTANCE` while the 736 px fit test still passes.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd FE && npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/src/config/camera.ts FE/src/config/viewpoints.ts FE/src/config/viewpoints.test.ts FE/src/world/World.tsx FE/src/world/street/skylineLayout.test.ts
git commit -m "feat(fe): wider camera — shared fov, pulled-back viewpoints"
```

---

### Task 2: Office-like window lights

**Files:**
- Create: `FE/src/world/street/windowPlan.ts`, `FE/src/world/street/windowPlan.test.ts`
- Modify:
  - `FE/src/world/textures.ts` (`curtainWallTexture` draws from `planWindows`)
  - `FE/src/world/street/windowMaterial.ts` (`patchWindowUv`)
  - `FE/src/world/street/StreetKit.tsx` and `FE/src/world/street/Skyline.tsx` (time uniform, emissive tuning)
- Test: `FE/src/world/street/windowMaterial.test.ts`

**Interfaces:**
- Produces:

```ts
export type BayLight = { lit: boolean; tone: "warm" | "cool" | "brand"; level: number /* 0..1 */; blinds: boolean };
export const WINDOW_COLS = 8, WINDOW_ROWS = 16;
export function planWindows(seed: number): BayLight[][]; // [row][col], row 0 = top of the tile
export const WINDOW_TOGGLE_FRACTION: number; // 0.02..0.03
/** JS twin of the GLSL toggle: does the bay with this hash (0..1) flip at time t (s)? */
export function windowToggle(cellHash: number, t: number): boolean;
export const WINDOW_TOGGLE_GLSL: string; // same formula, as a GLSL function `float winToggle(float h, float t)`
```

- `patchWindowUv(mat, opts?: { animate?: boolean })` stores `mat.userData.winTime` (a `{ value: number }` uniform). `StreetKit` advances it in its existing `useFrame`. `Skyline` passes `animate: false`.

- [ ] **Step 1: Write the failing tests** in `windowPlan.test.ts`

```ts
it("lights 30–40% of bays", () => { /* count lit / (8*16) for seeds 11, 12, 13 */ });
it("clusters by floor", () => {
  // per seed: at least 3 rows with >= 6 of 8 lit AND at least 3 rows with <= 1 lit
});
it("keeps coloured bays rare", () => { /* tone "brand" <= 6% of lit bays */ });
it("is deterministic", () => { expect(planWindows(11)).toEqual(planWindows(11)); });
it("toggles about 2–3% of bays, slowly", () => {
  // 10,000 hashes at t = 0: fraction where windowToggle(h,0) !== windowToggle(h,0.001) is 0 (no fast flips);
  // fraction of hashes whose state differs between t = 0 and t = 600 is in [0.015, 0.035];
  // for any single hash, the state is constant over every 20 s window
});
```

In `windowMaterial.test.ts`, add:
- The patched fragment shader contains `winToggle(`.
- The patched vertex shader reads the instance translation (`instanceMatrix[3]`) for the per-building offset.
- `mat.userData.winTime` exists after `patchWindowUv(mat)`.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd FE && npx vitest run src/world/street/windowPlan.test.ts src/world/street/windowMaterial.test.ts`
Expected: FAIL. The module is missing.

- [ ] **Step 3: Implement**

`planWindows`:
- Roll a state for each floor (all-on / half-on / mostly-dark), then roll bays within that floor.
- Tones are mostly `warm` and `cool`; `brand` is rare.
- Use its own `mulberry32` stream.

`curtainWallTexture` keeps the 256×1024 canvas, the 8×16 grid, the cache and the repeat wrap, and draws from the plan:
- **Lit bay:** a vertical gradient (brighter at the ceiling), a visible frame, and blind or shadow stripes when `blinds` is set.
- **Dark bay:** deep blue glass with a faint gradient.
- **Floor slab and mullions:** black, with a thin LED strip on a few floors.
- **Colours:** warm `#ffd9a8`-ish, cool `#cfe0ff`-ish, and brand `BRAND.purple` or `BRAND.magenta`.
- No text and no people.

Shader (in `patchWindowUv`):
- Offset `vWinUv` by whole bays using a hash of the instance translation, or of the model translation when not instanced, so neighbouring buildings differ.
- Compute the bay id from `floor(vWinUv * vec2(8.,16.))` plus the building hash, then `winToggle(hash, uWinTime)`.
- When the result is 1, swap that bay between lit (warm, level 0.6) and dark (its texture value × 0.1).
- `animate:false` skips the toggle.

Lower `emissiveIntensity` in `StreetKit` and `Skyline` until neon signs are clearly brighter than windows. Check this in the browser at Nexus and Projects.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd FE && npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/src/world/street/windowPlan.ts FE/src/world/street/windowPlan.test.ts FE/src/world/textures.ts FE/src/world/street/windowMaterial.ts FE/src/world/street/windowMaterial.test.ts FE/src/world/street/StreetKit.tsx FE/src/world/street/Skyline.tsx
git commit -m "feat(fe): office-like window lights — floor clusters, per-building offset, slow toggles"
```

---

### Task 3: Steam plumes from vents, kitchens and rooftop stacks

**Files:**
- Create:
  - `FE/src/world/fx/steamLayout.ts`
  - `FE/src/world/fx/steamLayout.test.ts`
  - `FE/src/world/fx/SteamPlumes.tsx`
- Modify:
  - `FE/src/world/street/StreetKit.tsx:145` (replace `<Steam …/>`)
  - `FE/src/world/Environment.tsx` (render `<SteamPlumes />` once, gated by `fx.steam`)
  - `FE/src/world/fx/Effects.tsx` (delete the old `Steam` export once it has no users)

**Interfaces:**
- Consumes: `cityLayout()` and `KitItem` (`kitLayout.ts`); `STREETS`, `distanceToPolyline` (`streets.ts`); `VIEWPOINTS`, `DISTRICTS`; `NEON` / `neonColor` (`kitMeshes.tsx`); `mulberry32`.
- Produces:

```ts
export type SteamKind = "vent" | "kitchen" | "stack";
export interface SteamSource { kind: SteamKind; position: Vec3; radius: number; height: number; tint: string /* hex */; phase: number }
export const STEAM_SEED = 0x57ea;
export function steamSources(): SteamSource[];
```

- [ ] **Step 1: Write the failing tests** in `steamLayout.test.ts`

```ts
it("puts 3–4 vents on every street", () => {/* group kind "vent" by nearest STREETS polyline */});
it("keeps vents on the road and off the guide's centreline", () => {
  // for each vent: distanceToPolyline(xz, street.points) in [1.0, street.halfWidth - 0.4]
});
it("keeps vents 3 m away from every viewpoint camera and marker", () => {/* world coords via DISTRICTS[d].position */});
it("turns every existing kit 'steam' item into a kitchen source", () => {/* count equals cityLayout steam items */});
it("puts 6–10 stacks on roof tops", () => {/* each stack y equals some roof item's top (position.y + size.y/2) within 0.05 */});
it("tints from the nearest light source within 8 m, else city fog", () => {
  // a vent within 8 m of a signH/signV/lightbox/screen/bigScreen gets that item's NEON colour; otherwise "#3a2a6a"
});
it("is deterministic and leaves cityLayout untouched", () => {/* steamSources() deep-equals a second call; cityLayout() unchanged */});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd FE && npx vitest run src/world/fx/steamLayout.test.ts`
Expected: FAIL. The module is missing.

- [ ] **Step 3: Implement `steamSources()`**

- Use `mulberry32(CITY_SEED ^ STEAM_SEED)`.
- Vents sit at an alternating side and lateral offset; re-roll a vent that breaks a rule, and cap at 20 tries per vent.
- Size by kind:

| kind | radius | height |
| --- | --- | --- |
| vent | 0.5–0.8 | 2.5–4 |
| kitchen | 0.4 | 2.6 |
| stack | 1.2–2 | 8–14 |

- [ ] **Step 4: Implement `SteamPlumes`**

- One `InstancedMesh` of quads with a `ShaderMaterial`:
  - Per-instance attributes: source position, radius, height, tint, phase.
  - 6 puffs per vent or kitchen source, 5 per stack.
- The vertex shader billboards toward the camera, rises with `fract(uTime*speed + phase)`, grows with age and sways slightly.
- The fragment shader draws soft fbm noise with a radial falloff and fades in and out over its life.
- Material settings: `transparent`, `depthWrite:false`, normal blending, `fog:true` (use three's fog chunks or pass fog uniforms).
- Total instances ≤ 240.
- A second instanced mesh draws a small soft glow disc on the floor under each vent, in its tint (additive is allowed because it is small). That is two draw calls in total.
- `uTime` is advanced in one `useFrame`.
- Render it from `Environment` only when `fx.steam` is true. Remove the old per-street `<Steam>` from `StreetKit` and delete `Steam` from `Effects.tsx`.

- [ ] **Step 5: Run all tests and check in the browser**

Run: `cd FE && npx vitest run`
Expected: all PASS.

Then view Gate, Nexus and Projects at 1440×860. Plumes must be visible and tinted, and must not cover the main signs. Take a `?debug=perf` reading at Nexus and record it in the report.

- [ ] **Step 6: Commit**

```bash
git add FE/src/world/fx/steamLayout.ts FE/src/world/fx/steamLayout.test.ts FE/src/world/fx/SteamPlumes.tsx FE/src/world/street/StreetKit.tsx FE/src/world/Environment.tsx FE/src/world/fx/Effects.tsx
git commit -m "feat(fe): steam plumes from street vents, kitchens and rooftop stacks"
```

---

### Task 4: Ground haze under light sources

**Files:**
- Modify:
  - `FE/src/world/fx/Effects.tsx` (`GroundFog`)
  - `FE/src/world/Environment.tsx:42`
- Test: `FE/src/world/fx/fx.test.ts` (add a haze-placement test), using a pure helper exported from `FE/src/world/street/lightSpill.ts`

**Interfaces:**
- Consumes: `spillsFor(items)` and `Spill` (`lightSpill.ts`), `cityLayout()`.
- Produces:
  - In `lightSpill.ts`:

    ```ts
    export function hazePatches(spills: Spill[]): { position: Vec3; radius: number; variant: number; strength: number }[];
    ```

    One patch per floor spill: radius = max(spill.size) × 0.8, y = 0.25, same variant and strength.
  - `GroundFog` keeps its current props and adds `patches` (output of `hazePatches`), rendered as one instanced mesh of soft discs in the spill colour.
  - The existing big plane stays, but only in low mode, at its current opacity.

- [ ] **Step 1: Write the failing test**

```ts
it("makes one haze patch per floor spill and none for wall spills", () => {
  const items = Object.values(cityLayout()).flat();
  const spills = spillsFor(items);
  const patches = hazePatches(spills);
  expect(patches).toHaveLength(spills.filter((s) => s.kind === "floor").length);
  for (const p of patches) expect(p.position[1]).toBeCloseTo(0.25);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd FE && npx vitest run src/world/fx/fx.test.ts`
Expected: FAIL. `hazePatches` is not exported yet.

- [ ] **Step 3: Implement**

- Implement `hazePatches`.
- In high mode (`fx.steam`), draw the patches as one instanced mesh:
  - Normal blending, `depthWrite:false`, `fog:false`.
  - Opacity about 0.12–0.18, scaled by `strength`.
  - The existing fog texture, scrolling slowly through a shared offset uniform.
- The floor must not turn into a grey sheet; check at Nexus.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd FE && npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/src/world/street/lightSpill.ts FE/src/world/fx/fx.test.ts FE/src/world/fx/Effects.tsx FE/src/world/Environment.tsx
git commit -m "feat(fe): coloured ground haze under street-level light sources"
```

---

### Task 5: Brand-consistent intro and HUD

**Files:**
- Modify:
  - `FE/src/styles.css` (intro block ~754–860, HUD block ~70–340, duplicate overrides ~1040 and ~1310–1320)
  - `FE/src/ui/Intro.tsx`
  - `FE/src/ui/Hud.tsx:36-41`
- Create: `FE/src/ui/brandStyles.test.ts`, `FE/src/ui/intro.test.tsx`

**Interfaces:**
- Consumes: `BRAND`.
- Produces:
  - CSS variables `--brand-purple`, `--brand-magenta`, `--brand-silver` on `:root`.
  - Classes `.intro-lockup` (wraps logo and title) and `.brand-wordmark`, shared by `.intro-title` and `.hud-brand-name`.

- [ ] **Step 1: Write the failing tests**

`brandStyles.test.ts` reads `src/styles.css` as text:

```ts
it("defines brand variables equal to BRAND", () => { /* --brand-purple: #8B5CF6 etc., case-insensitive */ });
it("no longer uses --red anywhere in the UI", () => { expect(css).not.toMatch(/var\(--red\)/); });
it("defines .intro-title and .intro-logo once and without !important", () => {
  // count rule blocks whose selector list contains exactly ".intro-title" / ".intro-logo" → 1 each (media queries excluded);
  // no "!important" inside any rule whose selector starts with ".intro"
});
it("keeps the kicker readable", () => {
  // .intro-kicker letter-spacing <= 0.15em, font-size >= 13px, font-family uses var(--font-body)
});
it("gives the wordmark the brand gradient", () => {
  // .brand-wordmark contains "background-clip: text" and all three --brand-* variables
});
```

`intro.test.tsx` follows the `fullscreen.test.tsx` pattern (createRoot + act):
- Render `<Intro />`.
- Expect `.intro-lockup` to contain the `img.intro-logo` and `h1.intro-title.brand-wordmark`.
- Render `<Hud />` with `introDone: true` and expect `.hud-brand-name.brand-wordmark`.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd FE && npx vitest run src/ui/brandStyles.test.ts src/ui/intro.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

**Variables and HUD colours**
- Add the variables.
- Replace every `var(--red)` in `styles.css` with the brand tone that fits the role:
  - text and active pills → magenta
  - borders → purple at about 60%
  - filled buttons → a purple→magenta gradient
- Keep `--red` defined, because `fx.test.ts` asserts `COLORS.red`, not CSS.

**Wordmark**
- `.brand-wordmark`: Orbitron 900, `linear-gradient(90deg, var(--brand-purple), var(--brand-magenta) 55%, var(--brand-silver))` with `background-clip:text` and transparent fill.
- A soft purple `filter: drop-shadow`.

**Intro**
- `.intro-title` loses the cyan/pink `::before`/`::after` split and gets at most a single short entrance shimmer, which is disabled under `prefers-reduced-motion`.
- Kicker and percent text: `var(--font-body)`, 13–14 px, letter-spacing ≤ 0.15em, `--brand-silver`.
- Bar fill and `.btn-enter`: purple→magenta.
- `.intro-lockup` has a soft dark radial backdrop (an elliptical gradient, not full-screen).
- `.intro-logo` gets a radial `mask-image`, so the faint grid in the PNG's outer glow disappears and the rings stay.
- Delete the late duplicate overrides so each rule lives in one place.

**HUD:** `.hud-brand-name` gets `brand-wordmark` at about 28 px, aligned with the 30 px symbol.

**Check** in the browser at 1440×860, 736 px and 375 px wide.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd FE && npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add FE/src/styles.css FE/src/ui/Intro.tsx FE/src/ui/Hud.tsx FE/src/ui/brandStyles.test.ts FE/src/ui/intro.test.tsx
git commit -m "feat(fe): brand-consistent intro lockup and HUD wordmark"
```

---

### Task 6: Budget pass and before/after evidence

**Files:**
- Modify only what the measurements require, for example steam instance count, haze opacity, emissive levels or fov within 62–68°.
- Create: `docs/superpowers/handoff/2026-11-17-graphics-polish-results.md` (git-ignored folder; local evidence only)

- [ ] **Step 1: Measure**

High mode at 1440×860, using `?debug=perf` and `window.__perf()`:
- the first viewpoint of every district
- one guide trip Gate→Projects and one Nexus→Sanctuary

Low mode: the same districts.

Run `?debug=flicker` (`__flickerProbe()`) at Nexus and Projects.

The pane must be visible (`document.visibilityState === "visible"`) for fps readings.

- [ ] **Step 2: Tune**

If any reading is under budget (high < 50, low < 55, flicker > 0), reduce in this order:
1. steam puffs per source
2. haze patch count/size
3. fov toward 62

Re-measure after each change.

- [ ] **Step 3: Verify**

Run: `cd FE && npx vitest run && npm run build`
Expected: all tests PASS and the build succeeds.

Take screenshots of the intro, Nexus, Projects, Team and Sanctuary at 1440×860, the intro at 375 px, and Nexus in low mode. Record the numbers and the final fov in the results file.

- [ ] **Step 4: Commit**

Commit tuning changes, if any:

```bash
git add <tuned files>
git commit -m "perf(fe): graphics polish budget pass"
```
