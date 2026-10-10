/** Normalised image coordinates: 0..1 across the scan's natural width/height. */
export type Region =
  | {kind: 'circle'; cx: number; cy: number; r: number}
  | {kind: 'rect'; x0: number; y0: number; x1: number; y1: number};

export type Modality =
  | 'Colour fundus'
  | 'Widefield fundus'
  | 'Red-free'
  | 'OCT'
  | 'OCT report'
  | 'FFA'
  | 'FAF'
  | 'Visual field'
  | 'Slit lamp'
  | 'Optic disc';

export interface Scan {
  id: string;
  src: string;
  modality: Modality;
  /** e.g. "RE", "LE" or a short descriptor shown in the viewport header. */
  eye?: string;
  caption?: string;
}

/** One marking point: earned when ANY of the alternatives appears in the answer. */
export interface RubricItem {
  label: string;
  any: string[];
  points?: number;
}

export interface Target {
  id: string;
  /** Canonical finding name shown in feedback. */
  label: string;
  /** Accepted words/phrases for the label the student types. */
  synonyms: string[];
  scanId: string;
  region: Region;
  points?: number;
  /** Bonus target: counts if found but is not needed for full marks. */
  isBonus?: boolean;
}

export type Phase = 'early' | 'late';

interface QuestionBase {
  id: string;
  prompt: string;
  /** Extra context shown under the prompt. */
  hint?: string;
  /** Reference answer revealed after marking. */
  model: string;
}

export interface TextQuestion extends QuestionBase {
  type: 'text';
  rubric: RubricItem[];
  /** Points needed for 100%. Defaults to the rubric total. */
  outOf?: number;
}

export interface McqQuestion extends QuestionBase {
  type: 'mcq';
  options: string[];
  answer: number;
}

export interface AnnotateQuestion extends QuestionBase {
  type: 'annotate';
  scanIds: string[];
  targets: Target[];
  /** Target points needed for 100%. Defaults to the non-bonus total. */
  outOf?: number;
}

export type Question = TextQuestion | McqQuestion | AnnotateQuestion;

export interface PoolQuestion {
  phase: Phase;
  question: TextQuestion | McqQuestion;
}

export interface ExamFinding {
  label: string;
  value: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'F' | 'M';
  background?: string;
  occupation?: string;
  /** Reason for attending, in the patient's words. */
  complaint: string;
  summary: string;
  history: string[];
  medicalHistory: string[];
  medications: string[];
  ocularHistory?: string[];
  familyHistory?: string[];
}

export interface Case {
  id: string;
  week: number;
  topic: string;
  /** Final diagnosis (hidden until the end). */
  diagnosis: string;
  difficulty: 1 | 2 | 3;
  source: string;
  patient: Patient;
  exam: ExamFinding[];
  scans: Scan[];
  ddx: TextQuestion;
  annotate: AnnotateQuestion[];
  finalDx: TextQuestion;
  pathophysiology: TextQuestion;
  pool: PoolQuestion[];
}

export interface Step {
  key: string;
  kind: 'ddx' | 'pool' | 'annotate' | 'finalDx' | 'pathophysiology';
  question: Question;
  /** Scans visible from this step on. */
  revealScans: string[];
  revealExam: boolean;
}
