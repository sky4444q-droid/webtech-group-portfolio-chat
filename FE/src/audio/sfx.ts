// เสียงบรรยากาศและเสียงประกอบ สร้างด้วยโค้ดทั้งหมด (Web Audio API) — ไม่มีไฟล์เสียง ไม่มีปัญหาลิขสิทธิ์
// ทุกฟังก์ชันไม่ทำอะไรถ้ายังไม่ unlock() หรือเบราว์เซอร์ไม่มี AudioContext (เช่นตอนทดสอบ)

import type { DistrictId } from "../types";
import { streetOf, type StreetId } from "../world/street/streets";

export type SfxName =
  | "hover"
  | "click"
  | "panelOpen"
  | "panelClose"
  | "send"
  | "reply"
  | "step"
  | "whoosh"
  | "elevatorDoor"
  | "elevatorRun"
  | "ding"
  | "discover"
  | "neonBuzz"
  | "morph";

/** เสียงบรรยากาศตามถนน (หรือสี่แยก) */
export type AmbienceId = StreetId | "nexus" | null;

const ambienceOf = (d: DistrictId): Exclude<AmbienceId, null> => streetOf(d)?.id ?? "nexus";

/**
 * ระหว่างเดินทาง: ครึ่งแรกเดินถนนของต้นทาง ครึ่งหลังเดินถนนของปลายทาง (ทุกทริปผ่านสี่แยก)
 * ไม่ได้เดินทาง: เสียงของถนน/สี่แยกที่อยู่
 */
export function ambienceFor(district: DistrictId, travel: { from: DistrictId; to: DistrictId } | null, tripK: number): AmbienceId {
  if (!travel) return ambienceOf(district);
  return tripK < 0.5 ? ambienceOf(travel.from) : ambienceOf(travel.to);
}

type Layer = "chatter" | "sizzle" | "hovercars" | "pad" | "hum" | "chimes";

/** สูตรเสียงแต่ละถนน: โทนทุ้ม (Hz), ความดังฝน, และชั้นเสียงเฉพาะถนน */
const AMBIENCE: Record<Exclude<AmbienceId, null>, { drone: number[]; rain: number; layers: Layer[] }> = {
  // ซอยอาหาร: เสียงคนคุยจาง ๆ + เสียงฉ่าของกระทะ
  gateLane: { drone: [55, 82.5], rain: 0.45, layers: ["chatter", "sizzle"] },
  // สี่แยก: เสียงฮัมเมืองกว้าง ๆ + รถลอยผ่าน
  nexus: { drone: [65.4, 98, 130.8], rain: 0.35, layers: ["hovercars"] },
  // ถนนแกลเลอรี: pad นุ่ม ๆ
  galleryAvenue: { drone: [73.4, 110], rain: 0.2, layers: ["pad"] },
  // ถนนสำนักงาน: เสียงไฟฟ้าฮัม
  officeRow: { drone: [61.7, 92.5], rain: 0.12, layers: ["hum"] },
  // ซอยแคบ: ทุ้มลึกเงียบ ๆ + กระดิ่งลม
  sanctuaryAlley: { drone: [41.2, 61.7], rain: 0.05, layers: ["chimes"] },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambBus: GainNode | null = null;
let fxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let current: { id: AmbienceId; stop: (fade: number) => void } | null = null;
let enabled = true;

function noiseBuffer(c: AudioContext): AudioBuffer {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** เรียกครั้งแรกหลังผู้ชมคลิก */
export function unlock(): void {
  if (ctx || typeof window === "undefined") return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  ambBus = ctx.createGain();
  ambBus.gain.value = 0.5;
  ambBus.connect(master);
  fxBus = ctx.createGain();
  fxBus.gain.value = 0.6;
  fxBus.connect(master);
  noise = noiseBuffer(ctx);
  void ctx.resume();
}

/** เปิด/ปิดเสียงบรรยากาศ+ประกอบทั้งหมด (ค่าจาก useAudio) */
export function setEnabled(on: boolean): void {
  enabled = on;
  if (ctx && master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.15);
}

/** AI พูด → เสียงบรรยากาศเบาลงชั่วคราว */
export function duck(on: boolean): void {
  if (ctx && ambBus) ambBus.gain.setTargetAtTime(on ? 0.18 : 0.5, ctx.currentTime, 0.25);
}

export function setAmbience(id: AmbienceId): void {
  if (!ctx || !ambBus || !noise) return;
  if (current?.id === id) return;
  current?.stop(1.5);
  current = null;
  if (!id) return;
  const c = ctx;
  const cfg = AMBIENCE[id];
  const out = c.createGain();
  out.gain.value = 0;
  out.gain.setTargetAtTime(1, c.currentTime, 0.6);
  out.connect(ambBus);
  const nodes: AudioScheduledSourceNode[] = [];

  // ฝน: noise กรองความถี่สูง
  if (cfg.rain > 0) {
    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 7000;
    const g = c.createGain();
    g.gain.value = cfg.rain * 0.35;
    src.connect(hp).connect(lp).connect(g).connect(out);
    src.start();
    nodes.push(src);
  }
  // เสียงฮัมของเมือง/โทนประจำพื้นที่
  cfg.drone.forEach((f, i) => {
    const o = c.createOscillator();
    o.type = i === 0 ? "sawtooth" : "sine";
    o.frequency.value = f;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    const g = c.createGain();
    g.gain.value = i === 0 ? 0.05 : 0.035;
    // ลมหายใจช้า ๆ
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07 + i * 0.05;
    const lg = c.createGain();
    lg.gain.value = 0.015;
    lfo.connect(lg).connect(g.gain);
    o.connect(lp).connect(g).connect(out);
    o.start();
    lfo.start();
    nodes.push(o, lfo);
  });
  const timers: number[] = [];
  const noiseLoop = (type: BiquadFilterType, freq: number, q: number, gain: number) => {
    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.loopStart = Math.random();
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out);
    src.start();
    nodes.push(src);
    return { f, g };
  };
  const wobble = (param: AudioParam, rate: number, depth: number) => {
    const lfo = c.createOscillator();
    lfo.frequency.value = rate;
    const lg = c.createGain();
    lg.gain.value = depth;
    lfo.connect(lg).connect(param);
    lfo.start();
    nodes.push(lfo);
  };
  for (const layer of cfg.layers) {
    if (layer === "chatter") {
      // ช่วงเสียงพูดของคน (bandpass) ดังเบาสลับกันเป็นจังหวะ
      for (const [fq, rate] of [[700, 1.7], [1300, 2.3]] as const) {
        const { g } = noiseLoop("bandpass", fq, 3, 0.02);
        wobble(g.gain, rate, 0.018);
      }
    } else if (layer === "sizzle") {
      const { g } = noiseLoop("highpass", 5200, 0.7, 0.012);
      wobble(g.gain, 0.4, 0.008);
    } else if (layer === "hovercars") {
      // ย่านความถี่กวาดช้า ๆ = รถลอยแล่นผ่านไปมา
      const { f, g } = noiseLoop("bandpass", 420, 6, 0.0);
      wobble(f.frequency, 0.09, 260);
      wobble(g.gain, 0.09, 0.05);
    } else if (layer === "pad") {
      [220, 277.2, 329.6].forEach((fq, i) => {
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = fq;
        const g = c.createGain();
        g.gain.value = 0.012;
        wobble(g.gain, 0.05 + i * 0.03, 0.01);
        o.connect(g).connect(out);
        o.start();
        nodes.push(o);
      });
    } else if (layer === "hum") {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 50;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const g = c.createGain();
      g.gain.value = 0.02;
      o.connect(lp).connect(g).connect(out);
      o.start();
      nodes.push(o);
    } else if (layer === "chimes") {
      // กระดิ่งลม: โน้ตเพนทาโทนิกสุ่มห่าง ๆ
      const notes = [1046.5, 1174.7, 1318.5, 1568, 1760];
      const ring = () => {
        if (!ctx || current?.id !== id) return;
        const t0 = c.currentTime;
        const o = c.createOscillator();
        o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.025, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
        o.connect(g).connect(out);
        o.start(t0);
        o.stop(t0 + 2.5);
      };
      timers.push(window.setInterval(() => Math.random() < 0.45 && ring(), 1400));
    }
  }

  current = {
    id,
    stop: (fade) => {
      timers.forEach((t) => window.clearInterval(t));
      out.gain.setTargetAtTime(0, c.currentTime, fade / 3);
      const end = c.currentTime + fade + 0.1;
      nodes.forEach((n) => n.stop(end));
    },
  };
}

// ---------- เสียงประกอบ ----------

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; delay?: number } = {}) {
  if (!ctx || !fxBus) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const o = ctx.createOscillator();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t0);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(fxBus);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function burst(dur: number, opts: { from: number; to: number; gain?: number; q?: number }) {
  if (!ctx || !fxBus || !noise) return;
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = opts.q ?? 1.2;
  bp.frequency.setValueAtTime(opts.from, t0);
  bp.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.4, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(fxBus);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

export function play(name: SfxName): void {
  if (!ctx || !enabled) return;
  switch (name) {
    case "hover":
      return tone(1400, 0.06, { gain: 0.04, type: "triangle" });
    case "click":
      return tone(880, 0.09, { gain: 0.12, type: "square", to: 1320 });
    case "panelOpen":
      tone(520, 0.18, { gain: 0.1, to: 1040 });
      return tone(780, 0.2, { gain: 0.06, delay: 0.05, to: 1560 });
    case "panelClose":
      return tone(1040, 0.16, { gain: 0.08, to: 420 });
    case "send":
      return tone(660, 0.12, { gain: 0.1, type: "triangle", to: 990 });
    case "reply":
      tone(990, 0.15, { gain: 0.08 });
      return tone(1320, 0.2, { gain: 0.07, delay: 0.08 });
    case "step":
      return burst(0.09, { from: 180, to: 90, gain: 0.25, q: 0.8 });
    case "whoosh":
      return burst(1.4, { from: 300, to: 2400, gain: 0.35 });
    case "elevatorDoor":
      return burst(0.5, { from: 600, to: 300, gain: 0.25, q: 2 });
    case "elevatorRun":
      return tone(70, 2.2, { gain: 0.12, type: "sawtooth", to: 95 });
    case "ding":
      tone(1318.5, 0.6, { gain: 0.15 });
      return tone(1046.5, 0.8, { gain: 0.12, delay: 0.18 });
    case "neonBuzz":
      // ป้ายนีออนกะพริบใกล้ ๆ: เสียงซ่าไฟฟ้าสั้น ๆ
      tone(120, 0.35, { gain: 0.05, type: "sawtooth" });
      return burst(0.3, { from: 3000, to: 2200, gain: 0.08, q: 6 });
    case "morph":
      // ตัวจิ๋วแปลงร่างเป็น AI: เสียงไล่ขึ้นนุ่ม ๆ
      burst(0.9, { from: 400, to: 3200, gain: 0.18, q: 2 });
      return [523.3, 784, 1046.5].forEach((f, i) => tone(f, 0.5, { gain: 0.07, delay: 0.25 + i * 0.07 }));
    case "discover":
      [880, 1108.7, 1318.5, 1760].forEach((f, i) => tone(f, 0.35, { gain: 0.1, delay: i * 0.08 }));
      return;
  }
}
