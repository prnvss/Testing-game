import {CASES} from './cases';
import type {AnnotateQuestion, Case} from './types';

/**
 * Scan-interpretation drills: every annotation task from the cases becomes a
 * stand-alone "here's a scan — find the findings, name the disease" round.
 * Diagnosis answers are per scan, because some scans (comparison patients,
 * fellow eyes) show a different condition from their parent case.
 */
export interface DrillDx {
  /** Canonical answer shown after marking. */
  label: string;
  /** Any of these earns full diagnosis marks. */
  accept: string[];
  /** Any of these earns half marks (right family, not specific enough). */
  partial?: string[];
}

export interface Drill {
  id: string;
  caseId: string;
  week: number;
  topic: string;
  question: AnnotateQuestion;
  dx: DrillDx;
  /** One-line clinical context the student can choose to reveal. */
  context: string;
}

const RAO = ['retinal artery occlusion', 'artery occlusion', 'RAO'];
const DR = ['diabetic retinopathy', 'DR', 'NPDR', 'non proliferative diabetic retinopathy'];

const DX: Record<string, DrillDx> = {
  'rd-fundus': {
    label: 'Rhegmatogenous retinal detachment (horseshoe tear)',
    accept: ['rhegmatogenous retinal detachment', 'rhegmatogenous', 'RRD', 'retinal detachment', 'RD'],
    partial: ['retinal tear', 'horseshoe tear', 'retinal break'],
  },
  'rd-oct': {
    label: 'Rhegmatogenous retinal detachment — flap tear with vitreous traction',
    accept: ['rhegmatogenous retinal detachment', 'retinal detachment', 'RRD', 'RD', 'retinal tear', 'horseshoe tear', 'flap tear'],
    partial: ['vitreous traction', 'PVD', 'posterior vitreous detachment'],
  },
  pvd: {
    label: 'Posterior vitreous detachment (Weiss ring)',
    accept: ['posterior vitreous detachment', 'PVD', 'weiss ring'],
    partial: ['vitreous detachment', 'floaters', 'syneresis'],
  },
  'brao-fundus': {
    label: 'Branch retinal artery occlusion',
    accept: ['branch retinal artery occlusion', 'BRAO'],
    partial: RAO,
  },
  'brao-le': {
    label: 'Hypertensive retinopathy (moderate)',
    accept: ['hypertensive retinopathy', 'hypertension retinopathy', 'HTN retinopathy'],
    partial: ['hypertension', 'hypertensive', 'retinal vein occlusion', 'BRVO'],
  },
  'brao-oct-vf': {
    label: 'Branch retinal artery occlusion (inner retinal ischaemia + altitudinal defect)',
    accept: ['branch retinal artery occlusion', 'BRAO'],
    partial: [...RAO, 'NAION', 'ischaemic optic neuropathy'],
  },
  'brao-ffa': {
    label: 'Branch retinal artery occlusion (delayed arterial filling)',
    accept: ['branch retinal artery occlusion', 'BRAO'],
    partial: RAO,
  },
  'crvo-fundus': {
    label: 'Ischaemic central retinal vein occlusion',
    accept: ['central retinal vein occlusion', 'CRVO'],
    partial: ['retinal vein occlusion', 'vein occlusion', 'RVO', 'BRVO', 'hemi retinal vein occlusion'],
  },
  'crao-fundus': {
    label: 'Central retinal artery occlusion',
    accept: ['central retinal artery occlusion', 'CRAO'],
    partial: RAO,
  },
  'crao-emboli': {
    label: 'Retinal artery occlusion from Hollenhorst (cholesterol) emboli',
    accept: ['central retinal artery occlusion', 'branch retinal artery occlusion', 'CRAO', 'BRAO', 'retinal artery occlusion', 'hollenhorst', 'retinal emboli', 'cholesterol emboli'],
    partial: ['embolus', 'emboli', 'carotid', 'amaurosis fugax'],
  },
  'dr-cornea': {
    label: 'Diabetic keratopathy / dry eye (punctate epithelial staining)',
    accept: ['diabetic keratopathy', 'keratopathy', 'dry eye', 'punctate keratitis', 'punctate epithelial erosion', 'SPK', 'keratoconjunctivitis sicca'],
    partial: ['ocular surface', 'tear film', 'corneal staining'],
  },
  'dr-lesions': {
    label: 'Non-proliferative diabetic retinopathy',
    accept: DR,
    partial: ['diabetes', 'diabetic', 'hypertensive retinopathy', 'retinopathy'],
  },
  'dr-le': {
    label: 'Moderate non-proliferative diabetic retinopathy',
    accept: ['moderate NPDR', 'moderate non proliferative', ...DR],
    partial: ['diabetes', 'diabetic', 'retinopathy'],
  },
  'dr-oct': {
    label: 'Diabetic macular oedema',
    accept: ['diabetic macular oedema', 'DME', 'DMO', 'macular oedema', 'CSME', 'clinically significant macular oedema'],
    partial: ['cystoid macular oedema', 'CMO', 'intraretinal fluid', 'oedema'],
  },
  'amd-fundus': {
    label: 'Intermediate age-related macular degeneration',
    accept: ['intermediate AMD', 'age related macular degeneration', 'AMD', 'macular degeneration', 'ARMD'],
    partial: ['drusen'],
  },
  'amd-oct': {
    label: 'AMD with drusenoid pigment epithelial detachment',
    accept: ['age related macular degeneration', 'AMD', 'macular degeneration', 'drusenoid PED', 'pigment epithelial detachment'],
    partial: ['PED', 'drusen', 'neovascular', 'CNV', 'MNV'],
  },
  'amd-faf': {
    label: 'Geographic atrophy (late non-exudative AMD)',
    accept: ['geographic atrophy', 'GA', 'late AMD', 'atrophic AMD', 'dry AMD', 'cRORA'],
    partial: ['AMD', 'macular degeneration', 'atrophy', 'stargardt'],
  },
  'cscr-fundus': {
    label: 'Central serous chorioretinopathy',
    accept: ['central serous chorioretinopathy', 'central serous', 'CSCR', 'CSR', 'CSC'],
    partial: ['serous detachment', 'subretinal fluid', 'pachychoroid'],
  },
  'cscr-oct': {
    label: 'Central serous chorioretinopathy (subretinal fluid)',
    accept: ['central serous chorioretinopathy', 'central serous', 'CSCR', 'CSR', 'CSC'],
    partial: ['serous detachment', 'subretinal fluid', 'pachychoroid', 'neurosensory detachment'],
  },
  'mh-fundus': {
    label: 'Full-thickness macular hole',
    accept: ['full thickness macular hole', 'macular hole', 'FTMH'],
    partial: ['lamellar hole', 'pseudohole', 'vitreomacular traction'],
  },
  'mh-oct': {
    label: 'Full-thickness macular hole',
    accept: ['full thickness macular hole', 'macular hole', 'FTMH'],
    partial: ['lamellar hole', 'pseudohole', 'cystoid macular oedema', 'vitreomacular traction'],
  },
  'vmt-oct': {
    label: 'Vitreomacular traction (impending macular hole)',
    accept: ['vitreomacular traction', 'VMT', 'impending macular hole', 'stage 1 macular hole'],
    partial: ['macular hole', 'vitreomacular adhesion', 'VMA', 'PVD'],
  },
  'rp-fundus': {
    label: 'Retinitis pigmentosa',
    accept: ['retinitis pigmentosa', 'RP', 'rod cone dystrophy'],
    partial: ['retinal dystrophy', 'dystrophy', 'choroideremia'],
  },
  'rp-faf-vf': {
    label: 'Retinitis pigmentosa',
    accept: ['retinitis pigmentosa', 'RP', 'rod cone dystrophy'],
    partial: ['retinal dystrophy', 'dystrophy'],
  },
  'stgd-fundus': {
    label: 'Stargardt disease (fundus flavimaculatus)',
    accept: ['stargardt', 'fundus flavimaculatus', 'STGD', 'ABCA4'],
    partial: ['macular dystrophy', 'dystrophy', 'pattern dystrophy'],
  },
  'stgd-faf': {
    label: 'Stargardt disease',
    accept: ['stargardt', 'fundus flavimaculatus', 'STGD', 'ABCA4'],
    partial: ['macular dystrophy', 'dystrophy', 'geographic atrophy'],
  },
  'best-imaging': {
    label: 'Best vitelliform macular dystrophy',
    accept: ['best vitelliform', 'best disease', 'bests disease', 'vitelliform macular dystrophy', 'BEST1', 'best macular dystrophy'],
    partial: ['vitelliform', 'macular dystrophy', 'pattern dystrophy'],
  },
  'naion-discs': {
    label: 'Non-arteritic anterior ischaemic optic neuropathy (disc at risk fellow eye)',
    accept: ['non arteritic anterior ischaemic optic neuropathy', 'NAION', 'non arteritic'],
    partial: ['ischaemic optic neuropathy', 'AION', 'AAION', 'optic disc oedema', 'disc swelling'],
  },
  'papill-discs': {
    label: 'Bilateral papilloedema (raised intracranial pressure / IIH)',
    accept: ['papilloedema', 'idiopathic intracranial hypertension', 'IIH', 'raised intracranial pressure'],
    partial: ['disc swelling', 'disc oedema', 'optic disc oedema', 'pseudopapilloedema'],
  },
  odd: {
    label: 'Optic disc drusen (pseudopapilloedema)',
    accept: ['optic disc drusen', 'disc drusen', 'ODD', 'pseudopapilloedema'],
    partial: ['drusen'],
  },
  'glc-disc': {
    label: 'Primary open-angle glaucoma',
    accept: ['primary open angle glaucoma', 'open angle glaucoma', 'POAG', 'glaucoma', 'glaucomatous optic neuropathy'],
    partial: ['normal tension glaucoma', 'NTG', 'cupping', 'ocular hypertension'],
  },
  'glc-oct-vf': {
    label: 'Primary open-angle glaucoma (structure–function correlation)',
    accept: ['primary open angle glaucoma', 'open angle glaucoma', 'POAG', 'glaucoma', 'glaucomatous optic neuropathy'],
    partial: ['normal tension glaucoma', 'NTG', 'RNFL thinning', 'ocular hypertension'],
  },
};

const contextFor = (c: Case, q: AnnotateQuestion) =>
  q.scanIds.some(id => c.scans.find(s => s.id === id)?.eye === 'Comparison')
    ? 'Image from a different patient — no history available.'
    : `${c.patient.age}${c.patient.sex} — ${c.patient.complaint}`;

export const DRILLS: Drill[] = CASES.flatMap(c =>
  c.annotate
    .filter(q => DX[q.id])
    .map(q => ({id: `${c.id}:${q.id}`, caseId: c.id, week: c.week, topic: c.topic, question: q, dx: DX[q.id], context: contextFor(c, q)})),
);

export const DRILL_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8].map(w => ({
  week: w,
  count: DRILLS.filter(d => d.week === w).length,
}));
