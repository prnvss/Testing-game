import type {Eye} from './patient';
import type {Check, Ctx, InstructionLine, Patient, RowMark, SetupQuestion} from './types';

const halves = (v: number) => Math.round(v * 2) / 2;

// -----------------------------------------------------------------------------
// Instructions / setup
// -----------------------------------------------------------------------------

export function markInstructions(lines: InstructionLine[], chosen: string[], need: number, max: number): RowMark & {covered: string[]; missing: string[]} {
  const picked = lines.filter(l => chosen.includes(l.id));
  const allPoints = [...new Set(lines.filter(l => l.point).map(l => l.point!))];
  const covered = [...new Set(picked.filter(l => l.point).map(l => l.point!))];
  const bad = picked.filter(l => l.bad);
  const frac = Math.min(1, covered.length / need);
  const earned = Math.max(0, halves(max * frac) - halves(bad.length * (max / 4)));
  const notes: string[] = [];
  for (const b of bad) notes.push(`Avoid: “${b.text}” — ${b.bad}`);
  const missing = allPoints.filter(p => !covered.includes(p));
  if (covered.length < need) for (const m of missing) notes.push(`Missing key point: ${m}`);
  if (picked.length === 0) notes.push('No instructions were given to the patient.');
  return {earned: Math.min(max, earned), max, notes, covered, missing};
}

export const correctFor = <P extends Patient>(q: SetupQuestion<P>, p: P) => (typeof q.correct === 'function' ? q.correct(p) : q.correct);
export const whyFor = <P extends Patient>(q: SetupQuestion<P>, p: P) => (typeof q.why === 'function' ? q.why(p) : q.why);

export function markSetup<P extends Patient>(qs: SetupQuestion<P>[], ctx: Ctx<P>, max: number): RowMark {
  let right = 0;
  const notes: string[] = [];
  for (const q of qs) {
    const ok = correctFor(q, ctx.patient).includes(ctx.setup[q.id] ?? '');
    if (ok) right++;
    else {
      const best = q.options.find(o => correctFor(q, ctx.patient).includes(o.id));
      notes.push(`${q.label}: ${ctx.setup[q.id] ? 'incorrect' : 'not set'} — ${best ? `use “${best.text}”. ` : ''}${whyFor(q, ctx.patient)}`);
    }
  }
  return {earned: halves((max * right) / Math.max(1, qs.length)), max, notes};
}

export function markChecks(checks: Check[], max: number): RowMark {
  const total = checks.reduce((s, c) => s + c.points, 0) || 1;
  const got = checks.filter(c => c.ok).reduce((s, c) => s + c.points, 0);
  return {
    earned: halves((max * got) / total),
    max,
    notes: checks.filter(c => !c.ok).map(c => `${c.label}${c.detail ? ` — ${c.detail}` : ''}`),
  };
}

// -----------------------------------------------------------------------------
// Spectacle correction
// -----------------------------------------------------------------------------

export const RX_OPTIONS = [
  {id: 'habitual', text: 'With habitual distance correction (specs / Rx in phoropter or trial frame)'},
  {id: 'none', text: 'Without correction'},
  {id: 'add', text: 'With a +1.00 near add over the distance Rx'},
];

export function rxQuestion<P extends Patient>(): SetupQuestion<P> {
  return {
    id: 'rx',
    label: 'Spectacle correction',
    options: RX_OPTIONS,
    correct: p => (p.wearsSpecs ? ['habitual'] : ['habitual', 'none']),
    why: p =>
      p.wearsSpecs
        ? `The patient has a ${p.rx.od < 0 ? 'myopic' : 'hyperopic'} Rx (${p.rx.od.toFixed(2)} D) — test through it so accommodation/vergence demand is correct.`
        : 'The patient is essentially emmetropic, so no correction is needed (testing with plano is equivalent). Never add a near add for these tests.',
  };
}

/** Uncorrected refractive error that biases results (D, + = hyperopic) — 0 when correctly corrected. */
export function rxBias(ctx: Ctx<Patient>): number {
  const p = ctx.patient;
  const se = (p.rx.od + p.rx.os) / 2;
  if (ctx.setup.rx === 'add') return -1; // +1.00 add relaxes accommodative demand
  if (ctx.setup.rx === 'none' && p.wearsSpecs) return se;
  return 0;
}

// -----------------------------------------------------------------------------
// Free-text record parsing
// -----------------------------------------------------------------------------

const norm = (t: string) => t.replace(/[−–—]/g, '-').replace(/\s+/g, ' ').trim();

export const hasDioptreUnit = (t: string) => /(\d|\b)\s*(d|ds|dioptres?|diopters?)\b/i.test(norm(t));
export const hasPrismUnit = (t: string) => /(Δ|\^|\bpd\b|\bp\.d\.|prism|\bpdt\b|∆|\bΔ)/i.test(norm(t)) || /\d\s*Δ/.test(t);
export const hasCmUnit = (t: string) => /\d\s*cm\b|\bcm\b|centimet/i.test(norm(t));
export const hasCpmUnit = (t: string) => /cpm|c\/min|cycles?\s*(per|\/)\s*min/i.test(norm(t));

export function numbers(t: string): number[] {
  return [...norm(t).matchAll(/[+-]?\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0]));
}

const EYE_RE = /\b(od|re|r|right|os|le|l|left|ou|be|both|binoc(?:ular(?:ly)?)?)\b\s*[:=]?/gi;

/** Values written after each eye label ("OD +0.50 OS +0.75", "R 10 D, L 9.5 D"). */
export function eyeValues(t: string): Partial<Record<Eye | 'ou', number[]>> {
  const s = norm(t);
  const out: Partial<Record<Eye | 'ou', number[]>> = {};
  const marks = [...s.matchAll(EYE_RE)].map(m => ({i: m.index ?? 0, end: (m.index ?? 0) + m[0].length, tok: m[1].toLowerCase()}));
  marks.forEach((m, k) => {
    const seg = s.slice(m.end, k + 1 < marks.length ? marks[k + 1].i : s.length);
    const eye: Eye | 'ou' = /^(od|re|r|right)$/.test(m.tok) ? 'od' : /^(os|le|l|left)$/.test(m.tok) ? 'os' : 'ou';
    const nums = numbers(seg);
    if (nums.length) out[eye] = [...(out[eye] ?? []), ...nums];
  });
  return out;
}

export type PhoriaDir = 'exo' | 'eso' | 'ortho' | null;
export function phoriaDir(t: string): PhoriaDir {
  const s = norm(t).toLowerCase();
  if (/\bortho/.test(s)) return 'ortho';
  if (/\bxp\b|exo|\bx\(?t?\)?\b|\bx'?p'?\b/.test(s)) return 'exo';
  if (/\bep\b|eso|\be\(?t?\)?\b/.test(s)) return 'eso';
  return null;
}

export const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;

export function mark(ok: boolean, max = 1, notes: string[] = []): RowMark {
  return {earned: ok ? max : 0, max, notes};
}
