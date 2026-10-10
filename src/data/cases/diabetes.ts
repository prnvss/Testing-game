import type {Case} from '../types';
import {circ, early, kw, kw2, late, mcq, scan, SYN, target, text} from '../helpers';

// =============================================================================
// Week 3 — Tutorial 3: Diabetic retinopathy
// =============================================================================

export const diabetic: Case = {
  id: 'dr',
  week: 3,
  topic: 'Diabetic eye disease',
  diagnosis: 'Moderate non-proliferative diabetic retinopathy (LE) with refractive fluctuation from hyperglycaemia',
  difficulty: 2,
  source: 'Tutorial 3 — “My GP told me to get an eye test”',
  patient: {
    id: 'PX-3009',
    name: 'Rahul Sharma',
    age: 49,
    sex: 'M',
    background: 'Indian',
    complaint: '“My GP asked me to get my eyes tested — my eyes feel blurry.”',
    summary: 'Annual exam at GP’s request. Recently diagnosed T2DM; vision fluctuating, mainly LE.',
    history: [
      'Diagnosed with Type 2 diabetes about 1 month ago, started on medication.',
      'Blur mainly in the left eye, fluctuating day to day.',
      'Doesn’t know his HbA1c; recent finger-prick ~11 mmol/L. Next GP appointment in a few weeks.',
    ],
    medicalHistory: ['Type 2 diabetes mellitus (≈1 month)'],
    medications: ['Metformin'],
    ocularHistory: ['Nil'],
    familyHistory: ['Father: T2DM'],
  },
  exam: [
    {label: 'Unaided VA', value: 'R 6/9.5  L 6/18  OU 6/9.5'},
    {label: 'Refraction', value: 'R +2.00 → 6/9.5   L +1.00 → 6/7.5;  N4 with +1.50 add'},
    {label: 'IOP', value: 'R 12  L 12 mmHg (Perkins, 2 pm)'},
    {label: 'Amsler / Ishihara', value: 'No distortion OU / no errors'},
    {label: 'Pupils', value: 'No RAPD'},
    {label: 'Anterior LE', value: 'Fluorescein shown below'},
  ],
  scans: [
    scan('dr_cornea', 'Slit lamp', 'LE', 'Fluorescein, cobalt blue'),
    scan('dr_fundus_le', 'Colour fundus', 'LE'),
    scan('dr_lesions_fundus', 'Colour fundus', 'RE', 'Reference DR fundus for lesion identification'),
    scan('dr_severe_npdr', 'Colour fundus', 'LE', 'Comparison patient for grading'),
    scan('dme_oct', 'OCT', 'LE', 'Macular line scan'),
  ],
  ddx: text(
    'ddx',
    'Rahul reports fluctuating, blurry vision with newly diagnosed diabetes. What are your differential diagnoses for fluctuating vision?',
    [
      kw2('Refractive shift from hyperglycaemia (lens swelling)', 'refractive', 'hyperopic shift', 'myopic shift', 'lens', 'osmotic', 'blood sugar', 'glucose'),
      kw2('Diabetic retinopathy / maculopathy', 'diabetic retinopathy', 'diabetic macular', 'maculopathy', 'DR', 'DME'),
      kw('Dry eye / ocular surface disease (diabetic keratopathy)', 'dry eye', 'ocular surface', 'keratopathy', 'tear film', 'corneal'),
      kw('Cataract (snowflake / early)', 'cataract'),
      kw('Presbyopia / accommodative', 'presbyopia', 'accommodat'),
      kw('Vascular occlusion / other', 'vein occlusion', 'hypertensive'),
    ],
    'Glycaemic refractive fluctuation (osmotic lens swelling), diabetic retinopathy/macular oedema, dry eye/diabetic keratopathy (reduced corneal sensation), early/snowflake cataract, presbyopia/accommodative insufficiency, and other vascular disease (hypertensive retinopathy, RVO).',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'dr-cornea',
      prompt: 'LE anterior segment with fluorescein. Mark and label what you see.',
      scanIds: ['dr_cornea'],
      targets: [
        target('dr_cornea', 'spk', 'Inferior punctate epithelial staining', ['punctate', 'SPK', 'staining', 'punctate epithelial erosion', 'keratopathy', 'dry eye', 'epithelial staining', 'PEE'], circ(0.55, 0.76, 0.16), {points: 2}),
      ],
      model: 'Inferior punctate epithelial staining — diabetic keratopathy/dry eye (reduced corneal sensitivity from neuropathy, epithelial basement membrane abnormalities, reduced tear production).',
    },
    {
      type: 'annotate',
      id: 'dr-lesions',
      prompt: 'Reference fundus. Draw an arrow to and label: a microaneurysm, a dot/blot haemorrhage, a hard exudate and a cotton wool spot.',
      hint: 'Zoom in — microaneurysms are tiny red dots.',
      scanIds: ['dr_lesions_fundus'],
      targets: [
        target('dr_lesions_fundus', 'ma', 'Microaneurysm', SYN.ma, circ(0.315, 0.125, 0.045)),
        target('dr_lesions_fundus', 'haem', 'Dot/blot haemorrhage', SYN.dotBlot, circ(0.34, 0.44, 0.05)),
        target('dr_lesions_fundus', 'he', 'Hard exudate', SYN.hardEx, circ(0.455, 0.535, 0.045)),
        target('dr_lesions_fundus', 'cws', 'Cotton wool spot', SYN.cws, circ(0.665, 0.825, 0.055)),
        target('dr_lesions_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.745, 0.53, 0.06), {isBonus: true}),
      ],
      outOf: 4,
      model: 'Microaneurysm superotemporal (tiny red dot); dot/blot haemorrhage temporal to the macula; hard exudate (yellow, well-defined) superotemporal to the fovea; cotton wool spot (fluffy white, ill-defined) inferotemporally.',
    },
    {
      type: 'annotate',
      id: 'dr-le',
      prompt: 'Rahul’s LE fundus. Label the diabetic lesions present.',
      scanIds: ['dr_fundus_le'],
      targets: [
        target('dr_fundus_le', 'cws', 'Cotton wool spots', SYN.cws, circ(0.86, 0.84, 0.08), {points: 2}),
        target('dr_fundus_le', 'he', 'Hard exudates', SYN.hardEx, circ(0.66, 0.57, 0.07)),
        target('dr_fundus_le', 'haem', 'Dot/blot haemorrhages', [...SYN.dotBlot, ...SYN.ma], circ(0.75, 0.9, 0.08)),
        target('dr_fundus_le', 'disc', 'Optic disc', SYN.disc, circ(0.17, 0.55, 0.07), {isBonus: true}),
      ],
      outOf: 3,
      model: 'Cotton wool spots inferotemporally, scattered hard exudates temporal to the macula, dot/blot haemorrhages inferiorly — more than microaneurysms alone but not meeting the 4:2:1 rule → moderate NPDR.',
    },
    {
      type: 'annotate',
      id: 'dr-oct',
      prompt: 'Macular OCT. Identify the abnormality.',
      scanIds: ['dme_oct'],
      targets: [
        target('dme_oct', 'cysts', 'Intraretinal cystoid fluid (macular oedema)', ['intraretinal fluid', 'cyst', 'cystoid', 'macular oedema', 'DME', 'DMO', 'IRF', 'fluid', 'oedema'], circ(0.48, 0.43, 0.09), {points: 2}),
      ],
      model: 'Hyporeflective intraretinal cystoid spaces with retinal thickening at the macula — diabetic macular oedema (determine centre-involvement).',
    },
  ],
  finalDx: text(
    'final',
    'What is your diagnosis? Grade the retinopathy (ICDR) and comment on the cause of the fluctuating vision.',
    [
      kw2('Moderate NPDR', 'moderate non proliferative', 'moderate NPDR', 'moderate'),
      kw('Non-proliferative (no NV)', 'non proliferative', 'NPDR'),
      kw('Refractive fluctuation from hyperglycaemia', 'refractive', 'hyperglycaemia', 'blood sugar', 'lens', 'hyperopic'),
      kw('Diabetic keratopathy / dry eye', 'keratopathy', 'dry eye', 'punctate'),
    ],
    'LE moderate NPDR (more than microaneurysms only, less than severe — 4:2:1 rule not met; no NV). Fluctuating vision from glycaemic refractive shift (hyperopic change as lens hydration alters with blood glucose) plus diabetic keratopathy.',
    {outOf: 4},
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology of diabetic retinopathy and link each stage to its clinical sign.',
    [
      kw('Hyperglycaemia → polyol/AGEs/PKC → oxidative stress', 'polyol', 'sorbitol', 'AGE', 'advanced glycation', 'protein kinase', 'oxidative'),
      kw('Pericyte loss and basement membrane thickening', 'pericyte', 'basement membrane'),
      kw('Microaneurysms (weakened capillary wall)', 'microaneurysm'),
      kw('BRB breakdown → leakage → haemorrhage, hard exudates, oedema', 'blood retina barrier', 'leak', 'permeab', 'exudate', 'oedema'),
      kw('Capillary closure → ischaemia → CWS, IRMA, venous beading', 'capillary non perfusion', 'capillary closure', 'ischaemia', 'cotton wool', 'IRMA', 'venous beading'),
      kw('VEGF → neovascularisation (PDR)', 'VEGF', 'neovascular'),
      kw('Fibrovascular proliferation → vitreous haemorrhage / tractional RD', 'fibrovascular', 'vitreous haemorrhage', 'tractional', 'CTGF'),
    ],
    'Chronic hyperglycaemia (polyol pathway, AGEs, PKC activation, oxidative stress) → capillary basement-membrane thickening and pericyte loss → weakened walls (microaneurysms) and inner BRB breakdown (dot/blot haemorrhages, hard exudates, macular oedema). Endothelial damage and leucostasis close capillaries → ischaemia: CWS (axoplasmic stasis), IRMA (shunts), venous beading, more haemorrhages (severe NPDR). Hypoxia drives VEGF → NVD/NVE (PDR) leaking into the vitreous; as CTGF dominates, fibrovascular tissue contracts → vitreous haemorrhage and tractional RD.',
    {outOf: 6},
  ),
  pool: [
    early(
      text(
        'hx',
        'What specific history questions would you ask a patient with diabetes?',
        [
          kw('Type and duration of diabetes', 'duration', 'when diagnosed', 'type'),
          kw('HbA1c / BSL control', 'HbA1c', 'BSL', 'blood sugar', 'glucose'),
          kw('Treatment / medications (insulin, GLP-1)', 'medication', 'insulin', 'metformin', 'treatment'),
          kw('BP and cholesterol', 'blood pressure', 'hypertension', 'cholesterol', 'lipid'),
          kw('Kidney disease', 'kidney', 'renal', 'nephropathy'),
          kw('Neuropathy (numbness)', 'numbness', 'neuropathy', 'feet'),
          kw('Pregnancy / smoking', 'pregnan', 'smok'),
        ],
        'Type and duration of diabetes (duration is the biggest risk factor); HbA1c and self-tested BSL, how monitored; medications; co-morbid BP, cholesterol, kidney disease, neuropathy (numbness in hands/feet); smoking, pregnancy; date of last eye exam.',
        {outOf: 4},
      ),
    ),
    early(
      text(
        'ocular-comp',
        'List the ocular complications of diabetes, structure by structure.',
        [
          kw('Cornea: keratopathy / dry eye / reduced sensation', 'keratopathy', 'dry eye', 'corneal sensation', 'epithelial'),
          kw('Lens: cataract / refractive shift', 'cataract', 'refractive'),
          kw('Iris: rubeosis / NVG', 'rubeosis', 'neovascular glaucoma', 'NVI'),
          kw('Retina: DR / DME', 'retinopathy', 'macular oedema'),
          kw('Optic nerve: diabetic papillopathy / NAION', 'papillopathy', 'NAION'),
          kw('Cranial nerve palsies (CN III pupil-sparing, IV, VI)', 'cranial nerve', 'third nerve', 'CN III', 'palsy'),
        ],
        'Lids (xanthelasma, recurrent infections), cornea (keratopathy, reduced sensation, poor healing, dry eye), iris (rubeosis → NVG; poor dilation), lens (snowflake/early cataract, refractive shifts), vitreous (haemorrhage, asteroid hyalosis), retina (DR, DME, RVO), optic nerve (papillopathy, NAION), cranial nerves (pupil-sparing CN III, IV, VI palsies).',
        {outOf: 4},
      ),
    ),
    late(
      text(
        'irma-nv',
        'How do you differentiate IRMA from neovascularisation?',
        [
          kw('IRMA is intraretinal; NV grows on the retinal surface (breaches ILM)', 'intraretinal', 'surface', 'ILM', 'internal limiting membrane'),
          kw('IRMA does not cross major vessels; NV can cross', 'cross', 'major vessel'),
          kw('FFA: IRMA does not leak; NV leaks profusely', 'leak'),
          kw('NV: fine fan-like loops, often at disc', 'fan', 'loops', 'disc'),
        ],
        'IRMA: dilated shunt vessels within the retina adjacent to non-perfusion, don’t cross major vessels, don’t leak on FFA, stay beneath the ILM on OCT. NV: fine fan-shaped loops on the retinal surface/disc that can cross vessels, leak profusely on FFA and breach the ILM on OCT/OCT-A.',
        {outOf: 3},
      ),
    ),
    late(
      text(
        'severe-npdr',
        'What defines severe NPDR (4:2:1 rule)?',
        [
          kw('>20 intraretinal haemorrhages in each of 4 quadrants', '20', 'four quadrants', '4 quadrants', 'each quadrant'),
          kw('Definite venous beading in ≥2 quadrants', 'venous beading', '2 quadrants', 'two quadrants'),
          kw('Prominent IRMA in ≥1 quadrant', 'IRMA', '1 quadrant', 'one quadrant'),
          kw('No signs of PDR', 'no proliferative', 'no neovascular', 'no NV'),
        ],
        'Any of: >20 intraretinal haemorrhages in each of 4 quadrants; definite venous beading in ≥2 quadrants; prominent IRMA in ≥1 quadrant — with no signs of PDR.',
        {outOf: 3},
      ),
    ),
    late(
      text(
        'csme',
        'Define clinically significant macular oedema (ETDRS).',
        [
          kw('Thickening at or within 500 µm of the centre', '500', 'within 500'),
          kw('Hard exudates within 500 µm with adjacent thickening', 'hard exudate', 'adjacent thickening'),
          kw('Thickening ≥1 disc area within 1 DD of the centre', 'disc area', '1 disc diameter', 'one disc diameter', '1 DD'),
        ],
        'CSME: (1) retinal thickening at or within 500 µm of the foveal centre; (2) hard exudates at or within 500 µm of the centre with adjacent thickening; or (3) a zone of thickening ≥1 disc area, any part within 1 DD of the centre.',
      ),
    ),
    late(
      mcq(
        'review',
        'Recommended management for moderate NPDR without DMO is:',
        ['Urgent referral for PRP', 'Review 3–6 monthly with systemic control via GP', 'Annual review only', 'Immediate anti-VEGF'],
        1,
        'Mild/moderate NPDR without DMO: optometric monitoring (6–12 monthly for mild, 3–6 monthly for moderate) with GP-led glycaemic/BP/lipid control. Severe NPDR/PDR → prompt ophthalmology referral.',
      ),
    ),
    late(
      text(
        'grade-severe',
        'Grade the comparison patient’s fundus (haemorrhages in all four quadrants). What is the next step?',
        [
          kw2('Severe NPDR', 'severe non proliferative', 'severe NPDR', 'severe'),
          kw('4:2:1 rule — haemorrhages in 4 quadrants', '4 quadrants', 'four quadrants', '4 2 1'),
          kw('Prompt ophthalmology referral', 'refer', 'ophthalmolog', 'urgent'),
        ],
        'Severe NPDR (extensive intraretinal haemorrhages in all four quadrants — 4:2:1 rule), no NV visible → prompt/urgent ophthalmology referral (high 1-year risk of PDR).',
      ),
    ),
  ],
};
