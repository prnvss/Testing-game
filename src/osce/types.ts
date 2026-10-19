import type {ComponentType} from 'react';
import type {BVPatient, CVPatient} from './patient';

export type StationId = 'bv' | 'cv';
export type Patient = BVPatient | CVPatient;

export interface Ctx<P extends Patient = Patient> {
  patient: P;
  /** Setup question id → chosen option id. */
  setup: Record<string, string>;
  /** Ids of the instruction lines the student chose to say. */
  instr: string[];
}

export interface InstructionLine {
  id: string;
  text: string;
  /** Key point this line covers (good lines only). Lines sharing a point are interchangeable. */
  point?: string;
  /** Why a bad line is bad (jargon, wrong, unsafe…). */
  bad?: string;
}

export interface SetupOption {
  id: string;
  text: string;
}

export interface SetupQuestion<P extends Patient = Patient> {
  id: string;
  label: string;
  options: SetupOption[];
  /** Acceptable option ids. */
  correct: string[] | ((p: P) => string[]);
  why: string | ((p: P) => string);
}

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  points: number;
  detail?: string;
}

export interface RowMark {
  earned: number;
  max: number;
  notes: string[];
}

export interface Graded {
  /** BV: "Result/s are accurate" (/1). */
  accurate?: RowMark;
  /** BV: "Record findings appropriately" (/1). */
  record?: RowMark;
  /** CV: "Interpret and record patient findings appropriately" (/2). */
  interpret?: RowMark;
  /** Clinical interpretation, reported alongside (not part of the /30). */
  insight?: {ok: boolean; notes: string[]};
}

export interface SimProps<P extends Patient, S> {
  ctx: Ctx<P>;
  sim: S;
  setSim: (fn: (s: S) => S) => void;
}

export interface RecordProps<P extends Patient, S, R> {
  ctx: Ctx<P>;
  sim: S;
  rec: R;
  setRec: (fn: (r: R) => R) => void;
  isLocked: boolean;
}

export interface TestDef<P extends Patient = Patient, S = unknown, R = unknown> {
  /** Colour vision: "interpretation of provided results" for this technique. */
  provided?: ProvidedSpec;
  id: string;
  station: StationId;
  /** BV category (one test per category is assigned). */
  category: 'acc' | 'nearVerg' | 'distVerg' | 'cv';
  /** Tests sharing a group are alternative techniques for the same assigned test (e.g. MEM / NOTT). */
  group: string;
  groupName: string;
  name: string;
  short: string;
  brief: string;
  instructions: InstructionLine[];
  /** Number of distinct key points needed for full instruction marks. */
  needPoints: number;
  setup: SetupQuestion<P>[];
  initSim: (ctx: Ctx<P>) => S;
  Sim: ComponentType<SimProps<P, S>>;
  checks: (sim: S, ctx: Ctx<P>) => Check[];
  initRec: () => R;
  Record: ComponentType<RecordProps<P, S, R>>;
  grade: (rec: R, sim: S, ctx: Ctx<P>) => Graded;
  /** Model record-card entry for this patient. */
  model: (sim: S, ctx: Ctx<P>) => string;
  redFlags?: (sim: S, ctx: Ctx<P>) => string[];
}

// The registry stores heterogeneous tests; the runner only threads each test's own state back into it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTest = TestDef<any, any, any>;

// -----------------------------------------------------------------------------
// Colour vision: interpretation of a different patient's provided results
// -----------------------------------------------------------------------------

export interface CVKey {
  /** Acceptable answers. */
  pf: string[];
  type: string[];
  sev: string[];
  /** Factual statement about this data set that justifies pass/fail, and type/severity. */
  pfWhy: string;
  typeWhy: string;
}

export interface Opt {
  id: string;
  text: string;
}

export interface ProvidedSpec {
  View: ComponentType<{patient: CVPatient}>;
  key: (p: CVPatient) => CVKey;
  pfOptions: Opt[];
  typeOptions: Opt[];
  sevOptions: Opt[];
}
