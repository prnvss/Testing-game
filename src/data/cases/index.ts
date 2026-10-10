import type {Case, Step} from '../types';
import {brao, crao, crvo, rrd} from './vascular';
import {diabetic} from './diabetes';
import {amd, cscr, macularHole} from './macula';
import {best, rp, stargardt} from './dystrophies';
import {glaucoma, naion, papilloedema} from './opticNerve';

export const CASES: Case[] = [rrd, brao, crvo, crao, diabetic, amd, cscr, macularHole, rp, stargardt, best, naion, papilloedema, glaucoma];

export const caseById = (id: string) => CASES.find(c => c.id === id);

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Small seeded PRNG so a run can be replayed from its seed. */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds an exam run for a case:
 *   DDx → 1 random history/tests question → exam findings revealed →
 *   scan annotation questions → final diagnosis → pathophysiology →
 *   up to 2 random late questions (grading, management, MCQs…).
 */
export function buildSteps(c: Case, seed: number): Step[] {
  const rand = mulberry32(seed);
  const early = shuffle(c.pool.filter(p => p.phase === 'early'), rand).slice(0, 1);
  const late = shuffle(c.pool.filter(p => p.phase === 'late'), rand).slice(0, 2);

  const steps: Step[] = [];
  steps.push({key: 'ddx', kind: 'ddx', question: c.ddx, revealScans: [], revealExam: false});
  for (const p of early) {
    steps.push({key: `pool-${p.question.id}`, kind: 'pool', question: p.question, revealScans: [], revealExam: false});
  }
  const shown = new Set<string>();
  for (const q of c.annotate) {
    q.scanIds.forEach(id => shown.add(id));
    steps.push({key: `ann-${q.id}`, kind: 'annotate', question: q, revealScans: [...shown], revealExam: true});
  }
  const all = c.scans.map(s => s.id);
  steps.push({key: 'final', kind: 'finalDx', question: c.finalDx, revealScans: all, revealExam: true});
  steps.push({key: 'patho', kind: 'pathophysiology', question: c.pathophysiology, revealScans: all, revealExam: true});
  for (const p of late) {
    steps.push({key: `pool-${p.question.id}`, kind: 'pool', question: p.question, revealScans: all, revealExam: true});
  }
  return steps;
}
