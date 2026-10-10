import type {Case} from '../types';
import {box, circ, early, kw, kw2, late, mcq, scan, SYN, target, text} from '../helpers';

// =============================================================================
// Week 7 — Tutorial 7: NAION
// =============================================================================

export const naion: Case = {
  id: 'naion',
  week: 7,
  topic: 'Optic neuropathies',
  diagnosis: 'Right non-arteritic anterior ischaemic optic neuropathy (NAION) — “disc at risk” fellow eye',
  difficulty: 2,
  source: 'Tutorial 7 — “Something is wrong with my eye”',
  patient: {
    id: 'PX-7006',
    name: 'Victor Lawrence',
    age: 77,
    sex: 'M',
    background: 'Caucasian',
    complaint: '“Something is wrong with my eye — it’s just blurry.”',
    summary: '5-day history of worsening vision RE; woke up with it. Longstanding headaches.',
    history: [
      'Woke up with it yesterday morning; glasses make no difference.',
      '“It’s just blurry” — no patch, veil or blackout. No new flashes or floaters.',
      '“I always get headaches.” No scalp tenderness, no jaw pain when eating, no falls.',
      'Feels well generally.',
    ],
    medicalHistory: ['Type 2 diabetes (HbA1c 6.9%)', 'Hypertension', 'Hypercholesterolaemia'],
    medications: ['Metformin', 'Irbesartan (Avapro)', 'Rosuvastatin (Crestor)', 'Semaglutide (Ozempic) — started 8 months ago'],
    ocularHistory: ['Multifocals; PVD a few years ago'],
    familyHistory: ['Nil relevant'],
  },
  exam: [
    {label: 'VA (multifocals)', value: 'R 6/30 PHNI  L 6/6−   (6 months ago R 6/6)'},
    {label: 'Pupils', value: 'PERRL, RE RAPD'},
    {label: 'Red desaturation', value: 'Red object “looks orange” RE'},
    {label: 'Slit lamp', value: 'R NS2.5 NC2  L NS2.5 NC2.5'},
    {label: 'IOP', value: 'R 14  L 13 mmHg (iCare, 10:30 am)'},
  ],
  scans: [scan('naion_disc_re', 'Optic disc', 'RE'), scan('naion_disc_le', 'Optic disc', 'LE')],
  ddx: text(
    'ddx',
    'From the history alone, what are your top differential diagnoses?',
    [
      kw2('NAION', 'non arteritic', 'NAION', 'ischaemic optic neuropathy', 'AION'),
      kw2('Arteritic AION / giant cell arteritis', 'arteritic', 'giant cell', 'GCA', 'AAION'),
      kw('Retinal vascular occlusion (CRVO / BRAO)', 'vein occlusion', 'artery occlusion', 'CRVO', 'CRAO', 'BRAO'),
      kw('Optic neuritis', 'optic neuritis'),
      kw('Compressive optic neuropathy / papilloedema', 'compressive', 'papilloedema', 'tumour', 'mass'),
      kw('Diabetic macular oedema / vitreous haemorrhage', 'macular oedema', 'vitreous haemorrhage', 'diabetic'),
    ],
    'NAION (vascular risk factors, on waking, painless, GLP-1 agonist), AAION/GCA (age 77, headaches — must exclude), retinal vascular occlusion (CRVO/BRAO), diabetic maculopathy or vitreous haemorrhage, optic neuritis (less likely at 77), compressive/infiltrative optic neuropathy.',
    {outOf: 5},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'naion-discs',
      prompt: 'Compare the two optic discs. Label the abnormal disc findings RE and the key feature of the LE disc.',
      scanIds: ['naion_disc_re', 'naion_disc_le'],
      targets: [
        target('naion_disc_re', 'swelling', 'Hyperaemic diffuse disc oedema with blurred margins', [...SYN.discSwelling, 'hyperaemic', 'hyperemia', 'blurred margins'], circ(0.4, 0.48, 0.17), {points: 2}),
        target('naion_disc_le', 'crowded', 'Small, crowded disc with no cup (“disc at risk”)', ['disc at risk', 'crowded disc', 'small disc', 'no cup', 'small cup', 'small cup to disc', 'crowded', 'cup'], circ(0.55, 0.52, 0.17), {points: 2}),
      ],
      model: 'RE: diffusely swollen, hyperaemic disc with blurred margins and peripapillary NFL oedema (± flame haemorrhages). LE: small, crowded disc with a minimal/absent cup — the “disc at risk”.',
    },
  ],
  finalDx: text(
    'final',
    'Final diagnosis? Which single history feature is most reassuring against GCA?',
    [
      kw2('Non-arteritic AION (right)', 'non arteritic', 'NAION'),
      kw('Disc at risk in fellow eye', 'disc at risk', 'crowded'),
      kw('Absence of jaw claudication / scalp tenderness', 'jaw', 'scalp', 'temporal'),
      kw('GLP-1 agonist (semaglutide) association', 'semaglutide', 'ozempic', 'GLP 1'),
    ],
    'Right NAION with a “disc at risk” in the LE. Absence of jaw claudication and scalp/temporal tenderness is the most reassuring history feature against GCA (but ESR/CRP still needed — ~20% of AAION is occult). Semaglutide is a possible contributing factor (regulators now list NAION as a very rare adverse effect).',
    {outOf: 3},
  ),
  pathophysiology: text(
    'patho',
    'Compare the pathophysiology of NAION and AAION.',
    [
      kw('NAION: hypoperfusion of short posterior ciliary arteries (no true occlusion)', 'hypoperfusion', 'short posterior ciliary', 'SPCA'),
      kw('Small crowded disc → compartment syndrome', 'compartment', 'crowded', 'disc at risk'),
      kw('Nocturnal hypotension / vascular risk factors', 'nocturnal', 'hypotension', 'hypertension', 'diabetes'),
      kw('Axoplasmic stasis → disc oedema → further ischaemia', 'axoplasmic', 'oedema', 'vicious'),
      kw('AAION: GCA vasculitis occludes SPCA (granulomatous inflammation)', 'vasculitis', 'granulomatous', 'giant cell', 'occlusion'),
      kw('AAION: chalky-white pallid oedema, severe loss', 'chalky', 'pallid', 'pale'),
    ],
    'NAION: vascular risk factors and nocturnal hypotension cause transient hypoperfusion of the short posterior ciliary arteries (no true occlusion) supplying the prelaminar ONH; in a small crowded disc, ischaemic axonal swelling and axoplasmic stasis compress capillaries within a tight scleral canal → compartment syndrome that worsens ischaemia. Hyperaemic, often sectoral swelling; inferior altitudinal defect typical. AAION: GCA causes granulomatous vasculitis that occludes the SPCAs → severe infarction with chalky-white (pallid) swelling, profound VA loss, high fellow-eye risk.',
    {outOf: 5},
  ),
  pool: [
    early(
      mcq(
        'gca-q',
        'Which single feature of Victor’s history is most reassuring against GCA?',
        ['His age (77)', 'Absence of jaw claudication and scalp/temporal tenderness', 'His longstanding headaches', 'Current semaglutide use'],
        1,
        'Jaw claudication and scalp tenderness are the most specific GCA symptoms; their absence lowers (but does not exclude) probability.',
      ),
    ),
    early(
      mcq(
        'not-on',
        'Which is NOT a relevant test of optic nerve function?',
        ['Visual acuity', 'Monocular Ishihara', 'Gonioscopy', 'Pupils'],
        2,
        'Gonioscopy examines the anterior chamber angle; VA, colour vision, red desaturation, pupils and visual fields assess optic nerve function.',
      ),
    ),
    late(
      mcq(
        'vf',
        'Which visual field defect is most characteristic of NAION?',
        ['Bitemporal hemianopia', 'Inferior altitudinal defect', 'Ring scotoma', 'Enlarged blind spot only'],
        1,
        'Inferior altitudinal (respecting the horizontal meridian) is most common, reflecting superior disc ischaemia.',
      ),
    ),
    late(
      text(
        'mgmt',
        'Management plan for Victor?',
        [
          kw2('Same-day ESR, CRP, platelets to exclude GCA', 'ESR', 'CRP', 'platelet', 'GCA'),
          kw('Refer ophthalmology / neuro-ophthalmology', 'refer', 'ophthalmolog'),
          kw('Optimise vascular risk factors via GP (BP, diabetes, lipids, sleep apnoea)', 'blood pressure', 'diabetes', 'lipid', 'sleep apnoea', 'GP'),
          kw('Discuss semaglutide with prescriber', 'semaglutide', 'ozempic', 'GLP'),
          kw('Avoid nocturnal hypotension (BP meds timing)', 'nocturnal', 'night', 'timing'),
        ],
        'Same-day ESR/CRP/platelets (GCA must be excluded — steroids if suspected), urgent ophthalmology/neuro-ophthalmology review; GP to optimise BP, diabetes, lipids, screen for sleep apnoea, avoid nocturnal hypotension (antihypertensive timing), and review semaglutide with the prescriber. Counsel on fellow-eye risk (~15% at 5 years). No proven treatment; monitor VF and disc for pallor.',
        {outOf: 3},
      ),
    ),
  ],
};

// =============================================================================
// Week 7 — Papilloedema (IIH)
// =============================================================================

export const papilloedema: Case = {
  id: 'papill',
  week: 7,
  topic: 'Optic neuropathies',
  diagnosis: 'Bilateral papilloedema secondary to idiopathic intracranial hypertension',
  difficulty: 2,
  source: 'Lecture 7 / Optic disc elevation reference',
  patient: {
    id: 'PX-7031',
    name: 'Sienna Morales',
    age: 27,
    sex: 'F',
    occupation: 'Childcare worker',
    complaint: '“I keep getting headaches and my vision greys out for a few seconds.”',
    summary: '2 months of daily headaches, worse lying down and in the morning, with brief visual greyouts on standing.',
    history: [
      'Headaches daily, worse in the morning and with coughing/bending.',
      'Transient visual obscurations (seconds) when standing up, both eyes.',
      'Pulsatile “whooshing” in her ears. Occasional horizontal double vision.',
      'Gained 12 kg over the last year.',
    ],
    medicalHistory: ['Acne', 'PCOS'],
    medications: ['Doxycycline (started 3 months ago)', 'Combined oral contraceptive'],
    familyHistory: ['Nil'],
  },
  exam: [
    {label: 'VA', value: 'R 6/6  L 6/6'},
    {label: 'Pupils', value: 'No RAPD'},
    {label: 'Colour vision', value: 'Normal'},
    {label: 'Motility', value: 'Mild bilateral abduction deficit (CN VI)'},
    {label: 'SVP', value: 'Absent OU'},
    {label: 'VF', value: 'Enlarged blind spots OU'},
    {label: 'BP', value: '124/80 mmHg'},
  ],
  scans: [
    scan('papill_disc_r', 'Optic disc', 'RE'),
    scan('papill_disc_l', 'Optic disc', 'LE'),
    scan('odd_faf', 'FAF', 'Comparison', 'Different patient — disc autofluorescence'),
    scan('htn_malignant_disc', 'Colour fundus', 'Comparison', 'Different patient — BP 230/140'),
  ],
  ddx: text(
    'ddx',
    'Headaches, transient visual obscurations and pulsatile tinnitus. What are your differentials?',
    [
      kw2('Papilloedema from raised ICP (IIH)', 'papilloedema', 'intracranial hypertension', 'raised intracranial', 'IIH', 'raised ICP'),
      kw('Space-occupying lesion / tumour', 'tumour', 'space occupying', 'mass', 'lesion'),
      kw('Venous sinus thrombosis', 'venous sinus', 'sinus thrombosis'),
      kw('Pseudopapilloedema (optic disc drusen)', 'pseudopapilloedema', 'disc drusen', 'ODD'),
      kw('Malignant hypertension', 'malignant hypertension', 'hypertensive'),
      kw('Bilateral optic neuritis / infiltrative', 'optic neuritis', 'infiltrat'),
      kw('Migraine', 'migraine'),
    ],
    'Raised ICP (IIH — young, overweight woman, doxycycline/OCP; space-occupying lesion; cerebral venous sinus thrombosis — OCP; meningitis), pseudopapilloedema (ODD, tilted/crowded discs), malignant hypertension, bilateral optic neuritis/infiltration, migraine.',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'papill-discs',
      prompt: 'Both optic discs. Label the swelling and any vessel obscuration at the disc margin.',
      scanIds: ['papill_disc_r', 'papill_disc_l'],
      targets: [
        target('papill_disc_r', 'swell-r', 'Elevated, swollen disc with blurred margins (RE)', SYN.discSwelling, circ(0.6, 0.47, 0.24), {points: 2}),
        target('papill_disc_l', 'swell-l', 'Elevated, swollen disc with blurred margins (LE)', SYN.discSwelling, circ(0.3, 0.45, 0.24), {points: 2}),
        target('papill_disc_r', 'obscure', 'Obscuration of vessels crossing the disc margin', ['obscured vessel', 'vessel obscuration', 'obscuration', 'vessels obscured', 'blurred vessel', 'peripapillary oedema'], circ(0.6, 0.3, 0.1)),
      ],
      outOf: 4,
      model: 'Bilateral elevated, hyperaemic discs with blurred margins, peripapillary NFL oedema obscuring the vessels as they cross the disc margin, and loss of the cup — bilateral papilloedema (Frisén grade 2–3).',
    },
    {
      type: 'annotate',
      id: 'odd',
      prompt: 'This FAF is from a different patient with “swollen-looking” discs. Label what you see.',
      scanIds: ['odd_faf'],
      targets: [
        target('odd_faf', 'odd', 'Hyperautofluorescent optic disc drusen', ['optic disc drusen', 'disc drusen', 'drusen', 'ODD', 'hyperautofluorescent', 'pseudopapilloedema'], circ(0.52, 0.42, 0.17), {points: 2}),
      ],
      model: 'Discrete hyperautofluorescent nodules on the disc — buried/superficial optic disc drusen (pseudopapilloedema). EDI-OCT shows hyporeflective cores with hyperreflective margins.',
    },
  ],
  finalDx: text(
    'final',
    'Final diagnosis and immediate action?',
    [
      kw2('Bilateral papilloedema', 'papilloedema'),
      kw2('Idiopathic intracranial hypertension', 'idiopathic intracranial hypertension', 'IIH', 'pseudotumour'),
      kw('Urgent same-day referral / neuroimaging (MRI + MRV)', 'urgent', 'same day', 'MRI', 'MRV', 'neuroimaging', 'emergency'),
      kw('Lumbar puncture opening pressure', 'lumbar puncture', 'opening pressure', 'LP'),
    ],
    'Bilateral papilloedema, most likely from idiopathic intracranial hypertension (risk: female, recent weight gain, doxycycline, OCP; CN VI palsy is a false-localising sign). Papilloedema is a same-day emergency referral: neuroimaging (MRI with MRV to exclude mass and venous sinus thrombosis), then LP with opening pressure (>25 cmH₂O) and CSF analysis.',
    {outOf: 5},
  ),
  pathophysiology: text(
    'patho',
    'Explain how raised intracranial pressure produces disc swelling.',
    [
      kw('Raised CSF pressure transmitted along the optic nerve sheath (subarachnoid space)', 'subarachnoid', 'sheath', 'CSF'),
      kw('Increased pressure at the lamina cribrosa / pressure gradient', 'lamina cribrosa', 'gradient', 'translaminar'),
      kw('Axoplasmic flow stasis', 'axoplasmic'),
      kw('Axonal swelling → disc elevation, obscured vessels', 'axonal swelling', 'axon', 'elevation', 'obscur'),
      kw('Venous congestion → haemorrhages, loss of SVP', 'venous', 'SVP', 'spontaneous venous', 'haemorrhage'),
      kw('Chronic → atrophy & field loss', 'atrophy', 'chronic'),
    ],
    'Raised ICP is transmitted through the subarachnoid space of the optic nerve sheath, raising retrolaminar tissue pressure and reversing the translaminar pressure gradient. Orthograde and retrograde axoplasmic flow stall at the lamina cribrosa → axonal swelling (disc elevation, blurred margins, NFL oedema obscuring vessels). Compression of the CRV in the sheath causes venous congestion, loss of SVPs, haemorrhages and CWS. Chronic papilloedema → gliosis, atrophy and constricted fields; transient obscurations reflect fluctuating ONH perfusion.',
    {outOf: 5},
  ),
  pool: [
    early(
      text(
        'true-vs-pseudo',
        'How do you differentiate true papilloedema from pseudopapilloedema?',
        [
          kw('Vessels obscured at margin (true) vs visible (pseudo)', 'obscur', 'vessels visible'),
          kw('Hyperaemia, haemorrhages, CWS (true)', 'hyperaem', 'haemorrhage', 'cotton wool'),
          kw('SVPs absent (true) — present suggests normal ICP', 'SVP', 'spontaneous venous'),
          kw('FAF / B-scan / EDI-OCT detect drusen', 'FAF', 'B scan', 'ultrasound', 'EDI', 'autofluorescence'),
          kw('OCT RNFL thickening / PHOMS', 'RNFL', 'PHOMS', 'OCT'),
          kw('Symptoms of raised ICP', 'headache', 'symptom'),
        ],
        'True papilloedema: bilateral elevation with hyperaemia, NFL oedema obscuring vessels at the margin, venous engorgement, haemorrhages/CWS, absent SVPs, symptoms of raised ICP; diffuse RNFL thickening on OCT. Pseudo (ODD): lumpy disc, vessels visible across the margin, anomalous branching, no hyperaemia, SVPs often present; drusen hyperautofluorescent on FAF, hyperechoic on B-scan, hyporeflective cores on EDI-OCT; PHOMS can occur in both.',
        {outOf: 4},
      ),
    ),
    late(
      mcq(
        'malignant',
        'The comparison patient with BP 230/140 and bilateral disc swelling should be:',
        ['Reviewed in 3 months', 'Sent to the emergency department immediately', 'Referred routinely to a GP', 'Started on AREDS2'],
        1,
        'Disc swelling with BP ≥180/120 = hypertensive emergency (malignant hypertension) — immediate ED referral.',
      ),
    ),
    late(
      text(
        'iih-mgmt',
        'Outline the management of IIH.',
        [
          kw('Weight loss', 'weight loss', 'weight'),
          kw('Acetazolamide', 'acetazolamide', 'carbonic anhydrase'),
          kw('Stop causative drugs (tetracyclines)', 'doxycycline', 'tetracycline', 'stop'),
          kw('Monitor VF and OCT', 'visual field', 'OCT', 'monitor'),
          kw('Surgery if vision threatened (ONSF, shunt, stenting)', 'fenestration', 'shunt', 'stent', 'surgery'),
        ],
        'Stop precipitating drugs (doxycycline), weight loss (5–10%), acetazolamide (± topiramate), headache management; regular VA, VF and OCT monitoring with neurology/neuro-ophthalmology; vision-threatening disease → optic nerve sheath fenestration, CSF shunting or venous sinus stenting.',
        {outOf: 3},
      ),
    ),
  ],
};

// =============================================================================
// Week 8 — Tutorial 8: POAG
// =============================================================================

export const glaucoma: Case = {
  id: 'glaucoma',
  week: 8,
  topic: 'Glaucoma',
  diagnosis: 'Primary open-angle glaucoma with inferior rim loss and corresponding superior arcuate defect',
  difficulty: 3,
  source: 'Tutorial 8 — “I am here for a general check up”',
  patient: {
    id: 'PX-8002',
    name: 'Nuru Abara',
    age: 59,
    sex: 'F',
    background: 'African',
    occupation: 'Painter (artist)',
    complaint: '“I’m just here for a general check-up.”',
    summary: 'Routine exam, no visual concerns. Wears reading glasses only.',
    history: ['No visual complaints.', 'Visual tasks: painting (near and intermediate).'],
    medicalHistory: ['Hypertension'],
    medications: ['Antihypertensive (taken at night)'],
    ocularHistory: ['Reading glasses'],
    familyHistory: ['Sister: glaucoma'],
  },
  exam: [
    {label: 'Refraction', value: 'R +0.50/−0.50×105 Add +2.50  L +0.25/−0.50×90 Add +2.50'},
    {label: 'BCVA', value: 'R 6/6−2  L 6/6−2'},
    {label: 'ONH function', value: 'Brightness 100%, monocular Ishihara 15/15, pupils equal, no RAPD'},
    {label: 'IOP (Goldmann)', value: 'R 28  L 27 mmHg'},
    {label: 'CCT', value: 'R 568 µm  L 569 µm'},
    {label: 'Anterior', value: 'Lids/conj clear, AC quiet, VH grade 3 (open)'},
  ],
  scans: [
    scan('glc_disc', 'Optic disc', 'RE'),
    scan('glc_rnfl', 'OCT report', 'RE', 'ONH & RNFL analysis'),
    scan('glc_vf', 'Visual field', 'RE', '30-2 threshold'),
  ],
  ddx: text(
    'ddx',
    'Nuru has no symptoms. What are her risk factors for glaucoma, and what conditions are you screening for?',
    [
      kw2('Primary open-angle glaucoma', 'open angle glaucoma', 'POAG', 'glaucoma'),
      kw('Ocular hypertension', 'ocular hypertension', 'OHT'),
      kw('African ethnicity', 'african', 'ethnicity', 'race'),
      kw('Family history (sibling)', 'family history', 'sister', 'sibling'),
      kw('Age', 'age'),
      kw('Hypertension / nocturnal hypotension', 'hypertension', 'blood pressure', 'nocturnal'),
      kw('Normal-tension / angle-closure glaucoma', 'normal tension', 'angle closure'),
    ],
    'Risk factors: age, African ancestry (biggest demographic risk, ~decade earlier onset), first-degree relative (sibling ≈9–10× risk), raised IOP, systemic hypertension (and nocturnal hypotension from night-time dosing). Screen for POAG, OHT, NTG and angle closure.',
    {outOf: 5},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'glc-disc',
      prompt: 'RE optic disc. Apply the 5 R’s. Mark the cup, label the neuroretinal rim defect, and draw a line across the vertical cup.',
      scanIds: ['glc_disc'],
      targets: [
        target('glc_disc', 'notch', 'Inferior neuroretinal rim thinning / notch', ['notch', 'rim thinning', 'neuroretinal rim', 'NRR', 'inferior rim', 'rim loss', 'ISNT'], circ(0.47, 0.75, 0.09), {points: 2}),
        target('glc_disc', 'cup', 'Enlarged cup (vertical C/D ≈ 0.7–0.8)', ['cup', 'cupping', 'enlarged cup', 'cup disc', 'CDR', 'C/D', 'vertical cup'], circ(0.46, 0.5, 0.14), {points: 2}),
        target('glc_disc', 'ppa', 'Peripapillary atrophy', ['peripapillary atrophy', 'PPA', 'beta zone', 'alpha zone', 'atrophy'], circ(0.3, 0.6, 0.08), {isBonus: true}),
      ],
      outOf: 4,
      model: 'Large disc with enlarged, vertically elongated cup (VCDR ~0.75), inferior neuroretinal rim thinning/notch (ISNT rule broken), bayoneting of vessels at the rim, ± peripapillary atrophy.',
    },
    {
      type: 'annotate',
      id: 'glc-oct-vf',
      prompt: 'OCT RNFL report and visual field. Label the RNFL defect and the field defect — do they correlate?',
      scanIds: ['glc_rnfl', 'glc_vf'],
      targets: [
        target('glc_rnfl', 'rnfl', 'Inferior / inferotemporal RNFL thinning', ['inferior RNFL', 'RNFL thinning', 'thinning', 'inferotemporal', 'red', 'yellow', 'RNFL defect', 'wedge'], box(0.28, 0.43, 0.42, 0.68), {points: 2}),
        target('glc_rnfl', 'wedge', 'Inferotemporal wedge on the deviation map', ['wedge', 'deviation', 'RNFL defect', 'red', 'thinning', 'inferotemporal'], circ(0.75, 0.88, 0.1), {isBonus: true}),
        target('glc_vf', 'arcuate', 'Superior arcuate defect', ['superior arcuate', 'arcuate', 'bjerrum', 'superior defect', 'nasal step', 'superior hemifield', 'altitudinal'], box(0.58, 0.16, 0.98, 0.36), {points: 2}),
      ],
      outOf: 4,
      model: 'OCT: inferior quadrant borderline and 7 o’clock clock-hour outside normal limits with an inferotemporal wedge on the deviation map. VF: superior arcuate defect — structure–function correlation (inferior rim/RNFL loss → superior field loss).',
    },
  ],
  finalDx: text(
    'final',
    'What is your diagnosis, and why does the field defect make sense?',
    [
      kw2('Primary open-angle glaucoma', 'open angle glaucoma', 'POAG', 'chronic glaucoma'),
      kw('Inferior rim/RNFL loss', 'inferior rim', 'inferior RNFL', 'inferior thinning', 'notch'),
      kw('Superior arcuate field defect', 'superior arcuate', 'superior field'),
      kw('Structure–function correlation (field coordinates inverted)', 'correlat', 'inverted', 'opposite', 'structure function'),
    ],
    'Bilateral primary open-angle glaucoma (IOP 27–28 mmHg, open angles, normal CCT): RE inferior NRR notch and inferotemporal RNFL thinning with a corresponding superior arcuate defect — VF coordinates are inverted relative to the retina (inferior vulnerability zone).',
    {outOf: 4},
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology of glaucomatous optic neuropathy (mechanical and vascular theories).',
    [
      kw('Raised IOP → lamina cribrosa deformation (mechanical)', 'lamina cribrosa', 'mechanical', 'deform'),
      kw('Axoplasmic flow blockade / neurotrophin deprivation', 'axoplasmic', 'neurotrophin', 'BDNF'),
      kw('Retinal ganglion cell apoptosis', 'ganglion cell', 'apoptosis', 'RGC'),
      kw('Vascular: poor ONH perfusion / dysregulation', 'vascular', 'perfusion', 'ischaemi'),
      kw('Inferior/superior poles most vulnerable (larger pores, less support)', 'superior and inferior', 'poles', 'larger pores', 'vulnerab'),
      kw('Aqueous outflow resistance at the trabecular meshwork', 'trabecular', 'outflow'),
    ],
    'Increased trabecular outflow resistance raises IOP. Mechanical theory: IOP and the translaminar pressure gradient deform and posteriorly bow the lamina cribrosa, kinking axons → blockade of axoplasmic transport and neurotrophin (BDNF) deprivation → RGC apoptosis. Vascular theory: reduced ONH perfusion/dysregulation (nocturnal hypotension, vasospasm) causes ischaemic injury — important in NTG. The superior and inferior poles of the lamina have larger pores and less connective-tissue support, so arcuate fibres are lost first → rim notching and arcuate field defects.',
    {outOf: 5},
  ),
  pool: [
    early(
      text(
        'tests',
        'What tests do you want to do today?',
        [
          kw('Goldmann applanation tonometry (± diurnal)', 'goldmann', 'applanation', 'IOP'),
          kw('Pachymetry (CCT)', 'pachymetry', 'corneal thickness', 'CCT'),
          kw('Gonioscopy', 'gonioscopy'),
          kw('Dilated stereoscopic disc assessment', 'disc', 'stereo', 'dilated'),
          kw('OCT RNFL / GCL', 'OCT', 'RNFL', 'GCL'),
          kw('Visual fields 24-2 (± 10-2)', 'visual field', '24 2', '10 2'),
        ],
        'Goldmann applanation (± diurnal phasing), pachymetry, gonioscopy (angle open?), van Herick, dilated stereoscopic disc assessment (5 R’s), OCT RNFL and GCL analysis, SITA 24-2 (24-2C/10-2 for central involvement), disc photography as a baseline.',
        {outOf: 4},
      ),
    ),
    late(
      text(
        'glaucomatous',
        'What criteria make a VF defect “glaucomatous” (Hodapp–Parrish–Anderson)?',
        [
          kw('GHT outside normal limits', 'GHT', 'hemifield', 'outside normal'),
          kw('Cluster of ≥3 non-edge points p<5% with one p<1% in a hemifield', 'cluster', '3', 'non edge', '5%'),
          kw('PSD p<5%', 'PSD', 'pattern standard'),
          kw('Repeatable on ≥2 consecutive reliable fields', 'repeat', 'consecutive', 'two', 'reliable'),
        ],
        'On at least two consecutive reliable fields: GHT outside normal limits, OR a cluster of ≥3 contiguous non-edge points in one hemifield at p<5% with one at p<1% on the pattern deviation plot, OR PSD with p<5%.',
        {outOf: 3},
      ),
    ),
    late(
      text(
        'mgmt',
        'Management of Nuru?',
        [
          kw('Refer / co-manage with ophthalmology', 'refer', 'ophthalmolog'),
          kw('Topical IOP lowering (prostaglandin analogue first line)', 'prostaglandin', 'latanoprost', 'drop', 'topical'),
          kw('SLT laser', 'SLT', 'laser trabeculoplasty', 'selective laser'),
          kw('Target IOP (e.g. 25–30% reduction)', 'target', '30%', '25%'),
          kw('Monitor OCT/VF for progression (event/trend)', 'progression', 'monitor', 'trend', 'event'),
          kw('Screen siblings/children', 'family', 'siblings', 'children', 'relatives'),
        ],
        'Refer/co-manage; set a target IOP (≥25–30% reduction); first-line prostaglandin analogue or SLT; review adherence and drop technique; repeat VF (≥3 in the first 2 years) and OCT for event/trend progression analysis (GPA); liaise with GP on night-time antihypertensive dosing (nocturnal hypotension); advise first-degree relatives to be screened.',
        {outOf: 4},
      ),
    ),
    late(
      mcq(
        'green',
        '“Green disease” on OCT means:',
        [
          'True RNFL loss correctly flagged',
          'Disease present but the OCT reports values within normal limits',
          'False-positive RNFL loss from artefact',
          'Normal tension glaucoma',
        ],
        1,
        'Green disease = false negative (early loss, segmentation error, macular pathology, physiologically thick RNFL). Red disease = false positive (split bundles, temporal shift, artefacts).',
      ),
    ),
  ],
};
