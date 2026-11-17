// เมืองจากชุดตัวต่อ: วาดเฉพาะถนนที่อยู่ + ถนนที่กำลังเดินผ่าน + สี่แยก
// ป้าย = กล่องเรืองแสงจาง ๆ + ตัวอักษรจาก atlas · จอ = canvas วาดตามจังหวะ · จอใหญ่ = แสงใต้น้ำ · แผง = แผงข้อมูล

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as sfx from "../../audio/sfx";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useWorld } from "../../store/useWorld";
import { cityLayout, type KitItem, type KitType } from "./kitLayout";
import { streetOf, type StreetId } from "./streets";
import { KitInstances, ScreenGroup, SignFaces, neonColor, type SignFace } from "./kitMeshes";
import { curtainWallTexture, patchWindowUv } from "./windowMaterial";
import { SIGN_WORDS } from "../../config/signWords";
import { signAtlas } from "./signAtlas";
import { SCREEN_PROGRAMS } from "./screenPrograms";
import { WaterScreen } from "./WaterScreen";
import { GiantScreen } from "./GiantScreen";
import { InfoPanel, panelContent } from "./InfoPanel";
import { STREETS } from "./streets";
import { FakeReflections } from "./FakeReflections";
import { LightSpill } from "./SpillMeshes";
import { Cables } from "./CableLines";
import { cableSpans } from "./cables";
import { spillsFor } from "./lightSpill";
import { Steam } from "../fx/Effects";
import { fxEnabled } from "../fx/fxEnabled";
import type { DistrictId } from "../../types";

type Key = StreetId | "nexus";

/** ถนนที่ต้องวาดตอนนี้ */
function useVisibleStreets(): Key[] {
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  return useMemo(() => {
    const ids = new Set<Key>(["nexus"]);
    for (const d of travel ? [travel.from, travel.to, district] : [district]) {
      const st = streetOf(d);
      if (st) ids.add(st.id);
    }
    return [...ids];
  }, [district, travel]);
}

const SIGNS: KitType[] = ["signH", "signV", "lightbox"];
/** จอใหญ่ที่สี่แยกชวนไปที่ที่ไปได้ (มุมที่สี่เป็นจอน้ำเปล่า ๆ เพราะ Gate ไม่ใช่ปลายทาง) */
const NEXUS_TARGETS: DistrictId[] = ["projects", "team", "sanctuary"];

const moodOf = (it: KitItem) => (it.street === "nexus" ? "nexus" : STREETS[it.street].mood);

/** เลือกคำให้ป้ายแต่ละชิ้น (คงที่ตาม variant + ลำดับ) — ป้ายตั้งใช้คำแนวตั้ง ป้ายนอนใช้คำแนวนอน */
function signFaces(items: KitItem[]): Map<number, SignFace[]> {
  const atlas = signAtlas();
  const pages = new Map<number, SignFace[]>();
  items.forEach((it, i) => {
    const vertical = it.type === "signV";
    const words = SIGN_WORDS[moodOf(it)].filter((w) => !!w.vertical === vertical);
    const word = words[(it.variant * 7 + i * 3) % words.length];
    const { page, uv } = atlas.lookup(word);
    pages.set(page, [...(pages.get(page) ?? []), { item: it, uv, flicker: (it.variant + i) % 5 === 0 }]);
  });
  return pages;
}

export function StreetKit() {
  const keys = useVisibleStreets();
  const fx = fxEnabled(useWorld((s) => s.quality));
  const flicker = fx.signFlicker;
  const city = cityLayout();
  const byType = useMemo(() => {
    const map = new Map<KitType, KitItem[]>();
    for (const k of keys) for (const it of city[k]) map.set(it.type, [...(map.get(it.type) ?? []), it]);
    return map;
  }, [keys, city]);
  // แสงย้อยจากป้าย/จอ ทุกถนนที่วาดอยู่ + สี่แยก
  const spills = useMemo(() => spillsFor([...byType.values()].flat()), [byType]);
  const get = (t: KitType) => byType.get(t) ?? [];

  const [concrete, concreteN, metalN, metalR] = useTexture([
    "/assets/textures/concrete036_color.jpg",
    "/assets/textures/concrete036_normal.jpg",
    "/assets/textures/metalplates013_normal.jpg",
    "/assets/textures/metalplates013_roughness.jpg",
  ]);
  const windows = useMemo(() => curtainWallTexture(), []);
  useMemo(() => {
    for (const t of [concrete, concreteN, metalN, metalR]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    concrete.colorSpace = THREE.SRGBColorSpace;
  }, [concrete, concreteN, metalN, metalR]);

  // สร้าง material แล้วแพตช์ก่อน compile ครั้งแรก (แพตช์ผ่าน ref ช้าเกินไป หน้าต่างยืดเต็มหน้าตึก)
  const facadeMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: concrete, normalMap: concreteN, roughness: 0.85, metalness: 0.1, emissive: new THREE.Color("#ffffff"), emissiveMap: windows, emissiveIntensity: 0.4 });
    patchWindowUv(m);
    return m;
  }, [concrete, concreteN, windows]);
  useEffect(() => () => facadeMat.dispose(), [facadeMat]);

  const faces = useMemo(() => signFaces([...get("signH"), ...get("signV"), ...get("lightbox")]), [byType]); // eslint-disable-line react-hooks/exhaustive-deps
  const backColor = useMemo(() => (it: KitItem) => neonColor(it.variant, 0.22), []);
  const glowColor = useMemo(() => (it: KitItem) => neonColor(it.variant, it.type === "bigScreen" ? 2.4 : it.type === "panel" ? 1.1 : 1.8), []);
  const shopColor = useMemo(() => (it: KitItem) => neonColor(it.variant, 0.09), []);
  const stripColor = useMemo(() => (it: KitItem) => neonColor(it.variant, 1.4), []);
  const lampColor = useMemo(() => (it: KitItem) => neonColor(it.variant % 2 ? 3 : 0, 2.2), []);
  const facadeTint = useMemo(() => (it: KitItem) => new THREE.Color().setScalar(0.1 + (it.variant % 4) * 0.025), []);

  return (
    <group>
      {/* ตึก (รวมตึกสี่แยก): คอนกรีตเก่าสีเข้ม + ผนังกระจกหน้าต่างขนาดจริงคงที่ · เข้มขึ้นตามความสูง */}
      <KitInstances items={[...get("facade"), ...get("endCap"), ...get("tier")]} color={facadeTint}>
        <primitive object={facadeMat} attach="material" />
      </KitInstances>
      {/* หน้าร้าน: กระจกมืดเงา ๆ มีแสงสีร้านจาง ๆ (ไม่ใช่บล็อกนีออนทึบ) */}
      <KitInstances items={get("shopfront")} color={shopColor}>
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.18} emissive="#000000" envMapIntensity={0.6} />
      </KitInstances>
      {/* ป้าย: กล่องเรืองแสงจาง ๆ + ตัวอักษรจาก atlas */}
      {SIGNS.map((t) => (
        <KitInstances key={t} items={get(t)} color={backColor}>
          <meshBasicMaterial toneMapped={false} />
        </KitInstances>
      ))}
      <LightSpill spills={spills} />
      {flicker && <NeonBuzz faces={[...faces.values()].flat().filter((f) => f.flicker)} />}
      {[...faces].map(([page, list]) => (
        <SignFaces key={page} faces={list} map={signAtlas().pages[page]} color={glowColor} flicker={flicker} />
      ))}
      {/* จอโฆษณา: แยกตามโปรแกรม */}
      {SCREEN_PROGRAMS.map((_, p) => (
        <ScreenGroup key={p} program={p} seed={p * 3 + 1} items={[...get("screen"), ...get("ticker")].filter((it) => it.variant % SCREEN_PROGRAMS.length === p)} />
      ))}
      {/* จอใหญ่แสงใต้น้ำ — จอแรกของแต่ละถนนเป็นจอสำคัญ (โลโก้ + ป้ายบอกทาง) */}
      {get("bigScreen").map((it, i) => (
        <WaterScreen key={`${it.street}-${i}`} item={it} keyTarget={keyTargetOf(it, get("bigScreen"))} />
      ))}
      {/* จอยักษ์โค้งรอบมุมตึก (สูงกว่า/ไกลกว่าจอสำคัญ ไม่มีแสงย้อย) */}
      {fx.giantScreens && get("giantScreen").map((it, i) => (
        <GiantScreen key={`${it.street}-g${i}`} item={it} />
      ))}
      {/* พื้นสะท้อนปลอม (โหมดต่ำ) ใต้จอใหญ่และป้ายตั้ง */}
      {!fx.reflector && <FakeReflections items={[...get("bigScreen"), ...get("giantScreen"), ...get("signV")]} />}
      {fx.steam && <Steam points={get("steam").map((it) => it.position)} />}
      {get("panel").map((it, i) => (
        <InfoPanel key={`${it.street}-${i}`} item={it} content={panelContent(it, i)} />
      ))}
      {/* ของโลหะบนผนัง */}
      <KitInstances items={[...get("ac"), ...get("vent"), ...get("balcony"), ...get("crate"), ...get("roof"), ...get("antenna")]}>
        <meshStandardMaterial color="#1a1b22" normalMap={metalN} roughnessMap={metalR} metalness={0.7} roughness={0.6} />
      </KitInstances>
      <KitInstances items={[...get("pipe"), ...get("cable").filter((it) => it.size[0] <= it.size[1])]}>
        <meshStandardMaterial color="#0c0c10" metalness={0.6} roughness={0.5} />
      </KitInstances>
      {/* สายไฟข้ามถนนแบบหย่อน (สายตั้งของโคมยังเป็นกล่องด้านบน) */}
      <Cables spans={cableSpans(get("cable"))} />
      {/* เส้นนีออนตั้งที่มุมตึก */}
      <KitInstances items={get("edgeStrip")} color={stripColor}>
        <meshBasicMaterial toneMapped={false} />
      </KitInstances>
      <Beacons items={get("beacon")} blink={flicker} />
      <KitInstances items={get("vending")} color={glowColor}>
        <meshBasicMaterial toneMapped={false} />
      </KitInstances>
      <KitInstances items={get("lamp")} color={lampColor} geometry={<sphereGeometry args={[0.5, 12, 10]} />}>
        <meshBasicMaterial toneMapped={false} />
      </KitInstances>
    </group>
  );
}

/** จอใหญ่จอแรกของถนน → ป้ายชวนไปที่ปลายถนน · ที่สี่แยก → แต่ละมุมชวนไปคนละที่ */
function keyTargetOf(it: KitItem, all: KitItem[]): DistrictId | undefined {
  const same = all.filter((x) => x.street === it.street);
  const i = same.indexOf(it);
  if (it.street === "nexus") return NEXUS_TARGETS[i];
  return i === 0 ? STREETS[it.street].district : undefined;
}

const BEACON_RED = new THREE.Color("#ff2a2a").multiplyScalar(3);
const BEACON_PERIOD = 1.6;

/** ไฟเตือนแดงบนปลายเสาอากาศ: กะพริบด้วยการคูณสีต่อชิ้น รอบ 1.6 วินาที เฟสต่างกันต่อชิ้น (ปิดกะพริบเมื่อ blink=false) */
function Beacons({ items, blink }: { items: KitItem[]; blink: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const col = useMemo(() => new THREE.Color(), []);
  const phases = useMemo(() => items.map((_, i) => ((i * 0.618) % 1) * BEACON_PERIOD), [items]);
  const paint = (t: number) => {
    const m = mesh.current;
    if (!m) return;
    items.forEach((_, i) => {
      const k = blink ? (((t + phases[i]) % BEACON_PERIOD) / BEACON_PERIOD < 0.3 ? 1 : 0.08) : 1;
      m.setColorAt(i, col.copy(BEACON_RED).multiplyScalar(k));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    items.forEach((it, i) => {
      tmpObj.position.set(...it.position);
      tmpObj.scale.set(...it.size);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    paint(0);
  }, [items, blink]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => {
    if (blink) paint(clock.elapsedTime);
  });
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
const tmpObj = new THREE.Object3D();

const BUZZ_RANGE = 6;
const BUZZ_COOLDOWN = 5;

/** เสียงซ่าไฟฟ้าเมื่อกล้องเข้าใกล้ป้ายที่กะพริบ (ไม่เกิน 6 หน่วย) — เว้นช่วงไม่ให้ดังถี่ */
function NeonBuzz({ faces }: { faces: SignFace[] }) {
  const last = useRef(-Infinity);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    if (t - last.current < BUZZ_COOLDOWN) return;
    for (const f of faces) {
      if (camera.position.distanceTo(p.set(...f.item.position)) < BUZZ_RANGE) {
        last.current = t;
        sfx.play("neonBuzz");
        return;
      }
    }
  });
  return null;
}
