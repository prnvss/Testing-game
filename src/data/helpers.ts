import type {McqQuestion, PoolQuestion, Region, RubricItem, Scan, Target, TextQuestion} from './types';

export const circ = (cx: number, cy: number, r: number): Region => ({kind: 'circle', cx, cy, r});
export const box = (x0: number, y0: number, x1: number, y1: number): Region => ({kind: 'rect', x0, y0, x1, y1});

/** Rubric point: any of the phrases earns it. */
export const kw = (label: string, ...any: string[]): RubricItem => ({label, any: any.length ? any : [label]});
export const kw2 = (label: string, ...any: string[]): RubricItem => ({label, any: any.length ? any : [label], points: 2});

export const scan = (id: string, modality: Scan['modality'], eye?: string, caption?: string): Scan => ({
  id,
  src: `scans/${id}.jpg`,
  modality,
  eye,
  caption,
});

export const target = (
  scanId: string,
  id: string,
  label: string,
  synonyms: string[],
  region: Region,
  opts: Partial<Pick<Target, 'points' | 'isBonus'>> = {},
): Target => ({id, label, synonyms, scanId, region, ...opts});

export const text = (
  id: string,
  prompt: string,
  rubric: RubricItem[],
  model: string,
  opts: Partial<Pick<TextQuestion, 'outOf' | 'hint'>> = {},
): TextQuestion => ({type: 'text', id, prompt, rubric, model, ...opts});

export const mcq = (id: string, prompt: string, options: string[], answer: number, model: string): McqQuestion => ({
  type: 'mcq',
  id,
  prompt,
  options,
  answer,
  model,
});

export const early = (question: TextQuestion | McqQuestion): PoolQuestion => ({phase: 'early', question});
export const late = (question: TextQuestion | McqQuestion): PoolQuestion => ({phase: 'late', question});

// Shared synonym lists ---------------------------------------------------------

export const SYN = {
  ma: ['microaneurysm', 'micro aneurysm', 'MA'],
  dotBlot: ['dot blot haemorrhage', 'dot haemorrhage', 'blot haemorrhage', 'intraretinal haemorrhage', 'haemorrhage', 'DBH', 'heme'],
  flame: ['flame haemorrhage', 'flame shaped haemorrhage', 'splinter haemorrhage', 'nerve fibre layer haemorrhage', 'haemorrhage'],
  hardEx: ['hard exudate', 'exudate', 'lipid', 'HE', 'HEs'],
  cws: ['cotton wool spot', 'cotton wool', 'soft exudate', 'CWS', 'nerve fibre layer infarct'],
  disc: ['optic disc', 'optic nerve head', 'ONH', 'disc'],
  fovea: ['fovea', 'macula', 'foveola'],
  drusen: ['drusen', 'druse', 'soft drusen', 'large drusen'],
  discSwelling: ['disc swelling', 'disc oedema', 'swollen disc', 'optic disc oedema', 'papilloedema', 'elevated disc', 'blurred disc margin', 'disc edema'],
};
