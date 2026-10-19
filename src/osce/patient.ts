import {clamp, rng, round, subSeed, type Rng} from './rng';

// -----------------------------------------------------------------------------
// Shared
// -----------------------------------------------------------------------------

export type Eye = 'od' | 'os';
export const EYE_LABEL: Record<Eye, string> = {od: 'OD (right)', os: 'OS (left)'};

const FIRST = ['Alex', 'Sam', 'Jordan', 'Priya', 'Mei', 'Tom', 'Aisha', 'Lachlan', 'Chloe', 'Ravi', 'Grace', 'Noah', 'Zara', 'Ethan', 'Hana', 'Oliver', 'Isla', 'Kenji', 'Amara', 'Lucas'];
const LAST = ['Nguyen', 'Smith', 'Patel', 'Kowalski', 'Chen', 'O’Brien', 'Haddad', 'Williams', 'Tanaka', 'Rossi', 'Murphy', 'Singh', 'Brown', 'Kaur', 'Taylor', 'Ali'];

export const fmtD = (v: number) => (v === 0 ? 'plano' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`);
export const fmtSigned = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;
/** Phoria in prism dioptres, + = eso. */
export const fmtPhoria = (p: number) => (Math.abs(p) < 0.5 ? 'ortho' : `${Math.round(Math.abs(p))}Δ ${p > 0 ? 'EP' : 'XP'}`);

interface Base {
  seed: number;
  name: string;
  age: number;
  sex: 'M' | 'F';
  /** Spherical equivalent refractive error (D). */
  rx: Record<Eye, number>;
  wearsSpecs: boolean;
  va: {od: string; os: string; ou: string; uncorrected: string; near: string};
  pd: {dist: number; near: number};
}

function baseFor(r: Rng, seed: number, sex?: 'M' | 'F'): Base {
  const s = sex ?? (r.chance(0.5) ? 'M' : 'F');
  const kind = r.next();
  const sph = kind < 0.55 ? round(r.range(-0.25, 0.25), 0.25) : kind < 0.82 ? -round(r.range(0.75, 4), 0.25) : round(r.range(0.75, 2.5), 0.25);
  const aniso = r.chance(0.3) ? r.pick([-0.25, 0.25]) : 0;
  const rx = {od: sph, os: Math.abs(sph) < 0.5 ? sph : sph + aniso};
  const wearsSpecs = Math.abs(sph) >= 0.75;
  const best = r.pick(['6/5', '6/6', '6/5-2', '6/6+2']);
  const unc = sph <= -2.5 ? r.pick(['6/36', '6/24']) : sph <= -1.25 ? r.pick(['6/18', '6/12']) : sph < -0.5 ? '6/9' : sph >= 1.5 ? '6/7.5' : best;
  const dist = r.int(57, 68);
  return {
    seed,
    name: `${r.pick(FIRST)} ${r.pick(LAST)}`,
    age: r.int(19, 38),
    sex: s,
    rx,
    wearsSpecs,
    va: {od: best, os: best, ou: best === '6/6' ? '6/5-2' : best, uncorrected: unc, near: r.pick(['N5', 'N5', 'N4.5', '0.4M'])},
    pd: {dist, near: dist - 3},
  };
}

// -----------------------------------------------------------------------------
// Binocular vision patient
// -----------------------------------------------------------------------------

export type BVCondition = 'normal' | 'ci' | 'ce' | 'ai' | 'aif' | 'ae' | 'di' | 'de' | 'bx' | 'fvd';

export const BV_CONDITION_LABEL: Record<BVCondition, string> = {
  normal: 'Normal binocular vision',
  ci: 'Convergence insufficiency',
  ce: 'Convergence excess',
  ai: 'Accommodative insufficiency',
  aif: 'Accommodative infacility',
  ae: 'Accommodative excess',
  di: 'Divergence insufficiency',
  de: 'Divergence excess',
  bx: 'Basic exophoria',
  fvd: 'Fusional vergence dysfunction',
};

export interface Vergence {
  blur: number | null; // null = no blur ("x")
  brk: number;
  rec: number;
}

export interface BVPatient extends Base {
  kind: 'bv';
  condition: BVCondition;
  /** Dissociated phorias in Δ (+ eso, − exo). */
  phoriaD: number;
  phoriaN: number;
  amp: Record<Eye, number>;
  lag: Record<Eye, number>;
  nra: number;
  pra: number; // negative
  baf: {cpm: number; hard: 'plus' | 'minus' | 'both' | null};
  maf: {cpm: number; hard: 'plus' | 'minus' | 'both' | null};
  npc: {brk: number; rec: number; suppresses: boolean; driftEye: Eye};
  bi: Vergence;
  bo: Vergence;
}

const hofAvg = (age: number) => 18.5 - 0.3 * age;
export const hofMin = (age: number) => 15 - 0.25 * age;
export const hofMax = (age: number) => 25 - 0.4 * age;

export function makeBVPatient(seed: number, forced?: BVCondition): BVPatient {
  const r = rng(seed);
  const b = baseFor(r, seed);
  const condition: BVCondition =
    forced ?? (r.chance(0.35) ? 'normal' : r.pick(['ci', 'ci', 'ce', 'ai', 'ai', 'aif', 'ae', 'di', 'de', 'bx', 'fvd'] as const));

  const q = (v: number, step = 0.25) => round(v, step);
  const ampBase = clamp(r.normal(hofAvg(b.age), 1.2), hofMin(b.age) + 0.5, hofMax(b.age));
  let p: Omit<BVPatient, keyof Base | 'kind' | 'condition'> = {
    phoriaD: Math.round(r.range(-2, 0.8)),
    phoriaN: 0,
    amp: {od: 0, os: 0},
    lag: {od: 0, os: 0},
    nra: q(r.range(1.75, 2.5)),
    pra: -q(r.range(2, 3.25)),
    baf: {cpm: r.int(8, 14), hard: null},
    maf: {cpm: r.int(11, 16), hard: null},
    npc: {brk: Math.round(r.range(2, 5)), rec: 0, suppresses: false, driftEye: r.pick(['od', 'os'] as const)},
    bi: {blur: null, brk: r.int(6, 10), rec: 0},
    bo: {blur: r.int(8, 12), brk: r.int(16, 24), rec: 0},
  };
  p.phoriaN = p.phoriaD - r.int(0, 5);
  let amp = ampBase;
  let lag = q(r.range(0.25, 0.75));

  switch (condition) {
    case 'ci':
      p.phoriaD = Math.round(r.range(-2, 0));
      p.phoriaN = p.phoriaD - r.int(7, 12);
      p.npc.brk = r.int(9, 15);
      p.nra = q(r.range(1.0, 1.5));
      p.baf = {cpm: r.int(2, 5), hard: 'plus'};
      p.bo = {blur: r.int(6, 9), brk: r.int(12, 16), rec: 0};
      lag = q(r.range(0, 0.25));
      p.npc.suppresses = r.chance(0.3);
      break;
    case 'ce':
      p.phoriaD = Math.round(r.range(0, 2));
      p.phoriaN = p.phoriaD + r.int(5, 10);
      p.pra = -q(r.range(0.75, 1.25));
      p.baf = {cpm: r.int(2, 5), hard: 'minus'};
      lag = q(r.range(1.0, 1.5));
      break;
    case 'ai':
      amp = clamp(hofMin(b.age) - r.range(2, 4.5), 3, 12);
      lag = q(r.range(1.0, 1.5));
      p.pra = -q(r.range(0.75, 1.25));
      p.baf = {cpm: r.int(2, 5), hard: 'minus'};
      p.maf = {cpm: r.int(2, 6), hard: 'minus'};
      p.npc.brk = r.int(5, 8);
      break;
    case 'aif':
      p.baf = {cpm: r.int(1, 4), hard: 'both'};
      p.maf = {cpm: r.int(2, 5), hard: 'both'};
      p.nra = q(r.range(1.5, 1.75));
      p.pra = -q(r.range(1.25, 1.75));
      break;
    case 'ae':
      lag = q(r.range(-0.5, 0));
      p.nra = q(r.range(1.0, 1.25));
      p.baf = {cpm: r.int(2, 5), hard: 'plus'};
      p.maf = {cpm: r.int(3, 6), hard: 'plus'};
      break;
    case 'di':
      p.phoriaD = r.int(4, 8);
      p.phoriaN = p.phoriaD - r.int(3, 6);
      p.bi = {blur: null, brk: r.int(2, 4), rec: 0};
      break;
    case 'de':
      p.phoriaD = -r.int(9, 15);
      p.phoriaN = p.phoriaD + r.int(5, 9);
      break;
    case 'bx':
      p.phoriaD = -r.int(6, 10);
      p.phoriaN = p.phoriaD - r.int(-1, 2);
      p.bo = {blur: r.int(5, 8), brk: r.int(10, 14), rec: 0};
      p.npc.brk = r.int(6, 9);
      break;
    case 'fvd':
      p.bi = {blur: null, brk: r.int(3, 5), rec: 0};
      p.bo = {blur: r.int(5, 7), brk: r.int(9, 12), rec: 0};
      p.baf = {cpm: r.int(2, 5), hard: 'both'};
      p.nra = q(r.range(1.25, 1.5));
      p.pra = -q(r.range(1.25, 1.5));
      break;
    case 'normal':
      break;
  }
  const aniso = r.chance(0.25) ? r.pick([-0.5, 0.5]) : 0;
  p = {
    ...p,
    amp: {od: q(amp, 0.25), os: q(Math.max(2, amp + aniso), 0.25)},
    lag: {od: lag, os: r.chance(0.3) ? lag + r.pick([-0.25, 0.25]) : lag},
  };
  p.npc.rec = p.npc.brk + r.int(2, 5);
  p.bi.rec = Math.max(0, p.bi.brk - r.int(2, 4));
  p.bo.rec = Math.max(2, p.bo.brk - r.int(6, 10));
  return {...b, kind: 'bv', condition, ...p};
}

// -----------------------------------------------------------------------------
// Colour vision patient
// -----------------------------------------------------------------------------

export type CVDefect = 'normal' | 'protan' | 'deutan' | 'tritan';
export type CVSeverity = 'mild' | 'moderate' | 'strong';

export const DEFECT_LABEL: Record<CVDefect, string> = {normal: 'Normal colour vision', protan: 'Protan', deutan: 'Deutan', tritan: 'Tritan'};

export interface CVPatient extends Base {
  kind: 'cv';
  defect: CVDefect;
  severity: CVSeverity;
}

export function makeCVPatient(seed: number, forced?: {defect: CVDefect; severity?: CVSeverity}): CVPatient {
  const r = rng(seed);
  const roll = r.next();
  const defect: CVDefect = forced?.defect ?? (roll < 0.3 ? 'normal' : roll < 0.62 ? 'deutan' : roll < 0.9 ? 'protan' : 'tritan');
  const b = baseFor(r, seed, defect === 'normal' || defect === 'tritan' ? undefined : r.chance(0.9) ? 'M' : 'F');
  const severity: CVSeverity = forced?.severity ?? r.pick(['mild', 'moderate', 'strong'] as const);
  return {...b, kind: 'cv', defect, severity};
}

/** Describes the defect as a clinician would name it. */
export function defectName(defect: CVDefect, severity: CVSeverity) {
  if (defect === 'normal') return 'Normal colour vision';
  if (defect === 'tritan') return severity === 'strong' ? 'Tritan (tritanopia-like, strong)' : `Tritan (${severity})`;
  const stem = defect === 'protan' ? 'prot' : 'deuter';
  if (severity === 'strong') return `${defect === 'protan' ? 'Protan' : 'Deutan'} — strong (${stem}anopia / extreme ${stem}anomaly)`;
  return `${defect === 'protan' ? 'Protan' : 'Deutan'} — ${severity} (${stem}anomaly)`;
}

export const testRng = (seed: number, label: string) => rng(subSeed(seed, label));
