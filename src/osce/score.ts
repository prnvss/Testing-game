import {markChecks, markInstructions, markSetup} from './marking';
import {makeCVPatient, type CVDefect, type CVPatient, type CVSeverity} from './patient';
import {rng, subSeed} from './rng';
import type {AnyTest, Check, CVKey, Graded, Opt, Patient, RowMark} from './types';

export interface TestState {
  instr: string[];
  setup: Record<string, string>;
  sim: unknown;
  rec: unknown;
}

export interface Row extends RowMark {
  label: string;
  sub?: string;
}

export interface TestResult {
  test: AnyTest;
  rows: Row[];
  earned: number;
  max: number;
  checks: Check[];
  insight?: Graded['insight'];
  model: string;
}

export function scoreTest(test: AnyTest, ts: TestState, patient: Patient): TestResult {
  const ctx = {patient, setup: ts.setup, instr: ts.instr};
  const bv = test.station === 'bv';
  const instr = markInstructions(test.instructions, ts.instr, test.needPoints, bv ? 2 : 4);
  const setup = markSetup(test.setup, ctx, 2);
  const checks = test.checks(ts.sim, ctx);
  const tech = markChecks(checks, bv ? 4 : 2);
  const g = test.grade(ts.rec, ts.sim, ctx);
  const rows: Row[] = [
    {label: 'Provide effective instructions', sub: 'Clear, lay language, easy to interpret', ...instr},
    {label: 'Accurately set up', sub: bv ? 'Target choice, correct equipment, patient and room set up etc' : 'Working distance, illumination, preserving the integrity of the test, patient set up etc', ...setup},
    {label: bv ? 'Demonstrate accurate technique' : 'Perform the test accurately', ...tech},
  ];
  if (bv) {
    rows.push({label: 'Result/s are accurate', ...(g.accurate ?? {earned: 0, max: 1, notes: []})});
    rows.push({label: 'Record findings appropriately', sub: 'Including correct units, laterality etc', ...(g.record ?? {earned: 0, max: 1, notes: []})});
  } else {
    rows.push({label: 'Interpret and record patient findings appropriately', ...(g.interpret ?? {earned: 0, max: 2, notes: []})});
  }
  return {
    test,
    rows,
    earned: rows.reduce((s, r) => s + r.earned, 0),
    max: rows.reduce((s, r) => s + r.max, 0),
    checks,
    insight: g.insight,
    model: test.model(ts.sim, ctx),
  };
}

// -----------------------------------------------------------------------------
// Colour vision — interpretation of provided results
// -----------------------------------------------------------------------------

export interface ProvidedAnswer {
  pf: string;
  pfWhy: string;
  type: string;
  sev: string;
  typeWhy: string;
  note: string;
}
export const blankProvided = (): ProvidedAnswer => ({pf: '', pfWhy: '', type: '', sev: '', typeWhy: '', note: ''});

/** A different patient, usually with a defect so there is something to interpret. */
export function providedPatient(seed: number, testId: string): CVPatient {
  const r = rng(subSeed(seed, `prov-${testId}`));
  const defect: CVDefect = r.chance(0.2) ? 'normal' : r.pick(['protan', 'deutan', 'deutan', 'protan', 'tritan'] as const);
  const severity: CVSeverity = r.pick(['mild', 'moderate', 'strong'] as const);
  return makeCVPatient(subSeed(seed, `prov-patient-${testId}`), {defect, severity});
}

const OTHERS: [CVDefect, CVSeverity][] = [
  ['normal', 'mild'],
  ['protan', 'strong'],
  ['deutan', 'mild'],
  ['tritan', 'moderate'],
  ['deutan', 'strong'],
  ['protan', 'mild'],
  ['deutan', 'moderate'],
  ['tritan', 'strong'],
];

/** Justification choices: the true statement about this data plus statements that are true of other patients' data. */
export function justifications(test: AnyTest, p: CVPatient, seed: number) {
  const key = test.provided!.key(p);
  const r = rng(subSeed(seed, `just-${test.id}`));
  const pf = new Set<string>();
  const ty = new Set<string>();
  for (const [d, s] of r.shuffle(OTHERS)) {
    const k = test.provided!.key(makeCVPatient(subSeed(seed, `${test.id}-${d}-${s}`), {defect: d, severity: s}));
    if (k.pfWhy !== key.pfWhy && pf.size < 3) pf.add(k.pfWhy);
    if (k.typeWhy !== key.typeWhy && ty.size < 3) ty.add(k.typeWhy);
  }
  const opts = (right: string, wrong: Set<string>): Opt[] => r.shuffle([{id: 'c', text: right}, ...[...wrong].map((text, i) => ({id: `w${i}`, text}))]);
  return {key, pf: opts(key.pfWhy, pf), type: opts(key.typeWhy, ty)};
}

export function scoreProvided(n: number, key: CVKey, a: ProvidedAnswer): Row[] {
  const pfOk = key.pf.includes(a.pf);
  const typeOk = key.type.includes(a.type);
  const sevOk = key.sev.includes(a.sev);
  return [
    {
      label: `Accurately interpret if the provided results relating to Technique ${n} are a pass or fail, with justification`,
      earned: (pfOk ? 1 : 0) + (a.pfWhy === 'c' ? 1 : 0),
      max: 2,
      notes: [...(pfOk ? [] : ['Pass/fail incorrect.']), ...(a.pfWhy === 'c' ? [] : [`Justification: ${key.pfWhy}`])],
    },
    {
      label: `Accurately interpret the results relating to Technique ${n} including the type and severity of the defect shown, with justification`,
      earned: (typeOk ? 1 : 0) + (sevOk ? 1 : 0) + (a.typeWhy === 'c' ? 1 : 0),
      max: 3,
      notes: [...(typeOk ? [] : ['Type incorrect.']), ...(sevOk ? [] : ['Severity incorrect.']), ...(a.typeWhy === 'c' ? [] : [`Justification: ${key.typeWhy}`])],
    },
  ];
}
