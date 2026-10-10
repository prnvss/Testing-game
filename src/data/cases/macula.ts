import type {Case} from '../types';
import {box, circ, early, kw, kw2, late, mcq, scan, SYN, target, text} from '../helpers';

// =============================================================================
// Week 4 — Tutorial 4: AMD
// =============================================================================

export const amd: Case = {
  id: 'amd',
  week: 4,
  topic: 'Age-related macular degeneration',
  diagnosis: 'Intermediate AMD (large drusen + pigmentary change) with a drusenoid PED and high-risk features',
  difficulty: 2,
  source: 'Tutorial 4 — “The lines on my bingo card are moving”',
  patient: {
    id: 'PX-4022',
    name: 'Ada Flemming',
    age: 80,
    sex: 'F',
    background: 'Caucasian',
    complaint: '“The lines on my bingo card look wobbly and odd.”',
    summary: 'Blurry vision with wavy lines, both eyes but right worse; worsening over the past year, more in the last few days.',
    history: [
      'Lines on her bingo card are “wobbly” (not doubled).',
      'Gradual over a year, noticeably worse in the past few days.',
      'No black spot, headaches, sudden loss of vision, flashes or floaters.',
      'Not on medication for BP, cholesterol or diabetes.',
    ],
    medicalHistory: ['Restless leg syndrome', 'Depression'],
    medications: ['Fluoxetine (Prozac)'],
    ocularHistory: ['Reading glasses'],
    familyHistory: ['Sister has AMD'],
  },
  exam: [
    {label: 'Unaided VA', value: 'R 6/18  L 6/15  OU 6/15'},
    {label: 'BCVA', value: 'R +1.25/−0.75×55 6/15 PHNI;  L +1.50/−0.25×62 6/12 PHNI'},
    {label: 'Amsler', value: 'Distortion R > L'},
    {label: 'IOP', value: 'R 13  L 15 mmHg (Perkins)'},
    {label: 'Pupils / colour', value: 'No RAPD / no errors'},
  ],
  scans: [
    scan('amd_fundus_re', 'Colour fundus', 'RE'),
    scan('amd_fundus_le', 'Colour fundus', 'LE'),
    scan('amd_oct_ped', 'OCT', 'RE', 'Foveal line scan'),
    scan('amd_faf_ga', 'FAF', 'Comparison', 'Late-stage patient for comparison'),
  ],
  ddx: text(
    'ddx',
    'Ada describes wavy lines (metamorphopsia). What are your differential diagnoses for distorted vision?',
    [
      kw2('AMD (non-exudative / neovascular)', 'macular degeneration', 'AMD', 'neovascular', 'drusen'),
      kw('Epiretinal membrane', 'epiretinal membrane', 'ERM', 'macular pucker'),
      kw('Macular hole / VMT', 'macular hole', 'vitreomacular traction', 'VMT'),
      kw('CSCR', 'central serous', 'CSCR', 'CSR'),
      kw('Macular oedema (diabetic / CMO / RVO)', 'macular oedema', 'cystoid', 'vein occlusion'),
      kw('Cataract / refractive / corneal irregularity', 'cataract', 'refractive', 'astigmatism', 'corneal'),
      kw('Vitelliform / other dystrophy', 'vitelliform', 'dystrophy'),
    ],
    'Retinal causes of true metamorphopsia: AMD (drusen/PED/MNV), ERM, VMT/macular hole, CSCR, macular oedema (DME, CMO, RVO), vitelliform dystrophy. Pseudo-distortion: cataract, refractive error/astigmatism, corneal irregularity. Less common: RD involving the macula, migraine, CNS.',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'amd-fundus',
      prompt: 'Ada’s RE fundus. Label the drusen and any pigmentary change.',
      hint: 'Compare drusen size with the width of the central retinal vein at the disc (~125 µm).',
      scanIds: ['amd_fundus_re'],
      targets: [
        target('amd_fundus_re', 'drusen1', 'Large soft drusen', SYN.drusen, circ(0.3, 0.4, 0.14), {points: 2}),
        target('amd_fundus_re', 'drusen2', 'Large soft drusen (inferior)', SYN.drusen, circ(0.4, 0.76, 0.14), {isBonus: true}),
        target('amd_fundus_re', 'pigment', 'Pigmentary change (hyperpigmentation) at the macula', ['pigment', 'hyperpigmentation', 'pigmentary change', 'RPE change', 'pigment clumping', 'hypopigmentation', 'mottling'], circ(0.46, 0.58, 0.08), {points: 2}),
        target('amd_fundus_re', 'disc', 'Optic disc', SYN.disc, circ(0.83, 0.48, 0.07)),
      ],
      outOf: 5,
      model: 'Numerous large (>125 µm) soft, confluent drusen throughout the posterior pole with central hyperpigmentation/RPE mottling at the macula — intermediate AMD (Beckman).',
    },
    {
      type: 'annotate',
      id: 'amd-oct',
      prompt: 'RE OCT. Identify the RPE elevation and any fluid.',
      scanIds: ['amd_oct_ped'],
      targets: [
        target('amd_oct_ped', 'ped', 'Drusenoid pigment epithelial detachment', ['pigment epithelial detachment', 'PED', 'drusenoid', 'drusen', 'RPE elevation', 'RPE detachment', 'dome'], box(0.44, 0.4, 0.58, 0.58), {points: 2}),
        target('amd_oct_ped', 'irf', 'Intraretinal fluid / cysts', ['intraretinal fluid', 'IRF', 'cyst', 'fluid', 'cystoid', 'oedema'], circ(0.565, 0.385, 0.05)),
        target('amd_oct_ped', 'drusen', 'Smaller drusen (RPE undulations)', SYN.drusen, circ(0.38, 0.5, 0.06), {isBonus: true}),
      ],
      outOf: 3,
      model: 'Dome-shaped elevation of the RPE (drusenoid PED from confluent drusen) with overlying hyporeflective intraretinal cysts — fluid raises concern for conversion to MNV (needs OCT-A/FFA).',
    },
    {
      type: 'annotate',
      id: 'amd-faf',
      prompt: 'FAF from a late-stage patient. Label the lesion.',
      scanIds: ['amd_faf_ga'],
      targets: [
        target('amd_faf_ga', 'ga', 'Geographic atrophy (hypoautofluorescence)', ['geographic atrophy', 'GA', 'atrophy', 'hypoautofluorescence', 'hypoautofluorescent', 'RPE loss', 'cRORA'], box(0.28, 0.15, 0.82, 0.85), {points: 2}),
      ],
      model: 'Multifocal, well-demarcated dark (hypoautofluorescent) patches = geographic atrophy (loss of RPE lipofuscin), with a hyperautofluorescent junctional zone predicting expansion.',
    },
  ],
  finalDx: text(
    'final',
    'Give Ada’s diagnosis and Beckman grade (per patient), and say whether this is exudative.',
    [
      kw2('Intermediate AMD', 'intermediate'),
      kw('Large drusen >125 µm', 'large drusen', '125'),
      kw('Pigmentary abnormalities', 'pigment'),
      kw('Drusenoid PED', 'PED', 'pigment epithelial detachment', 'drusenoid'),
      kw('Fluid on OCT → assess for MNV', 'MNV', 'CNV', 'neovascular', 'OCT A', 'refer'),
    ],
    'Bilateral intermediate AMD (Beckman — graded per patient on the worse eye): large drusen >125 µm with AMD pigmentary abnormalities; RE drusenoid PED with intraretinal fluid and recent worsening of distortion → must exclude conversion to neovascular AMD (OCT-A/FFA via ophthalmology).',
    {outOf: 4},
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology of non-exudative AMD and its progression to exudative AMD.',
    [
      kw('Age/oxidative stress → RPE dysfunction', 'oxidative', 'RPE dysfunction', 'ageing'),
      kw('Lipofuscin / waste accumulation', 'lipofuscin', 'waste', 'debris', 'A2E'),
      kw('Bruch’s membrane thickening / lipid deposition', 'bruch', 'thickening', 'lipid'),
      kw('Drusen = basal laminar/linear deposits between RPE and Bruch’s', 'basal linear', 'basal laminar', 'between rpe and bruch', 'deposit'),
      kw('Complement / inflammation (CFH)', 'complement', 'CFH', 'inflammation'),
      kw('RPE atrophy → photoreceptor & choriocapillaris loss (GA)', 'atrophy', 'choriocapillaris', 'photoreceptor death'),
      kw('Hypoxia → VEGF → MNV through Bruch’s → fluid/haemorrhage', 'VEGF', 'neovascular', 'MNV', 'CNV', 'leak'),
      kw('Disciform scar', 'disciform', 'scar', 'fibrosis'),
    ],
    'Ageing, oxidative stress (smoking, light) and genetic complement dysregulation (CFH, ARMS2) impair RPE clearance of photoreceptor outer segments → lipofuscin accumulation and RPE dysfunction. Bruch’s membrane thickens with lipid, impairing exchange; basal laminar/linear deposits and drusen form between RPE and Bruch’s. Coalescent drusen lift the RPE (drusenoid PED). RPE death → hypo-/hyperpigmentation and atrophy of photoreceptors and choriocapillaris (geographic atrophy). Ischaemia and inflammation drive VEGF → MNV through breaks in Bruch’s → serous/haemorrhagic PED, subretinal fluid/haemorrhage → fibrovascular disciform scar.',
    {outOf: 6},
  ),
  pool: [
    early(
      text(
        'tests',
        'What tests would you like to do today and why?',
        [
          kw('VA and refraction (compare with previous)', 'visual acuity', 'refraction', 'VA'),
          kw('Amsler grid / central 10-2', 'amsler', '10 2'),
          kw('Dilated fundus exam', 'dilated', 'fundus'),
          kw('OCT', 'OCT'),
          kw('OCT-A / FAF / fundus photography', 'OCT A', 'angiography', 'FAF', 'autofluorescence', 'photograph'),
          kw('Pupils (RAPD)', 'pupil', 'RAPD'),
        ],
        'VA and refraction (vs previous records), pupils, Amsler grid / central 10-2 field, slit lamp, dilated fundus exam (drusen size, pigment, GA, MNV signs), fundus photography and FAF, OCT and OCT-A (fluid, PED type, MNV, biomarkers).',
        {outOf: 4},
      ),
    ),
    early(
      text(
        'exudative-vs-non',
        'How do you differentiate exudative from non-exudative AMD on symptoms and signs?',
        [
          kw('Non-exudative: gradual over months–years', 'gradual', 'slow', 'months', 'years'),
          kw('Exudative: hours–days, sudden distortion/scotoma', 'sudden', 'days', 'rapid', 'hours'),
          kw('Exudative signs: fluid, haemorrhage, PED, grey-green lesion', 'haemorrhage', 'subretinal fluid', 'fluid', 'grey green', 'exudate'),
          kw('Non-exudative signs: drusen, pigment change, GA', 'drusen', 'pigment', 'geographic atrophy'),
        ],
        'Non-exudative: gradual central blur over months/years, mild distortion; drusen, pigmentary change, GA. Exudative: painless distortion/central scotoma over hours to days; subretinal/intraretinal fluid, haemorrhage, exudates, serous/haemorrhagic PED, grey-green MNV lesion; later disciform scar.',
        {outOf: 3},
      ),
    ),
    late(
      text(
        'mgmt',
        'Management for intermediate AMD? (include supplements)',
        [
          kw('AREDS2 supplement', 'AREDS2', 'AREDS'),
          kw('Smoking cessation', 'smok'),
          kw('Diet: leafy greens, fish', 'diet', 'leafy', 'fish', 'omega'),
          kw('Home Amsler grid monitoring', 'amsler'),
          kw('6-monthly review', '6 month', 'six month'),
          kw('Urgent referral if new exudative symptoms', 'urgent referral', 'refer', 'anti VEGF'),
        ],
        'Intermediate AMD: AREDS2 (vit C 500 mg, vit E 400 IU, zinc 80 mg, copper 2 mg, lutein 10 mg, zeaxanthin 2 mg), stop smoking, diet rich in leafy greens and fish, UV protection, home Amsler, 6-monthly review with multimodal imaging for high-risk biomarkers (RPD, nGA, HRF). New distortion/fluid → urgent ophthalmology referral for anti-VEGF.',
        {outOf: 4},
      ),
    ),
    late(
      text(
        'biomarkers',
        'What prognostic biomarkers predict progression to late AMD?',
        [
          kw('Reticular pseudodrusen', 'reticular pseudodrusen', 'RPD', 'subretinal drusenoid'),
          kw('Hyperreflective foci', 'hyperreflective foci', 'HRF'),
          kw('Nascent GA / iRORA', 'nascent', 'iRORA', 'nGA'),
          kw('Large drusen volume / drusenoid PED', 'drusen volume', 'PED'),
        ],
        'Reticular pseudodrusen (subretinal drusenoid deposits), hyperreflective foci, nascent GA (iRORA — subsidence of OPL/INL, hyporeflective wedge), large drusen volume/drusenoid PED, and fellow-eye late AMD.',
        {outOf: 3},
      ),
    ),
    late(
      mcq(
        'beckman',
        'Under the Beckman classification, a patient with one large druse (>125 µm) and no pigment change has:',
        ['Normal ageing', 'Early AMD', 'Intermediate AMD', 'Late AMD'],
        2,
        'Intermediate AMD = large drusen >125 µm and/or any AMD pigmentary abnormalities. Early AMD = medium drusen 63–125 µm only.',
      ),
    ),
  ],
};

// =============================================================================
// Week 5 — CSCR
// =============================================================================

export const cscr: Case = {
  id: 'cscr',
  week: 5,
  topic: 'Maculopathies',
  diagnosis: 'Acute central serous chorioretinopathy (pachychoroid spectrum)',
  difficulty: 1,
  source: 'Lecture 5 — maculopathies & pachychoroid disease',
  patient: {
    id: 'PX-5014',
    name: 'Daniel Okafor',
    age: 38,
    sex: 'M',
    background: 'Nigerian-Australian',
    occupation: 'Lawyer (trial preparation)',
    complaint: '“There’s a grey smudge in the middle of my right eye and things look smaller.”',
    summary: 'One week of central blur, a grey blob and micropsia RE. Very stressed at work.',
    history: ['Central dim/grey patch RE for 1 week; straight lines bent; objects look smaller.', 'Colours look washed out RE.', 'Painless, no flashes or floaters.', 'Very high work stress, sleeping 4–5 h per night.'],
    medicalHistory: ['Mild asthma'],
    medications: ['Fluticasone/salmeterol inhaler (recently increased)', 'Occasional pseudoephedrine'],
    ocularHistory: ['Nil'],
    familyHistory: ['Nil'],
  },
  exam: [
    {label: 'VA', value: 'R 6/12 (pinhole 6/9.5 with +0.75)  L 6/5'},
    {label: 'Refraction', value: 'R new hyperopic shift +0.75 DS'},
    {label: 'Amsler', value: 'R central relative scotoma with distortion'},
    {label: 'Pupils', value: 'No RAPD'},
    {label: 'Photostress', value: 'R recovery 90 s (L 25 s)'},
  ],
  scans: [scan('cscr_fundus', 'Colour fundus', 'RE'), scan('cscr_oct', 'OCT', 'RE')],
  ddx: text(
    'ddx',
    'List your differential diagnoses for a young man with central distortion and micropsia.',
    [
      kw2('Central serous chorioretinopathy', 'central serous', 'CSCR', 'CSR'),
      kw('Neovascular AMD / MNV (e.g. myopic, pachychoroid)', 'neovascular', 'MNV', 'CNV', 'choroidal neovascular'),
      kw('Optic disc pit maculopathy', 'disc pit', 'optic pit'),
      kw('Vitelliform / Best disease', 'vitelliform', 'best'),
      kw('Macular oedema / uveitis (VKH)', 'macular oedema', 'uveitis', 'VKH', 'harada'),
      kw('Optic neuritis', 'optic neuritis'),
    ],
    'CSCR (male, stress, corticosteroids, hyperopic shift, micropsia), MNV (pachychoroid neovasculopathy/myopic), optic disc pit maculopathy, vitelliform dystrophy, inflammatory serous detachment (VKH, posterior scleritis), macular oedema, optic neuritis (dyschromatopsia, RAPD — absent here).',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'cscr-fundus',
      prompt: 'RE fundus. Outline the macular lesion and label the disc.',
      scanIds: ['cscr_fundus'],
      targets: [
        target('cscr_fundus', 'srd', 'Serous neurosensory detachment (round blister)', ['serous detachment', 'neurosensory detachment', 'subretinal fluid', 'blister', 'serous retinal detachment', 'elevation', 'bleb', 'fluid', 'CSCR'], circ(0.53, 0.48, 0.12), {points: 2}),
        target('cscr_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.27, 0.37, 0.07)),
      ],
      model: 'Round, well-demarcated transparent elevation of the neurosensory retina at the macula (serous detachment) with loss of the foveal reflex.',
    },
    {
      type: 'annotate',
      id: 'cscr-oct',
      prompt: 'RE OCT. Label the fluid compartment.',
      scanIds: ['cscr_oct'],
      targets: [
        target('cscr_oct', 'srf', 'Subretinal fluid (neurosensory detachment)', ['subretinal fluid', 'SRF', 'neurosensory detachment', 'serous detachment', 'fluid'], box(0.24, 0.42, 0.6, 0.64), {points: 2}),
      ],
      model: 'Dome of hyporeflective subretinal fluid separating the neurosensory retina from the RPE (outer BRB failure); typically a thick choroid (pachychoroid) on EDI-OCT ± small PED at the leak point.',
    },
  ],
  finalDx: text(
    'final',
    'Final diagnosis?',
    [
      kw2('Central serous chorioretinopathy', 'central serous', 'CSCR', 'CSC', 'CSR'),
      kw('Acute', 'acute'),
      kw('Steroid / stress related', 'steroid', 'stress', 'corticosteroid'),
    ],
    'Right acute central serous chorioretinopathy (pachychoroid spectrum), associated with stress and inhaled corticosteroid use.',
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology of CSCR.',
    [
      kw('Thick, hyperpermeable choroid (pachychoroid, dilated Haller vessels)', 'pachychoroid', 'hyperpermeab', 'thick choroid', 'haller', 'choroidal congestion'),
      kw('Corticosteroids / cortisol / adrenaline (stress)', 'cortisol', 'steroid', 'adrenaline', 'catecholamine', 'stress', 'mineralocorticoid'),
      kw('Increased hydrostatic pressure under RPE', 'hydrostatic', 'pressure'),
      kw('RPE pump/barrier failure (outer BRB) → focal leak', 'RPE pump', 'outer blood retina', 'barrier', 'RPE dysfunction', 'leak'),
      kw('Fluid accumulates between neurosensory retina and RPE', 'subretinal', 'neurosensory', 'between'),
      kw('Photoreceptors displaced → micropsia, hyperopic shift', 'micropsia', 'hyperopic', 'displaced'),
    ],
    'Glucocorticoids/stress (cortisol, catecholamines, mineralocorticoid receptor activation) cause choroidal vascular congestion and hyperpermeability (pachychoroid with dilated Haller vessels and thinned choriocapillaris). Raised choroidal hydrostatic pressure overwhelms the RPE pump and disrupts the outer BRB → focal RPE leak (± PED) and accumulation of fluid in the subretinal space, lifting the neurosensory retina. Elevated, spread-apart photoreceptors produce micropsia, a hyperopic shift, metamorphopsia and slow photostress recovery.',
    {outOf: 5},
  ),
  pool: [
    early(
      mcq(
        'micropsia',
        'Why does Daniel notice objects looking smaller?',
        ['Retinal compression packs photoreceptors together', 'Fluid separates and spreads photoreceptors so fewer are stimulated', 'Optic nerve compression', 'Lens swelling'],
        1,
        'Elevation/stretching spreads photoreceptors apart; the image falls on fewer receptors, so the brain interprets it as smaller (micropsia).',
      ),
    ),
    late(
      text(
        'mgmt',
        'Management and prognosis?',
        [
          kw('Most resolve spontaneously in 3–4 months', 'spontaneous', 'resolve', '3 months', 'three months', '4 months'),
          kw('Review steroid use with GP (all routes)', 'steroid', 'inhaler', 'GP'),
          kw('Reduce stress / sleep', 'stress', 'sleep'),
          kw('Refer if chronic (>3–4 months) — PDT / micropulse laser', 'photodynamic', 'PDT', 'laser', 'micropulse', 'chronic'),
          kw('Monitor with OCT', 'OCT', 'monitor'),
        ],
        'Acute CSCR usually resolves spontaneously within 3–4 months with good VA. Identify and reduce triggers: liaise with GP about corticosteroids (inhaled/nasal/topical count), stress, sleep, sympathomimetics. Monitor with OCT; refer if persistent >3–4 months, recurrent, or vision affected (half-dose PDT, micropulse laser; eplerenone evidence limited). Watch for MNV.',
        {outOf: 3},
      ),
    ),
  ],
};

// =============================================================================
// Week 5 — Macular hole (+ VMT / ERM)
// =============================================================================

export const macularHole: Case = {
  id: 'mh',
  week: 5,
  topic: 'Vitreomacular interface',
  diagnosis: 'Full-thickness macular hole (idiopathic, stage 3–4)',
  difficulty: 2,
  source: 'Lecture 5 — vitreomacular interface disorders',
  patient: {
    id: 'PX-5027',
    name: 'Helen Novak',
    age: 67,
    sex: 'F',
    background: 'Czech-Australian',
    complaint: '“There’s a hole in the middle of what I’m reading with my left eye.”',
    summary: '6 weeks of distortion LE, now a central “missing bit” when reading.',
    history: ['Initially straight lines bent inwards (pinched) LE; now a small central gap.', 'Noticed when covering the RE.', 'Painless, no flashes or floaters.'],
    medicalHistory: ['Osteoporosis'],
    medications: ['Alendronate', 'Calcium + vitamin D'],
    ocularHistory: ['Emmetropic presbyope'],
    familyHistory: ['Nil'],
  },
  exam: [
    {label: 'VA', value: 'R 6/6  L 6/36 PHNI'},
    {label: 'Watzke–Allen', value: 'L positive — patient sees a break in the slit beam'},
    {label: 'Amsler', value: 'L central scotoma with surrounding distortion'},
    {label: 'Pupils', value: 'No RAPD'},
  ],
  scans: [
    scan('mh_fundus', 'Colour fundus', 'LE'),
    scan('mh_oct', 'OCT', 'LE', 'Colour-mapped line scan'),
    scan('vmt_oct', 'OCT', 'RE', 'Fellow eye line scan'),
    scan('erm_oct', 'OCT', 'Comparison', 'Different patient — for comparison'),
  ],
  ddx: text(
    'ddx',
    'Central distortion progressing to a central gap in a 67-year-old woman. Differentials?',
    [
      kw2('Macular hole', 'macular hole', 'FTMH'),
      kw('Lamellar hole / pseudohole', 'lamellar', 'pseudohole'),
      kw('Epiretinal membrane', 'epiretinal', 'ERM'),
      kw('Vitreomacular traction', 'vitreomacular traction', 'VMT'),
      kw('AMD / MNV', 'macular degeneration', 'AMD', 'MNV', 'CNV'),
      kw('CMO / CSCR', 'cystoid macular', 'CMO', 'central serous'),
    ],
    'Full-thickness macular hole, lamellar hole, ERM with pseudohole, VMT, AMD (drusen/MNV), cystoid macular oedema, CSCR.',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'mh-fundus',
      prompt: 'LE fundus. Mark the lesion and the optic disc.',
      scanIds: ['mh_fundus'],
      targets: [
        target('mh_fundus', 'hole', 'Full-thickness macular hole', ['macular hole', 'hole', 'FTMH', 'full thickness'], circ(0.51, 0.52, 0.07), {points: 2}),
        target('mh_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.88, 0.46, 0.07)),
      ],
      model: 'Round, punched-out red lesion at the fovea (~⅓ DD) with a grey cuff of subretinal fluid — full-thickness macular hole.',
    },
    {
      type: 'annotate',
      id: 'mh-oct',
      prompt: 'LE OCT. Draw a line across the hole’s minimum diameter and label it; label the cystic changes at the edges.',
      scanIds: ['mh_oct'],
      targets: [
        target('mh_oct', 'hole', 'Full-thickness defect (minimum linear diameter)', ['macular hole', 'hole', 'full thickness', 'FTMH', 'diameter', 'defect', 'minimum linear diameter'], box(0.43, 0.15, 0.57, 0.62), {points: 2}),
        target('mh_oct', 'cyst1', 'Intraretinal cysts at the hole edge', ['cyst', 'cystic', 'intraretinal fluid', 'cystoid', 'oedema', 'IRF'], circ(0.36, 0.38, 0.08)),
        target('mh_oct', 'cyst2', 'Intraretinal cysts (other edge)', ['cyst', 'cystic', 'intraretinal fluid', 'cystoid', 'oedema', 'IRF'], circ(0.62, 0.36, 0.08), {isBonus: true}),
      ],
      outOf: 3,
      model: 'Full-thickness interruption of all neurosensory layers from ILM to RPE at the fovea with elevated, cystic hole edges; minimum linear diameter measured at the narrowest point (small ≤250 µm, medium 250–400 µm, large >400 µm).',
    },
    {
      type: 'annotate',
      id: 'vmt-oct',
      prompt: 'Fellow RE OCT. What is the vitreomacular relationship? Label it.',
      scanIds: ['vmt_oct'],
      targets: [
        target('vmt_oct', 'vmt', 'Vitreomacular traction (hyaloid attached at fovea)', ['vitreomacular traction', 'VMT', 'traction', 'posterior hyaloid', 'vitreous attachment', 'vitreomacular adhesion', 'hyaloid'], circ(0.5, 0.44, 0.08), {points: 2}),
        target('vmt_oct', 'cyst', 'Foveal pseudocyst / intraretinal cyst', ['cyst', 'pseudocyst', 'cystic', 'intraretinal fluid', 'impending hole'], circ(0.5, 0.6, 0.1)),
      ],
      model: 'Perifoveal PVD with the posterior hyaloid still attached at the fovea, distorting the foveal contour with an intraretinal pseudocyst — VMT (impending macular hole, stage 1).',
    },
  ],
  finalDx: text(
    'final',
    'Final diagnosis (include stage/size) and what is happening in the fellow eye?',
    [
      kw2('Full-thickness macular hole', 'full thickness macular hole', 'macular hole', 'FTMH'),
      kw('Stage 3/4 or size classification', 'stage 3', 'stage 4', 'stage', 'large', 'medium', 'small'),
      kw('Fellow eye: VMT / impending hole', 'vitreomacular traction', 'VMT', 'impending'),
    ],
    'Left idiopathic full-thickness macular hole (Gass stage 3–4 / IVTS FTMH with cystic edges); right eye VMT with a foveal pseudocyst (impending hole) — fellow-eye risk.',
  ),
  pathophysiology: text(
    'patho',
    'Explain how an idiopathic macular hole forms.',
    [
      kw('Age-related vitreous liquefaction and perifoveal PVD', 'syneresis', 'liquefaction', 'perifoveal', 'PVD', 'vitreous detachment'),
      kw('Persistent vitreofoveal adhesion → anteroposterior traction', 'anteroposterior', 'traction', 'adhesion'),
      kw('Tangential traction', 'tangential'),
      kw('Foveal pseudocyst / dehiscence of inner fovea', 'pseudocyst', 'dehiscence', 'cyst'),
      kw('Full-thickness break of all layers; photoreceptors retract → scotoma', 'full thickness', 'photoreceptor', 'scotoma', 'all layers'),
      kw('Operculum / Weiss ring after release', 'operculum', 'weiss'),
    ],
    'With age the vitreous liquefies and a perifoveal PVD develops, but the hyaloid stays adherent at the fovea (VMA → VMT). Dynamic anteroposterior (and tangential) traction lifts the foveola, creating an intraretinal pseudocyst (stage 1). The inner wall dehisces and the defect extends through all neurosensory layers to the RPE (stage 2–3); photoreceptors retract centrifugally with cuff of subretinal fluid → absolute central scotoma. Release of the hyaloid may leave an operculum; complete PVD with Weiss ring = stage 4.',
    {outOf: 5},
  ),
  pool: [
    early(
      text(
        'tests',
        'Which chairside test helps differentiate a full-thickness hole from a pseudohole, and what is the key imaging?',
        [
          kw2('Watzke–Allen test', 'watzke', 'allen', 'slit beam'),
          kw('Amsler grid', 'amsler'),
          kw('OCT (gold standard)', 'OCT'),
        ],
        'Watzke–Allen: a thin slit beam over the hole is seen as broken/narrowed (positive in FTMH, intact in pseudohole). Amsler grid and laser aiming-beam tests support; OCT is definitive (layers involved, size, VMT).',
      ),
    ),
    late(
      text(
        'mgmt',
        'Management?',
        [
          kw('Refer to vitreoretinal surgeon (non-urgent but timely)', 'refer', 'vitreoretinal', 'ophthalmolog'),
          kw('Pars plana vitrectomy + ILM peel + gas tamponade', 'vitrectomy', 'ILM peel', 'gas', 'tamponade'),
          kw('Face-down / posturing', 'posturing', 'face down', 'positioning'),
          kw('Better prognosis when small and recent', 'small', 'recent', 'duration', 'prognosis'),
        ],
        'Timely (non-emergency) referral to a vitreoretinal surgeon: pars plana vitrectomy with ILM peel and gas tamponade ± face-down posturing (closure >90% for small/medium recent holes). Monitor fellow eye with VMT (may release spontaneously; ocriplasmin/vitrectomy if progressive).',
        {outOf: 3},
      ),
    ),
    late(
      mcq(
        'erm',
        'On the comparison OCT, the irregular hyperreflective band on the retinal surface with loss of the foveal pit is:',
        ['Posterior hyaloid (normal)', 'Epiretinal membrane', 'Retinal nerve fibre layer', 'Lamellar hole'],
        1,
        'ERM: hyperreflective preretinal membrane with retinal wrinkling/thickening and loss of foveal contour; it contracts tangentially and can cause macropsia.',
      ),
    ),
  ],
};
