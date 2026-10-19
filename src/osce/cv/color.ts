import {rng, subSeed} from '../rng';
import type {CVDefect, CVSeverity} from '../patient';

// -----------------------------------------------------------------------------
// Colour conversion (CIE L*u*v*, D65) → sRGB
// -----------------------------------------------------------------------------

const WHITE = {x: 0.95047, y: 1, z: 1.08883};
const un = (4 * WHITE.x) / (WHITE.x + 15 * WHITE.y + 3 * WHITE.z);
const vn = (9 * WHITE.y) / (WHITE.x + 15 * WHITE.y + 3 * WHITE.z);

export function luvToHex(L: number, u: number, v: number) {
  const Y = L > 8 ? ((L + 16) / 116) ** 3 : L / 903.3;
  const up = u / (13 * L) + un;
  const vp = v / (13 * L) + vn;
  const X = (Y * 9 * up) / (4 * vp);
  const Z = (Y * (12 - 3 * up - 20 * vp)) / (4 * vp);
  const lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  const g = lin.map(c => {
    const v2 = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, v2)) * 255);
  });
  return `#${g.map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

// -----------------------------------------------------------------------------
// Farnsworth D-15 caps (u*, v* under illuminant C, after Vingrys & King-Smith 1988). Index 0 = reference (pilot).
// -----------------------------------------------------------------------------

export const D15_UV: [number, number][] = [
  [-21.54, -38.39],
  [-23.26, -25.56],
  [-22.41, -15.53],
  [-23.11, -7.45],
  [-22.45, 1.1],
  [-21.67, 7.35],
  [-14.08, 18.74],
  [-2.72, 28.13],
  [14.84, 31.13],
  [23.87, 26.35],
  [31.82, 14.76],
  [31.42, 6.99],
  [29.79, 0.1],
  [26.64, -9.38],
  [22.92, -18.65],
  [11.2, -24.61],
];

/** Desaturated (Lanthony) caps: same hues, lower chroma and higher lightness. */
export const DESAT_SCALE = 0.34;

export const capColor = (i: number, desat: boolean) => {
  const [u, v] = D15_UV[i];
  return desat ? luvToHex(78, u * DESAT_SCALE, v * DESAT_SCALE) : luvToHex(56, u, v);
};

/** Mean confusion-axis angles in u*v* (degrees). */
export const AXIS_DEG: Record<Exclude<CVDefect, 'normal'>, number> = {protan: 8, deutan: -7, tritan: -82};

const SEVERITY_K: Record<CVSeverity, number> = {strong: 0.03, moderate: 0.2, mild: 0.38};

/** The cap order a patient produces, starting after the reference. Greedy nearest-neighbour in their perceived space. */
export function arrangeD15(seed: number, defect: CVDefect, severity: CVSeverity, desat: boolean, label = 'd15'): number[] {
  const r = rng(subSeed(seed, label));
  const scale = desat ? DESAT_SCALE : 1;
  const noise = 1.6;
  const pts = D15_UV.map(([u, v]) => {
    let x = u * scale;
    let y = v * scale;
    if (defect !== 'normal') {
      const a = (AXIS_DEG[defect] * Math.PI) / 180;
      const along = x * Math.cos(a) + y * Math.sin(a);
      const perp = -x * Math.sin(a) + y * Math.cos(a);
      const k = SEVERITY_K[severity];
      // Collapse colour differences along the confusion axis.
      x = along * k * Math.cos(a) - perp * Math.sin(a);
      y = along * k * Math.sin(a) + perp * Math.cos(a);
    }
    return [x + r.normal(0, noise), y + r.normal(0, noise)] as [number, number];
  });
  const left = new Set(Array.from({length: 15}, (_, i) => i + 1));
  const order: number[] = [];
  let cur = 0;
  while (left.size) {
    let best = -1;
    let bd = Infinity;
    for (const j of left) {
      const d = Math.hypot(pts[j][0] - pts[cur][0], pts[j][1] - pts[cur][1]);
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    order.push(best);
    left.delete(best);
    cur = best;
  }
  return order;
}

export interface D15Analysis {
  crossings: number;
  minor: number;
  type: 'normal' | 'protan' | 'deutan' | 'tritan' | 'unclassified';
  angle: number | null;
  pass: boolean;
}

/** Counts major (diametrical) crossings — connections between caps ≥ 3 apart on the cap circle — and classifies their axis. */
export function analyseD15(order: number[]): D15Analysis {
  const seq = [0, ...order];
  let crossings = 0;
  let minor = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1];
    const b = seq[i];
    const d = Math.abs(a - b);
    const circ = Math.min(d, 16 - d);
    if (circ >= 3) {
      crossings++;
      const du = D15_UV[b][0] - D15_UV[a][0];
      const dv = D15_UV[b][1] - D15_UV[a][1];
      const th = Math.atan2(dv, du);
      sx += Math.cos(2 * th);
      sy += Math.sin(2 * th);
    } else if (circ === 2) minor++;
  }
  const pass = crossings <= 1;
  if (crossings < 2) return {crossings, minor, type: 'normal', angle: null, pass};
  const ang = ((Math.atan2(sy, sx) / 2) * 180) / Math.PI;
  const axial = (x: number, y: number) => {
    const d = Math.abs(((x - y + 90) % 180 + 180) % 180 - 90);
    return d;
  };
  const cands = (Object.keys(AXIS_DEG) as (keyof typeof AXIS_DEG)[]).map(k => ({k, d: axial(ang, AXIS_DEG[k])}));
  cands.sort((p, q) => p.d - q.d);
  return {crossings, minor, type: cands[0].d > 25 ? 'unclassified' : cands[0].k, angle: ang, pass};
}
