import type {
  AnnotateQuestion,
  McqQuestion,
  Region,
  RubricItem,
  Target,
  TextQuestion,
} from '../data/types';

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

/**
 * Abbreviations students write in exams, expanded so either form matches.
 * Keys are matched as whole words after normalisation.
 */
const ABBREVIATIONS: Record<string, string> = {
  ma: 'microaneurysm',
  mas: 'microaneurysms',
  dbh: 'dot blot haemorrhage',
  cws: 'cotton wool spot',
  irma: 'intraretinal microvascular abnormality',
  nvd: 'neovascularisation disc',
  nve: 'neovascularisation elsewhere',
  nvi: 'neovascularisation iris',
  nvg: 'neovascular glaucoma',
  npdr: 'non proliferative diabetic retinopathy',
  pdr: 'proliferative diabetic retinopathy',
  dr: 'diabetic retinopathy',
  dme: 'diabetic macular oedema',
  dmo: 'diabetic macular oedema',
  csme: 'clinically significant macular oedema',
  cmo: 'cystoid macular oedema',
  cme: 'cystoid macular oedema',
  brao: 'branch retinal artery occlusion',
  crao: 'central retinal artery occlusion',
  brvo: 'branch retinal vein occlusion',
  crvo: 'central retinal vein occlusion',
  rvo: 'retinal vein occlusion',
  rao: 'retinal artery occlusion',
  hrvo: 'hemi retinal vein occlusion',
  ois: 'ocular ischaemic syndrome',
  amd: 'age related macular degeneration',
  armd: 'age related macular degeneration',
  namd: 'neovascular age related macular degeneration',
  ga: 'geographic atrophy',
  cnv: 'choroidal neovascularisation',
  mnv: 'macular neovascularisation',
  ped: 'pigment epithelial detachment',
  rpe: 'retinal pigment epithelium',
  rpd: 'reticular pseudodrusen',
  hrf: 'hyperreflective foci',
  srf: 'subretinal fluid',
  irf: 'intraretinal fluid',
  cscr: 'central serous chorioretinopathy',
  csc: 'central serous chorioretinopathy',
  csr: 'central serous chorioretinopathy',
  erm: 'epiretinal membrane',
  vmt: 'vitreomacular traction',
  vma: 'vitreomacular adhesion',
  mh: 'macular hole',
  ftmh: 'full thickness macular hole',
  pvd: 'posterior vitreous detachment',
  rd: 'retinal detachment',
  rrd: 'rhegmatogenous retinal detachment',
  trd: 'tractional retinal detachment',
  rp: 'retinitis pigmentosa',
  naion: 'non arteritic anterior ischaemic optic neuropathy',
  aion: 'anterior ischaemic optic neuropathy',
  aaion: 'arteritic anterior ischaemic optic neuropathy',
  gca: 'giant cell arteritis',
  iih: 'idiopathic intracranial hypertension',
  icp: 'intracranial pressure',
  odd: 'optic disc drusen',
  onh: 'optic nerve head',
  poag: 'primary open angle glaucoma',
  ntg: 'normal tension glaucoma',
  oht: 'ocular hypertension',
  pacg: 'primary angle closure glaucoma',
  aacg: 'acute angle closure glaucoma',
  rnfl: 'retinal nerve fibre layer',
  gcl: 'ganglion cell layer',
  nrr: 'neuroretinal rim',
  cdr: 'cup disc ratio',
  vcdr: 'vertical cup disc ratio',
  ppa: 'peripapillary atrophy',
  dh: 'disc haemorrhage',
  rapd: 'relative afferent pupillary defect',
  iop: 'intraocular pressure',
  cct: 'central corneal thickness',
  va: 'visual acuity',
  vf: 'visual field',
  ffa: 'fundus fluorescein angiography',
  fa: 'fluorescein angiography',
  faf: 'fundus autofluorescence',
  icga: 'indocyanine green angiography',
  octa: 'optical coherence tomography angiography',
  oct: 'optical coherence tomography',
  erg: 'electroretinogram',
  eog: 'electrooculogram',
  bp: 'blood pressure',
  htn: 'hypertension',
  hba1c: 'glycated haemoglobin hba1c',
  bsl: 'blood sugar level',
  esr: 'erythrocyte sedimentation rate',
  crp: 'c reactive protein',
  tia: 'transient ischaemic attack',
  ed: 'emergency department',
  gp: 'general practitioner',
  vegf: 'vascular endothelial growth factor',
  brb: 'blood retina barrier',
  ilm: 'internal limiting membrane',
  elm: 'external limiting membrane',
  ez: 'ellipsoid zone',
  onl: 'outer nuclear layer',
  opl: 'outer plexiform layer',
  inl: 'inner nuclear layer',
  prp: 'panretinal photocoagulation',
  ppv: 'pars plana vitrectomy',
  spk: 'superficial punctate keratitis',
  dd: 'disc diameter',
  hvf: 'humphrey visual field',
  ght: 'glaucoma hemifield test',
  md: 'mean deviation',
  psd: 'pattern standard deviation',
};

/** Fold British/US spelling and punctuation so "haemorrhage" == "hemorrhage". */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'e')
    .replace(/oe/g, 'e')
    .replace(/isation/g, 'ization')
    .replace(/ise\b/g, 'ize')
    .replace(/fibre/g, 'fiber')
    .replace(/centre/g, 'center')
    .replace(/colour/g, 'color')
    .replace(/[-/]/g, ' ')
    .replace(/[^a-z0-9<>.%+ ]/g, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandAbbreviations(normalised: string): string {
  const words = normalised.split(' ');
  const extra: string[] = [];
  for (const w of words) {
    const exp = ABBREVIATIONS[w];
    if (exp) extra.push(normalise(exp));
  }
  return extra.length ? `${normalised} ${extra.join(' ')}` : normalised;
}

/** Light stemming so plurals / -ed / -ing variants still match. */
function stem(word: string): string {
  return word
    .replace(/(ies)$/, 'y')
    .replace(/(es|s)$/, '')
    .replace(/(ing|ed)$/, '')
    .replace(/(al|ic)$/, '');
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function wordMatches(needle: string, haystackWords: string[]): boolean {
  const n = stem(needle);
  for (const w of haystackWords) {
    const s = stem(w);
    if (s === n) return true;
    // Prefix match for long clinical words (e.g. "neovascular" vs "neovascularization").
    if (n.length >= 6 && (s.startsWith(n) || n.startsWith(s)) && s.length >= 5) return true;
    if (n.length >= 6 && editDistanceAtMostOne(s, n)) return true;
  }
  return false;
}

const STOP = new Set(['of', 'the', 'a', 'an', 'and', 'or', 'to', 'in', 'on', 'with', 'for', 'at', 'by', 'is']);

/**
 * True when `phrase` is present: either verbatim (after normalisation) or with
 * every significant word appearing somewhere in the answer.
 */
export function phraseMatches(phrase: string, answerNorm: string, answerWords: string[]): boolean {
  const p = joinNegations(normalise(phrase));
  if (!p) return false;
  if (` ${answerNorm} `.includes(` ${p} `)) return true;
  const words = p.split(' ').filter(w => !STOP.has(w));
  if (words.length === 0) return false;
  // Short tokens (numbers, 2-3 letter terms) must match exactly as a word.
  return words.every(w =>
    w.length <= 3 ? answerWords.includes(w) : wordMatches(w, answerWords),
  );
}

/**
 * Glue negations to the next word ("non ischaemic" → "non_ischaemic") so a
 * negated term never earns the point for the term itself.
 */
function joinNegations(s: string): string {
  return s.replace(/\b(non|not|no) (?=[a-z])/g, '$1_');
}

export function prepareAnswer(text: string): {norm: string; words: string[]} {
  const norm = joinNegations(expandAbbreviations(normalise(text)));
  return {norm, words: norm.split(' ')};
}

// ---------------------------------------------------------------------------
// Text questions
// ---------------------------------------------------------------------------

export interface RubricResult {
  item: RubricItem;
  hit: boolean;
  matched?: string;
}

export interface TextResult {
  score: number; // 0..1
  earned: number;
  outOf: number;
  items: RubricResult[];
}

export function markText(q: TextQuestion, answer: string): TextResult {
  const {norm, words} = prepareAnswer(answer);
  const items = q.rubric.map(item => {
    const matched = item.any.find(alt => phraseMatches(alt, norm, words));
    return {item, hit: Boolean(matched), matched};
  });
  const total = q.rubric.reduce((s, i) => s + (i.points ?? 1), 0);
  const outOf = Math.min(q.outOf ?? total, total);
  const earned = items.reduce((s, r) => s + (r.hit ? r.item.points ?? 1 : 0), 0);
  return {score: outOf ? Math.min(1, earned / outOf) : 0, earned: Math.min(earned, outOf), outOf, items};
}

export function markMcq(q: McqQuestion, choice: number | null): {score: number} {
  return {score: choice === q.answer ? 1 : 0};
}

// ---------------------------------------------------------------------------
// Annotation questions
// ---------------------------------------------------------------------------

export type Tool = 'arrow' | 'line' | 'rect' | 'ellipse' | 'pen' | 'point';

export interface Annotation {
  id: string;
  scanId: string;
  tool: Tool;
  /** Points in normalised image space. arrow/line: [start, end]; rect/ellipse: [corner, corner]; pen: path; point: [p]. */
  points: Array<{x: number; y: number}>;
  label: string;
}

/** Where an annotation "points": the arrow tip, the shape centre, etc. */
export function anchorPoints(a: Annotation): Array<{x: number; y: number}> {
  const pts = a.points;
  if (pts.length === 0) return [];
  switch (a.tool) {
    case 'arrow':
      return [pts[pts.length - 1]];
    case 'point':
      return [pts[0]];
    case 'line': {
      const [p, q] = [pts[0], pts[pts.length - 1]];
      return [p, q, {x: (p.x + q.x) / 2, y: (p.y + q.y) / 2}];
    }
    case 'rect':
    case 'ellipse': {
      const [p, q] = [pts[0], pts[pts.length - 1]];
      return [{x: (p.x + q.x) / 2, y: (p.y + q.y) / 2}];
    }
    case 'pen': {
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      return [{x: cx, y: cy}, ...pts.filter((_, i) => i % 4 === 0)];
    }
  }
}

/** Tolerance added around each answer region (normalised units). */
const SLACK = 0.035;

export function pointInRegion(p: {x: number; y: number}, r: Region, slack = SLACK): boolean {
  if (r.kind === 'circle') {
    return Math.hypot(p.x - r.cx, p.y - r.cy) <= r.r + slack;
  }
  return p.x >= r.x0 - slack && p.x <= r.x1 + slack && p.y >= r.y0 - slack && p.y <= r.y1 + slack;
}

function shapeOverlapsRegion(a: Annotation, r: Region): boolean {
  if (a.tool !== 'rect' && a.tool !== 'ellipse') return false;
  const [p, q] = [a.points[0], a.points[a.points.length - 1]];
  const x0 = Math.min(p.x, q.x);
  const x1 = Math.max(p.x, q.x);
  const y0 = Math.min(p.y, q.y);
  const y1 = Math.max(p.y, q.y);
  // The drawn box must hug the finding: reject boxes covering most of the image.
  if ((x1 - x0) * (y1 - y0) > 0.45) return false;
  const rc = r.kind === 'circle' ? {x: r.cx, y: r.cy} : {x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2};
  return rc.x >= x0 && rc.x <= x1 && rc.y >= y0 && rc.y <= y1;
}

export function labelMatches(label: string, target: Target): boolean {
  const {norm, words} = prepareAnswer(label);
  if (!norm) return false;
  return [target.label, ...target.synonyms].some(s => phraseMatches(s, norm, words));
}

export interface TargetResult {
  target: Target;
  status: 'found' | 'wrong-place' | 'unlabelled' | 'missed';
  annotationId?: string;
  earned: number;
}

export interface AnnotateResult {
  score: number;
  earned: number;
  outOf: number;
  targets: TargetResult[];
  /** Annotations that matched no target, keyed by annotation id → note. */
  stray: Record<string, string>;
}

/**
 * Marks drawn annotations against answer regions.
 * Full credit: label matches the finding AND the mark points at it.
 * Quarter credit: right label in the wrong place, or right place with an unrecognised label.
 */
export function markAnnotations(q: AnnotateQuestion, annotations: Annotation[]): AnnotateResult {
  const used = new Set<string>();
  const results: TargetResult[] = [];

  for (const target of q.targets) {
    const onScan = annotations.filter(a => a.scanId === target.scanId);
    const located = (a: Annotation) =>
      anchorPoints(a).some(p => pointInRegion(p, target.region)) || shapeOverlapsRegion(a, target.region);
    const pts = target.points ?? 1;

    const perfect = onScan.find(a => !used.has(a.id) && labelMatches(a.label, target) && located(a));
    if (perfect) {
      used.add(perfect.id);
      results.push({target, status: 'found', annotationId: perfect.id, earned: pts});
      continue;
    }
    // Several lesions of one type may share a label: allow reuse of a matching mark.
    const reused = onScan.find(a => labelMatches(a.label, target) && located(a));
    if (reused) {
      results.push({target, status: 'found', annotationId: reused.id, earned: pts});
      continue;
    }
    const rightLabel = onScan.find(a => !used.has(a.id) && labelMatches(a.label, target));
    const rightPlace = onScan.find(a => !used.has(a.id) && located(a) && !q.targets.some(t => t !== target && labelMatches(a.label, t)));
    if (rightLabel) {
      results.push({target, status: 'wrong-place', annotationId: rightLabel.id, earned: pts * 0.25});
    } else if (rightPlace) {
      used.add(rightPlace.id);
      results.push({target, status: 'unlabelled', annotationId: rightPlace.id, earned: pts * 0.25});
    } else {
      results.push({target, status: 'missed', earned: 0});
    }
  }

  const stray: Record<string, string> = {};
  for (const a of annotations) {
    if (!results.some(r => r.annotationId === a.id)) {
      stray[a.id] = a.label ? 'Not one of the key findings for this question' : 'Unlabelled mark';
    }
  }

  const core = q.targets.filter(t => !t.isBonus).reduce((s, t) => s + (t.points ?? 1), 0);
  const outOf = q.outOf ?? core;
  const earned = results.reduce((s, r) => s + r.earned, 0);
  return {score: outOf ? Math.min(1, earned / outOf) : 0, earned: Math.min(earned, outOf), outOf, targets: results, stray};
}
