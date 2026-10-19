import {rng, subSeed} from '../rng';
import type {CVPatient} from '../patient';
import {D15_UV, AXIS_DEG} from './color';

const lvl = {mild: 1, moderate: 2, strong: 3} as const;

// -----------------------------------------------------------------------------
// Ishihara (24-plate edition, plates 1–17 numerals — matches the recording sheet)
// -----------------------------------------------------------------------------

export type IshKind = 'Demonstration' | 'Transformation' | 'Vanishing' | 'Hidden' | 'Diagnostic';
export interface IshPlate {
  n: number;
  kind: IshKind;
  normal: string;
  defect: string;
}

export const ISHIHARA: IshPlate[] = [
  {n: 1, kind: 'Demonstration', normal: '12', defect: '12'},
  {n: 2, kind: 'Transformation', normal: '8', defect: '3'},
  {n: 3, kind: 'Transformation', normal: '29', defect: '70'},
  {n: 4, kind: 'Transformation', normal: '5', defect: '2'},
  {n: 5, kind: 'Transformation', normal: '3', defect: '5'},
  {n: 6, kind: 'Transformation', normal: '15', defect: '17'},
  {n: 7, kind: 'Transformation', normal: '74', defect: '21'},
  {n: 8, kind: 'Vanishing', normal: '6', defect: 'X'},
  {n: 9, kind: 'Vanishing', normal: '45', defect: 'X'},
  {n: 10, kind: 'Vanishing', normal: '5', defect: 'X'},
  {n: 11, kind: 'Vanishing', normal: '7', defect: 'X'},
  {n: 12, kind: 'Vanishing', normal: '16', defect: 'X'},
  {n: 13, kind: 'Vanishing', normal: '73', defect: 'X'},
  {n: 14, kind: 'Hidden', normal: 'X', defect: '5'},
  {n: 15, kind: 'Hidden', normal: 'X', defect: '45'},
  {n: 16, kind: 'Diagnostic', normal: '26', defect: 'Protan: 6 · Deutan: 2'},
  {n: 17, kind: 'Diagnostic', normal: '42', defect: 'Protan: 2 · Deutan: 4'},
];

const DIAG = {16: {protan: '6', deutan: '2'}, 17: {protan: '2', deutan: '4'}} as const;

/** What the patient says for each plate ('X' = nothing seen). */
export function ishiharaResponses(p: CVPatient, label = 'ish'): string[] {
  const r = rng(subSeed(p.seed, label));
  const rg = p.defect === 'protan' || p.defect === 'deutan';
  const pr = {mild: 0.55, moderate: 0.85, strong: 1}[p.severity];
  const slip = !rg && r.chance(0.12) ? r.int(8, 13) : -1;
  const strongish = p.severity === 'strong' || (p.severity === 'moderate' && r.chance(0.7));
  return ISHIHARA.map(pl => {
    if (pl.n === 1) return '12';
    if (!rg) {
      if (pl.n === slip) return pl.normal === '45' ? '46' : 'X';
      return pl.normal;
    }
    const type = p.defect as 'protan' | 'deutan';
    switch (pl.kind) {
      case 'Transformation':
        return r.chance(pr) ? pl.defect : r.chance(0.5) ? pl.normal : 'X';
      case 'Vanishing':
        return r.chance(pr) ? 'X' : pl.normal;
      case 'Hidden':
        return r.chance(pr * 0.8) ? pl.defect : 'X';
      case 'Diagnostic': {
        const d = DIAG[pl.n as 16 | 17][type];
        return strongish ? d : `${pl.normal} (${d} clearer)`;
      }
      default:
        return pl.normal;
    }
  });
}

export function ishiharaAnalysis(resp: string[]) {
  const norm = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  const correct = ISHIHARA.slice(0, 15).filter((pl, i) => norm(resp[i] ?? '') === norm(pl.normal)).length;
  const verdict: 'pass' | 'fail' | 'borderline' = correct >= 13 ? 'pass' : correct <= 9 ? 'fail' : 'borderline';
  const d16 = resp[15] ?? '';
  const d17 = resp[16] ?? '';
  const single = (s: string) => /^\d$/.test(s.trim());
  let type: 'protan' | 'deutan' | 'unclassified' | 'normal' = 'normal';
  let severity: 'mild' | 'strong' | 'na' = 'na';
  if (verdict !== 'pass') {
    const protanVotes = (/^6$|6 clearer/.test(d16) ? 1 : 0) + (/^2$|2 clearer/.test(d17) ? 1 : 0);
    const deutanVotes = (/^2$|2 clearer/.test(d16) ? 1 : 0) + (/^4$|4 clearer/.test(d17) ? 1 : 0);
    type = protanVotes > deutanVotes ? 'protan' : deutanVotes > protanVotes ? 'deutan' : 'unclassified';
    severity = type === 'unclassified' ? 'na' : single(d16) || single(d17) ? 'strong' : 'mild';
  }
  return {correct, verdict, type, severity};
}

// -----------------------------------------------------------------------------
// HRR 4th edition
// -----------------------------------------------------------------------------

export type Shape = 'O' | 'X' | '▲' | '▼' | '◀' | '▶';
export type HrrCol = 'demo' | 'BY' | 'RG' | 'P' | 'D' | 'T' | 'Tt';
export interface HrrSymbol {
  shape: Shape;
  quad: 0 | 1 | 2 | 3; // TL TR BL BR
  col: HrrCol;
}
export interface HrrPlate {
  n: number;
  section: 'Demonstration' | 'Screening' | 'R-G diagnostic' | 'B-Y diagnostic';
  group?: 'mild' | 'medium' | 'strong';
  syms: HrrSymbol[];
}

const q = (n: number, i: number) => (((n * 3 + i * 2 + 1) % 4) as 0 | 1 | 2 | 3);
const plate = (n: number, section: HrrPlate['section'], syms: [Shape, HrrCol][], group?: HrrPlate['group']): HrrPlate => ({
  n,
  section,
  group,
  syms: syms.map(([shape, col], i) => ({shape, col, quad: q(n, i)})),
});

export const HRR: HrrPlate[] = [
  plate(1, 'Demonstration', [['O', 'demo'], ['X', 'demo']]),
  plate(2, 'Demonstration', [['▲', 'demo']]),
  plate(3, 'Demonstration', [['X', 'demo'], ['O', 'demo']]),
  plate(4, 'Demonstration', []),
  plate(5, 'Screening', [['O', 'BY'], ['X', 'BY']]),
  plate(6, 'Screening', [['O', 'BY'], ['▼', 'BY']]),
  plate(7, 'Screening', [['X', 'RG'], ['▶', 'RG']]),
  plate(8, 'Screening', [['O', 'RG'], ['▶', 'RG']]),
  plate(9, 'Screening', [['O', 'RG']]),
  plate(10, 'Screening', [['X', 'RG']]),
  plate(11, 'R-G diagnostic', [['O', 'P'], ['▲', 'D']], 'mild'),
  plate(12, 'R-G diagnostic', [['X', 'D']], 'mild'),
  plate(13, 'R-G diagnostic', [['▲', 'P']], 'mild'),
  plate(14, 'R-G diagnostic', [['O', 'P'], ['X', 'D']], 'mild'),
  plate(15, 'R-G diagnostic', [['X', 'P'], ['O', 'D']], 'mild'),
  plate(16, 'R-G diagnostic', [['◀', 'P'], ['O', 'D']], 'medium'),
  plate(17, 'R-G diagnostic', [['O', 'P'], ['▶', 'D']], 'medium'),
  plate(18, 'R-G diagnostic', [['▶', 'P'], ['X', 'D']], 'medium'),
  plate(19, 'R-G diagnostic', [['X', 'P'], ['O', 'D']], 'strong'),
  plate(20, 'R-G diagnostic', [['O', 'P'], ['▼', 'D']], 'strong'),
  plate(21, 'B-Y diagnostic', [['▼', 'T'], ['X', 'Tt']], 'medium'),
  plate(22, 'B-Y diagnostic', [['X', 'T'], ['O', 'Tt']], 'medium'),
  plate(23, 'B-Y diagnostic', [['O', 'T'], ['▼', 'Tt']], 'strong'),
  plate(24, 'B-Y diagnostic', [['◀', 'T'], ['X', 'Tt']], 'strong'),
];

export const QUAD_NAME = ['top left', 'top right', 'bottom left', 'bottom right'];
export const SHAPE_NAME: Record<Shape, string> = {O: 'circle', X: 'cross', '▲': 'triangle', '▼': 'triangle', '◀': 'triangle', '▶': 'triangle'};

const groupLvl = {mild: 1, medium: 2, strong: 3} as const;

/** Seen symbols per plate (indices into syms). */
export function hrrResponses(p: CVPatient, label = 'hrr'): number[][] {
  const r = rng(subSeed(p.seed, label));
  const L = lvl[p.severity];
  const rg = p.defect === 'protan' || p.defect === 'deutan';
  const own = p.defect === 'protan' ? 'P' : 'D';
  const other = p.defect === 'protan' ? 'D' : 'P';
  const out = HRR.map(pl =>
    pl.syms
      .map((s, i) => {
        let miss = false;
        if (s.col === 'RG' && rg) miss = r.chance({1: 0.5, 2: 0.85, 3: 1}[L]);
        if (s.col === 'BY' && p.defect === 'tritan') miss = r.chance({1: 0.7, 2: 1, 3: 1}[L]);
        if (rg && s.col === own && pl.group) miss = groupLvl[pl.group] <= L && r.chance(0.92);
        if (rg && s.col === other && pl.group === 'mild') miss = L >= 2 && r.chance(0.25);
        if (p.defect === 'tritan' && s.col === 'T' && pl.group) miss = groupLvl[pl.group] <= L;
        return miss ? -1 : i;
      })
      .filter(i => i >= 0),
  );
  // A defective always misses at least one screening symbol of their kind.
  const ensure = (plates: number[]) => {
    if (plates.some(n => out[n - 1].length < HRR[n - 1].syms.length)) return;
    out[plates[0] - 1] = out[plates[0] - 1].slice(1);
  };
  if (rg) ensure([7, 8, 9, 10]);
  if (p.defect === 'tritan') ensure([5, 6]);
  return out;
}

export type HrrType = 'normal' | 'protan' | 'deutan' | 'tritan' | 'unclassified';
export function hrrAnalysis(seen: number[][]) {
  const missed = (n: number, col: HrrCol) => HRR[n - 1].syms.some((s, i) => s.col === col && !seen[n - 1]?.includes(i));
  const rgFail = [7, 8, 9, 10].some(n => missed(n, 'RG'));
  const byFail = [5, 6].some(n => missed(n, 'BY'));
  const screening: 'normal' | 'rg' | 'by' | 'both' = rgFail && byFail ? 'both' : rgFail ? 'rg' : byFail ? 'by' : 'normal';
  let type: HrrType = 'normal';
  let extent: 'mild' | 'medium' | 'strong' | 'na' = 'na';
  if (rgFail) {
    const count = (col: HrrCol) => HRR.filter(pl => pl.section === 'R-G diagnostic' && missed(pl.n, col)).length;
    const pc = count('P');
    const dc = count('D');
    type = pc > dc ? 'protan' : dc > pc ? 'deutan' : 'unclassified';
    const col = type === 'protan' ? 'P' : 'D';
    const groups = HRR.filter(pl => pl.section === 'R-G diagnostic' && (type === 'unclassified' ? missed(pl.n, 'P') || missed(pl.n, 'D') : missed(pl.n, col))).map(pl => pl.group!);
    extent = groups.includes('strong') ? 'strong' : groups.includes('medium') ? 'medium' : 'mild';
  } else if (byFail) {
    type = 'tritan';
    const groups = HRR.filter(pl => pl.section === 'B-Y diagnostic' && missed(pl.n, 'T')).map(pl => pl.group!);
    extent = groups.includes('strong') ? 'strong' : groups.includes('medium') ? 'medium' : 'mild';
  }
  return {screening, type, extent, pass: screening === 'normal'};
}

// -----------------------------------------------------------------------------
// City University Test (as on the recording sheet)
// -----------------------------------------------------------------------------

export type CitySpot = 'all' | 'rg' | 'tritan';
/** Pages 1–4: two panels × six positions (row-major, 3 rows × 2 cols); marked positions only. */
export const CITY_P1: {page: number; panels: {pos: number; kind: CitySpot}[][]}[] = [
  {page: 1, panels: [[{pos: 1, kind: 'all'}], [{pos: 3, kind: 'tritan'}]]},
  {page: 2, panels: [[{pos: 1, kind: 'rg'}], [{pos: 0, kind: 'rg'}, {pos: 3, kind: 'tritan'}]]},
  {page: 3, panels: [[{pos: 3, kind: 'rg'}], [{pos: 0, kind: 'rg'}]]},
  {page: 4, panels: [[{pos: 4, kind: 'rg'}], [{pos: 0, kind: 'tritan'}, {pos: 3, kind: 'rg'}]]},
];

export type Dir = 'T' | 'B' | 'L' | 'R';
export const CITY_P2: {page: number; key: Record<'N' | 'P' | 'D' | 'T', Dir>}[] = [
  {page: 5, key: {N: 'R', P: 'B', D: 'L', T: 'T'}},
  {page: 6, key: {N: 'L', P: 'R', D: 'T', T: 'B'}},
  {page: 7, key: {N: 'R', P: 'L', D: 'B', T: 'T'}},
  {page: 8, key: {N: 'L', P: 'T', D: 'R', T: 'B'}},
  {page: 9, key: {N: 'R', P: 'L', D: 'B', T: 'T'}},
  {page: 10, key: {N: 'R', P: 'L', D: 'B', T: 'T'}},
];

/** Cap colours for each City page: centre + the four surrounds keyed by the type they match. */
export function cityColours(page: number) {
  const centre = [2, 4, 6, 10, 12, 14][page - 5];
  const along = (deg: number, exclude: number[]) => {
    const a = (deg * Math.PI) / 180;
    const [cu, cv] = D15_UV[centre];
    let best = 1;
    let bd = Infinity;
    for (let j = 1; j < 16; j++) {
      if (exclude.includes(j) || Math.abs(j - centre) <= 2) continue;
      const du = D15_UV[j][0] - cu;
      const dv = D15_UV[j][1] - cv;
      const perp = Math.abs(-du * Math.sin(a) + dv * Math.cos(a));
      if (perp < bd) {
        bd = perp;
        best = j;
      }
    }
    return best;
  };
  const N = centre + 1;
  const P = along(AXIS_DEG.protan, [N]);
  const D = along(AXIS_DEG.deutan, [N, P]);
  const T = along(AXIS_DEG.tritan, [N, P, D]);
  return {centre, N, P, D, T};
}

export interface CityResp {
  /** Positions seen per page, per panel. */
  p1: number[][][];
  p2: Dir[];
}

export function cityResponses(p: CVPatient, label = 'city'): CityResp {
  const r = rng(subSeed(p.seed, label));
  const L = lvl[p.severity];
  const rg = p.defect === 'protan' || p.defect === 'deutan';
  const p1 = CITY_P1.map(pg =>
    pg.panels.map(spots =>
      spots
        .filter(s => {
          if (s.kind === 'rg' && rg) return !r.chance({1: 0.4, 2: 0.75, 3: 1}[L]);
          if (s.kind === 'tritan' && p.defect === 'tritan') return !r.chance({1: 0.5, 2: 0.8, 3: 1}[L]);
          return true;
        })
        .map(s => s.pos),
    ),
  );
  const col = p.defect === 'protan' ? 'P' : p.defect === 'deutan' ? 'D' : p.defect === 'tritan' ? 'T' : 'N';
  const pr = {1: 0.25, 2: 0.65, 3: 0.95}[L];
  const p2 = CITY_P2.map(pg => (col !== 'N' && r.chance(pr) ? pg.key[col] : pg.key.N));
  return {p1, p2};
}

export function cityAnalysis(resp: CityResp) {
  const total = CITY_P1.reduce((s, pg, i) => s + pg.panels.reduce((t, spots, j) => t + spots.filter(sp => resp.p1[i]?.[j]?.includes(sp.pos)).length, 0), 0);
  const scores = {N: 0, P: 0, D: 0, T: 0};
  CITY_P2.forEach((pg, i) => {
    for (const k of ['N', 'P', 'D', 'T'] as const) if (pg.key[k] === resp.p2[i]) scores[k]++;
  });
  const defectCol = (['P', 'D', 'T'] as const).reduce((a, b) => (scores[b] > scores[a] ? b : a), 'P' as 'P' | 'D' | 'T');
  const defectChoices = 6 - scores.N;
  const pass = total === 10 && scores.N === 6;
  let type: 'normal' | 'protan' | 'deutan' | 'tritan' | 'unclassified' = 'normal';
  if (!pass) {
    if (defectChoices === 0) {
      const missedRg = CITY_P1.some((pg, i) => pg.panels.some((spots, j) => spots.some(s => s.kind === 'rg' && !resp.p1[i]?.[j]?.includes(s.pos))));
      const missedT = CITY_P1.some((pg, i) => pg.panels.some((spots, j) => spots.some(s => s.kind === 'tritan' && !resp.p1[i]?.[j]?.includes(s.pos))));
      type = missedT && !missedRg ? 'tritan' : 'unclassified';
    } else type = defectCol === 'P' ? 'protan' : defectCol === 'D' ? 'deutan' : 'tritan';
  }
  const severity: 'mild' | 'moderate' | 'strong' | 'na' = pass ? 'na' : defectChoices >= 5 ? 'strong' : defectChoices >= 3 ? 'moderate' : 'mild';
  return {total, scores, pass, type, severity, defectChoices};
}

// -----------------------------------------------------------------------------
// Medmont C-100 (flicker photometry dichotomiser)
// -----------------------------------------------------------------------------

/** Scale −5 … +5: protans null towards the red (−) end, deutans towards the green (+) end. */
export const C100 = {lo: -2, hi: 2};

export function c100Mean(p: CVPatient) {
  const r = rng(subSeed(p.seed, 'c100-mean'));
  if (p.defect === 'protan') return -r.range(2.6, 4.4);
  if (p.defect === 'deutan') return r.range(2.6, 4.4);
  return r.normal(0, 0.6);
}

export function c100Reading(p: CVPatient, i: number) {
  const r = rng(subSeed(p.seed, `c100-${i}`));
  return Math.max(-5, Math.min(5, Math.round((c100Mean(p) + r.normal(0, 0.55)) * 2) / 2));
}

export function c100Analysis(readings: number[]) {
  const mean = readings.length ? readings.reduce((a, b) => a + b, 0) / readings.length : 0;
  const type: 'normal' | 'protan' | 'deutan' = mean <= C100.lo ? 'protan' : mean >= C100.hi ? 'deutan' : 'normal';
  return {mean, type, pass: type === 'normal'};
}
