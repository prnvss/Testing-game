import type {Case} from '../types';
import {box, circ, early, kw, kw2, late, mcq, scan, SYN, target, text} from '../helpers';

// =============================================================================
// Week 1 — Rhegmatogenous retinal detachment
// =============================================================================

export const rrd: Case = {
  id: 'rrd',
  week: 1,
  topic: 'Peripheral retina',
  diagnosis: 'Macula-on superior bullous rhegmatogenous retinal detachment from a horseshoe tear',
  difficulty: 2,
  source: 'Lecture 1 — Peripheral retina, vitreous & retinal detachment',
  patient: {
    id: 'PX-1048',
    name: 'Marcus Webb',
    age: 58,
    sex: 'M',
    background: 'Caucasian',
    occupation: 'Accountant',
    complaint: '“There’s a dark shadow creeping in from the top of my right eye.”',
    summary: '3 days of new floaters and flashes in the RE, now a shadow in the upper field since this morning.',
    history: [
      'Sudden shower of floaters RE 3 days ago with flashes in the temporal field, worse in dim light.',
      'Since this morning a grey “curtain” in the superior field that seems to be getting bigger.',
      'Central vision still clear. Painless. No trauma.',
    ],
    medicalHistory: ['Hypercholesterolaemia'],
    medications: ['Atorvastatin 20 mg'],
    ocularHistory: ['High myope (RE −6.50 DS, LE −6.00 DS)', 'Uncomplicated cataract surgery RE 2 years ago'],
    familyHistory: ['Nil known'],
  },
  exam: [
    {label: 'VA', value: 'R 6/7.5  L 6/6 (habitual Rx)'},
    {label: 'Pupils', value: 'Mild RE RAPD'},
    {label: 'IOP', value: 'R 9 mmHg  L 15 mmHg (Perkins)'},
    {label: 'Anterior vitreous', value: 'RE pigment cells (“tobacco dust”, Shafer’s sign +)'},
    {label: 'Confrontation', value: 'RE inferior field loss'},
  ],
  scans: [
    scan('rd_fundus', 'Widefield fundus', 'RE'),
    scan('rd_oct', 'OCT', 'RE', 'Peripheral OCT through the superior lesion'),
    scan('pvd_weiss', 'Slit lamp', 'RE', 'Posterior vitreous on slit-lamp biomicroscopy'),
    scan('rd_lattice', 'Widefield fundus', 'LE', 'Fellow-eye periphery'),
  ],
  ddx: text(
    'ddx',
    'Marcus reports new floaters, flashes and now a shadow. What are your provisional differential diagnoses (most to least likely)?',
    [
      kw2('Retinal detachment (rhegmatogenous)', 'retinal detachment', 'rhegmatogenous'),
      kw('Retinal tear / break', 'retinal tear', 'retinal break', 'horseshoe tear', 'retinal hole'),
      kw('Posterior vitreous detachment', 'posterior vitreous detachment', 'PVD'),
      kw('Vitreous haemorrhage', 'vitreous haemorrhage'),
      kw('Migraine aura / other causes of photopsia', 'migraine', 'ocular migraine'),
      kw('Retinoschisis / choroidal detachment', 'retinoschisis', 'choroidal detachment', 'exudative detachment', 'tractional'),
    ],
    'Most likely: rhegmatogenous retinal detachment secondary to a retinal tear (new flashes + floaters → PVD with traction; a progressive “curtain” means subretinal fluid spreading). Others: PVD with retinal tear, isolated PVD, vitreous haemorrhage, retinoschisis, exudative/tractional RD, migraine aura (photopsia).',
    {outOf: 5},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'rd-fundus',
      prompt: 'Widefield RE image. Label the retinal break and the detached retina. Mark the optic disc as well.',
      hint: 'Use an arrow for the break and a box/ellipse around the detached area.',
      scanIds: ['rd_fundus'],
      targets: [
        target('rd_fundus', 'tear', 'Horseshoe (flap) tear', ['horseshoe tear', 'flap tear', 'U tear', 'retinal tear', 'retinal break', 'tear', 'break', 'hole'], circ(0.7, 0.25, 0.09), {points: 2}),
        target('rd_fundus', 'rd', 'Bullous detached retina (subretinal fluid)', ['retinal detachment', 'detached retina', 'detachment', 'subretinal fluid', 'bullous', 'RD', 'RRD', 'elevated retina'], circ(0.5, 0.47, 0.2), {points: 2}),
        target('rd_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.52, 0.78, 0.06)),
      ],
      model: 'Superotemporal horseshoe tear at ~1 o’clock with its flap pulled anteriorly by vitreous traction; grey, corrugated, mobile bullous detachment of the superior retina extending towards but not involving the macula (macula-on); optic disc inferiorly in the image.',
    },
    {
      type: 'annotate',
      id: 'rd-oct',
      prompt: 'OCT through the superior lesion. Identify the vitreous traction on the flap and the subretinal fluid.',
      scanIds: ['rd_oct'],
      targets: [
        target('rd_oct', 'traction', 'Vitreoretinal traction on the tear flap', ['vitreous traction', 'traction', 'flap', 'operculum', 'tear', 'vitreoretinal traction', 'posterior hyaloid'], circ(0.42, 0.38, 0.1)),
        target('rd_oct', 'srf', 'Subretinal fluid / detached neurosensory retina', ['subretinal fluid', 'SRF', 'retinal detachment', 'detached retina', 'neurosensory detachment'], circ(0.27, 0.55, 0.13)),
      ],
      model: 'Posterior hyaloid inserting on the elevated flap of the break (persistent vitreoretinal traction); neurosensory retina separated from the RPE by hyporeflective subretinal fluid.',
    },
    {
      type: 'annotate',
      id: 'pvd',
      prompt: 'Slit-lamp view of the posterior vitreous. Label the key finding that confirms a PVD.',
      scanIds: ['pvd_weiss'],
      targets: [target('pvd_weiss', 'weiss', 'Weiss ring', ['weiss ring', 'weiss', 'PVD', 'posterior vitreous detachment', 'vitreous detachment', 'glial ring'], circ(0.6, 0.45, 0.14))],
      model: 'Weiss ring — the detached annulus of peripapillary glial tissue from the vitreous attachment at the disc margin, confirming a complete PVD.',
    },
  ],
  finalDx: text(
    'final',
    'What is your final diagnosis? Be specific about type and macular status.',
    [
      kw2('Rhegmatogenous retinal detachment', 'rhegmatogenous retinal detachment', 'rhegmatogenous', 'RRD'),
      kw('Macula on', 'macula on', 'macula attached', 'macula sparing', 'fovea on'),
      kw('Secondary to horseshoe tear', 'horseshoe tear', 'flap tear', 'retinal tear', 'retinal break'),
      kw('Associated PVD', 'posterior vitreous detachment', 'PVD'),
    ],
    'Right superior bullous rhegmatogenous retinal detachment, macula-on, secondary to a superotemporal horseshoe tear following an acute PVD (risk factors: high myopia, pseudophakia).',
    {outOf: 4},
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology from vitreous syneresis to retinal detachment.',
    [
      kw('Vitreous syneresis / liquefaction with age (myopia, pseudophakia)', 'syneresis', 'liquefaction', 'synchysis', 'liquefied vitreous'),
      kw('PVD: posterior hyaloid separates from ILM', 'posterior vitreous detachment', 'hyaloid separates', 'vitreous separates', 'PVD'),
      kw('Traction at strong vitreoretinal adhesion (vitreous base / lattice)', 'traction', 'vitreous base', 'adhesion', 'lattice'),
      kw('Full-thickness retinal break (horseshoe tear)', 'retinal break', 'retinal tear', 'horseshoe', 'full thickness break'),
      kw('Liquefied vitreous passes through the break into the subretinal space', 'subretinal space', 'fluid enters', 'fluid passes', 'subretinal fluid'),
      kw('Neurosensory retina separates from RPE → photoreceptor loss of nutrition', 'separates from rpe', 'separation of neurosensory', 'neurosensory retina', 'photoreceptor'),
      kw('Flashes = mechanical traction; floaters = condensation/blood/pigment', 'flashes', 'photopsia', 'floaters'),
    ],
    'Age-related (accelerated by myopia and cataract surgery) syneresis liquefies the vitreous → the posterior hyaloid separates from the ILM (PVD). Where adhesion is strong (vitreous base, lattice), dynamic traction tears a full-thickness break (horseshoe flap) — traction is felt as photopsia; floaters come from the Weiss ring, haemorrhage and RPE cells (tobacco dust). Liquefied vitreous passes through the break into the potential subretinal space, separating neurosensory retina from the RPE; the detachment spreads (superior detachments progress fastest under gravity), producing a curtain-like field defect and loss of photoreceptor nourishment from the choroid.',
    {outOf: 6},
  ),
  pool: [
    early(
      text(
        'hx',
        'What history questions would you ask to differentiate a simple PVD from a retinal tear/detachment?',
        [
          kw('Onset and number of floaters (shower vs single)', 'shower', 'how many floaters', 'number of floaters', 'sudden floaters'),
          kw('Flashes — location and duration', 'flashes', 'photopsia'),
          kw('Curtain / shadow / field loss', 'curtain', 'shadow', 'field loss', 'veil'),
          kw('Central vision affected? (macula status)', 'central vision', 'macula', 'distortion', 'blurred'),
          kw('Myopia / previous cataract surgery / trauma', 'myopia', 'myopic', 'cataract surgery', 'trauma', 'previous surgery'),
          kw('Previous RD or family history', 'previous detachment', 'family history', 'fellow eye'),
        ],
        'Onset/timing; single floater vs shower (a shower ± red tint suggests haemorrhage from a torn vessel); flashes; any curtain/shadow and which part of the field; central vision/distortion (macula status); one or both eyes; risk factors — myopia, cataract surgery, trauma, previous RD/tear, fellow-eye history, family history (Stickler).',
        {outOf: 4},
      ),
    ),
    early(
      mcq(
        'shafer',
        'Pigment cells in the anterior vitreous (Shafer’s sign) indicate:',
        ['Uveitis', 'A retinal break is likely present', 'Asteroid hyalosis', 'Normal ageing change'],
        1,
        'Tobacco dust (RPE cells released through a break) is strongly associated with a retinal tear — Shafer’s sign is highly specific for a break in an eye with acute PVD symptoms.',
      ),
    ),
    late(
      text(
        'mgmt',
        'How urgently should Marcus be referred, and what treatment is likely?',
        [
          kw('Same-day / emergency referral to ophthalmology (vitreoretinal)', 'same day', 'urgent', 'emergency', 'immediate', 'today'),
          kw('Macula-on: aim to repair before macula detaches', 'macula on', 'before the macula', 'macula threatened'),
          kw('Surgery: vitrectomy / scleral buckle / pneumatic retinopexy', 'vitrectomy', 'scleral buckle', 'pneumatic', 'retinopexy', 'surgery'),
          kw('Advise to rest / limit activity / head positioning', 'rest', 'avoid strenuous', 'posture', 'positioning'),
        ],
        'Macula-on RRD is a same-day emergency referral to a vitreoretinal service — the goal is repair before the fovea detaches (visual prognosis falls sharply once macula-off). Options: pars plana vitrectomy with gas/oil, scleral buckle, or pneumatic retinopexy; the break is sealed with laser/cryotherapy. Advise to limit activity and seek care immediately if the curtain advances.',
        {outOf: 3},
      ),
    ),
    late(
      text(
        'lattice',
        'What peripheral degenerations are “Category B — possible threat to vision”, and why does lattice matter here?',
        [
          kw('Lattice degeneration', 'lattice'),
          kw('Snail track degeneration', 'snail track'),
          kw('Degenerative retinoschisis', 'retinoschisis'),
          kw('White without pressure', 'white without pressure'),
          kw('Lattice = thinning with strong vitreous adhesion at the margins → tears', 'strong adhesion', 'vitreous adhesion', 'margins', 'traction', 'thin retina'),
        ],
        'Lattice degeneration, snail-track degeneration, degenerative retinoschisis and white-without-pressure. Lattice is retinal thinning with firm vitreoretinal adhesion at its margins; when a PVD occurs, traction at those margins produces tears, and atrophic holes can form within the lattice itself.',
        {outOf: 3},
      ),
    ),
  ],
};

// =============================================================================
// Week 2 — Tutorial 2: BRAO (+ hypertensive retinopathy fellow eye)
// =============================================================================

export const brao: Case = {
  id: 'brao',
  week: 2,
  topic: 'Retinal vascular disease',
  diagnosis: 'Right superior branch retinal artery occlusion (embolic) with hypertensive retinopathy',
  difficulty: 2,
  source: 'Tutorial 2 — “I can’t see the floor”',
  patient: {
    id: 'PX-2017',
    name: 'Jaclyn Boyle',
    age: 60,
    sex: 'F',
    background: 'Caucasian',
    complaint: '“I woke up today and I can’t seem to see the floor.”',
    summary: 'Woke with the bottom half of her vision grey and fuzzy; unsure which eye. Unchanged since waking.',
    history: [
      'Painless. No flashes, no complete blackout.',
      'Two weeks ago: “like a curtain came down over the top half of my vision” — lasted a couple of minutes, then completely cleared.',
      'Denies headaches, jaw pain, weakness, numbness or bumping into things.',
      'No recent trauma or surgery.',
    ],
    medicalHistory: ['Hypertension (on tablets)', 'Coronary stents'],
    medications: ['Antihypertensive (unspecified)', 'Antiplatelet'],
    ocularHistory: ['Multifocal reading glasses'],
    familyHistory: ['Unremarkable'],
  },
  exam: [
    {label: 'VA (bifocals)', value: 'R 6/60  L 6/9.5  OU 6/36 — no improvement with pinhole'},
    {label: 'Pupils', value: 'PERRL, RE RAPD'},
    {label: 'EOM', value: 'Full and smooth, no pain'},
    {label: 'IOP', value: 'R 17  L 18 mmHg (iCare, 9:30 am)'},
    {label: 'Slit lamp', value: 'No Shafer’s sign. R NO3 NC3, L NO4.5 NC4'},
    {label: 'BP (in office)', value: '172/98 mmHg'},
  ],
  scans: [
    scan('brao_fundus', 'Colour fundus', 'RE'),
    scan('htn_fundus_le', 'Colour fundus', 'LE'),
    scan('brao_oct', 'OCT', 'RE', 'Line scan through the superior macula'),
    scan('brao_vf', 'Visual field', 'RE', 'HFA 24-2 SITA Standard'),
    scan('brao_ffa', 'FFA', 'RE', 'Arterial phase'),
  ],
  ddx: text(
    'ddx',
    'Sudden painless loss of the lower half of vision on waking, with a transient “curtain” 2 weeks ago. List your differential diagnoses.',
    [
      kw2('Retinal artery occlusion (BRAO / CRAO)', 'branch retinal artery occlusion', 'retinal artery occlusion', 'artery occlusion', 'BRAO', 'CRAO'),
      kw('Amaurosis fugax (the earlier episode)', 'amaurosis fugax', 'transient monocular'),
      kw('Retinal vein occlusion', 'vein occlusion', 'CRVO', 'BRVO', 'RVO'),
      kw('Anterior ischaemic optic neuropathy (NAION / AAION–GCA)', 'ischaemic optic neuropathy', 'NAION', 'AION', 'giant cell arteritis', 'GCA'),
      kw('Retinal detachment', 'retinal detachment'),
      kw('Vitreous haemorrhage', 'vitreous haemorrhage'),
      kw('Stroke / neurological (field loss)', 'stroke', 'TIA', 'neurological', 'cerebrovascular'),
      kw('Ocular ischaemic syndrome', 'ocular ischaemic syndrome', 'OIS'),
    ],
    'Primary: branch retinal artery occlusion (altitudinal loss, RAPD, preceding amaurosis fugax = embolic warning). Others: CRAO, BRVO/hemi-RVO, NAION/AAION (GCA — always ask), retinal detachment, vitreous/pre-retinal haemorrhage, ocular ischaemic syndrome, stroke/TIA (field loss).',
    {outOf: 5},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'brao-fundus',
      prompt: 'RE fundus. Outline the area of ischaemic retina and label the fovea and optic disc.',
      scanIds: ['brao_fundus'],
      targets: [
        target('brao_fundus', 'whitening', 'Cloudy-white retinal oedema (ischaemic territory)', ['retinal whitening', 'whitening', 'ischaemic retina', 'retinal oedema', 'pale retina', 'cloudy white', 'opacification', 'infarct', 'ischaemia', 'oedema'], box(0.2, 0.27, 0.58, 0.57), {points: 2}),
        target('brao_fundus', 'fovea', 'Fovea (spared)', SYN.fovea, circ(0.4, 0.62, 0.05)),
        target('brao_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.76, 0.52, 0.06)),
      ],
      model: 'Wedge of cloudy-white inner retinal oedema in the superotemporal arcade territory (intracellular oedema of ischaemic ganglion cells/nerve fibres), bordering the fovea; disc temporal border; look for an embolus at the apex of the wedge.',
    },
    {
      type: 'annotate',
      id: 'brao-le',
      prompt: 'LE fundus (hypertensive patient). Identify the haemorrhages near the disc and label the disc.',
      scanIds: ['htn_fundus_le'],
      targets: [
        target('htn_fundus_le', 'flame', 'Flame haemorrhages', SYN.flame, circ(0.53, 0.62, 0.09), {points: 2}),
        target('htn_fundus_le', 'disc', 'Optic disc', SYN.disc, circ(0.48, 0.44, 0.06)),
      ],
      model: 'Flame-shaped (nerve-fibre-layer) haemorrhages inferior to the disc with arteriolar narrowing and AV crossing changes → moderate hypertensive retinopathy (Mitchell–Wong).',
    },
    {
      type: 'annotate',
      id: 'brao-oct-vf',
      prompt: 'RE OCT and visual field. Label the abnormal OCT layer change and the field defect.',
      scanIds: ['brao_oct', 'brao_vf'],
      targets: [
        target('brao_oct', 'inner', 'Inner retinal thickening / hyperreflectivity', ['inner retinal thickening', 'hyperreflectivity', 'hyperreflective', 'inner retinal oedema', 'thickening', 'oedema', 'swelling'], box(0.55, 0.26, 0.97, 0.52), {points: 2}),
        target('brao_vf', 'altitudinal', 'Inferior altitudinal defect', ['inferior altitudinal', 'altitudinal', 'inferior field loss', 'inferior defect', 'respects horizontal', 'inferior hemifield'], box(0.48, 0.34, 0.8, 0.49), {points: 2}),
      ],
      model: 'OCT: thickened, hyperreflective inner retina with shadowing in the affected (superior) segment — acute inner retinal ischaemia. VF: dense inferior altitudinal defect respecting the horizontal midline, corresponding to the superior arcade occlusion.',
    },
    {
      type: 'annotate',
      id: 'brao-ffa',
      prompt: 'FFA arterial phase. Mark the abnormal area.',
      scanIds: ['brao_ffa'],
      targets: [
        target('brao_ffa', 'hypo', 'Delayed filling / hypofluorescence of the occluded branch territory', ['hypofluorescence', 'delayed filling', 'non perfusion', 'non-perfusion', 'filling defect', 'delayed arterial filling', 'capillary dropout', 'ischaemia', 'no flow'], box(0.12, 0.15, 0.66, 0.5), {points: 2}),
      ],
      model: 'Delayed arterial filling and hypofluorescence (filling defect) in the superior arcade territory, consistent with branch artery occlusion.',
    },
  ],
  finalDx: text(
    'final',
    'What is the most likely cause of Jaclyn’s problems? Give the final diagnosis and what happened 2 weeks ago.',
    [
      kw2('Branch retinal artery occlusion (right, superior)', 'branch retinal artery occlusion', 'BRAO'),
      kw('Embolic (e.g. Hollenhorst / carotid)', 'embolus', 'embolic', 'emboli', 'hollenhorst', 'carotid'),
      kw('Earlier episode = amaurosis fugax', 'amaurosis fugax', 'transient', 'TIA'),
      kw('Hypertensive retinopathy (LE)', 'hypertensive retinopathy', 'hypertension'),
    ],
    'Right superior branch retinal artery occlusion, most likely embolic (carotid/cardiac source) — the transient superior “curtain” 2 weeks earlier was amaurosis fugax (transient embolic occlusion). The LE shows moderate hypertensive retinopathy.',
    {outOf: 4},
  ),
  pathophysiology: text(
    'patho',
    'Describe the pathophysiology of BRAO and explain the fundus, OCT and field findings.',
    [
      kw('Embolus/thrombus blocks a branch arteriole (often at a bifurcation)', 'embolus', 'thrombus', 'blocks', 'occludes', 'bifurcation'),
      kw('Sources: carotid atheroma (Hollenhorst), platelet-fibrin, calcific (valves)', 'carotid', 'hollenhorst', 'cholesterol', 'platelet fibrin', 'calcific', 'cardiac'),
      kw('Inner retina (CRA supply) becomes ischaemic', 'inner retina', 'ischaemia', 'hypoxia'),
      kw('Intracellular oedema of ganglion cells/NFL → white retina', 'intracellular oedema', 'ganglion cell', 'nerve fibre', 'cloudy', 'whitening'),
      kw('Field defect corresponds to opposite hemifield (altitudinal)', 'altitudinal', 'opposite', 'inferior field', 'respects horizontal'),
      kw('Temporal branches commonly affected', 'temporal'),
    ],
    'An embolus (Hollenhorst cholesterol plaque from carotid atheroma, platelet-fibrin, or calcific from valves) or thrombus lodges in a branch arteriole, often at a bifurcation, stopping flow to the inner retina supplied by the CRA. Acute hypoxia causes intracellular oedema and necrosis of ganglion cells and nerve fibres → cloudy-white retina and inner-retinal hyperreflective thickening on OCT; the outer retina (choroidal supply) is spared. The superior arcade supplies the superior retina, which sees the inferior field → inferior altitudinal defect. Temporal branches are involved in ~90% due to greater flow towards the macula.',
    {outOf: 5},
  ),
  pool: [
    early(
      text(
        'tests',
        'What tests would you perform today, and why?',
        [
          kw('Visual acuity / pinhole', 'visual acuity', 'pinhole', 'VA'),
          kw('Pupils (RAPD)', 'pupil', 'RAPD'),
          kw('Visual fields', 'visual field', 'confrontation', 'perimetry'),
          kw('Dilated fundus examination', 'dilated fundus', 'fundus', 'ophthalmoscopy'),
          kw('OCT', 'OCT'),
          kw('Blood pressure', 'blood pressure', 'BP'),
          kw('Colour vision / red desaturation', 'colour vision', 'red desaturation', 'ishihara'),
          kw('IOP', 'IOP', 'intraocular pressure'),
        ],
        'VA ± pinhole, pupils (RAPD), colour vision/red desaturation (optic nerve function), confrontation then formal VF, IOP, slit lamp (Shafer’s sign, NVI), dilated fundus (emboli, whitening, haemorrhages), OCT/OCT-A, fundus photography, in-office blood pressure; FFA via ophthalmology.',
        {outOf: 5},
      ),
    ),
    early(
      text(
        'htn-signs',
        'What ocular signs indicate hypertensive retinopathy, and what is the mechanism of each?',
        [
          kw('Generalised/focal arteriolar narrowing (vasoconstriction)', 'arteriolar narrowing', 'attenuation', 'vasoconstriction', 'narrowing'),
          kw('AV nicking (sclerosis at shared adventitial sheath)', 'nicking', 'nipping', 'arteriovenous crossing', 'AV crossing'),
          kw('Copper/silver wiring (arteriolar wall sclerosis)', 'copper wiring', 'silver wiring', 'sclerosis'),
          kw('Flame/blot haemorrhages (BRB breakdown)', 'haemorrhage', 'flame'),
          kw('Cotton wool spots (NFL infarcts)', 'cotton wool'),
          kw('Hard exudates (leakage of lipid)', 'hard exudate', 'exudate'),
          kw('Disc swelling (malignant)', 'disc swelling', 'papilloedema', 'disc oedema'),
        ],
        'Vasoconstrictive phase: generalised/focal arteriolar narrowing. Sclerotic phase: intimal thickening/hyaline degeneration → AV nicking, copper/silver wiring. Exudative phase: BRB breakdown → flame/blot haemorrhages, hard exudates (macular star), cotton wool spots (NFL infarcts, axoplasmic stasis); malignant: optic disc swelling. Choroidopathy: Elschnig spots, Siegrist streaks, serous RD.',
        {outOf: 5},
      ),
    ),
    late(
      text(
        'grade',
        'Grade the LE hypertensive retinopathy using the Mitchell–Wong scale and justify.',
        [
          kw2('Moderate', 'moderate'),
          kw('Haemorrhages present', 'haemorrhage'),
          kw('No disc swelling (so not malignant)', 'no disc swelling', 'no papilloedema', 'not malignant', 'without disc'),
        ],
        'Moderate (Mitchell–Wong): retinal haemorrhages ± microaneurysms/CWS/hard exudates, without optic disc swelling (which would make it malignant).',
      ),
    ),
    late(
      text(
        'mgmt',
        'Outline your management and referral plan for Jaclyn.',
        [
          kw2('Urgent same-day referral (ophthalmology / stroke work-up)', 'same day', 'urgent', 'immediate', 'emergency', 'stroke'),
          kw('ED if neurological symptoms or BP ≥180/120', 'emergency department', '180', 'ED'),
          kw('Carotid duplex / echocardiogram', 'carotid', 'duplex', 'echocardiogram', 'doppler'),
          kw('GP: BP, lipids, glucose control', 'GP', 'blood pressure', 'cholesterol', 'lipid', 'glucose'),
          kw('Exclude GCA (ESR/CRP) if ≥50', 'ESR', 'CRP', 'giant cell'),
          kw('Monitor for neovascularisation', 'neovascularisation', 'NVI', 'rubeosis'),
        ],
        'Retinal artery occlusion = “stroke of the eye”: same-day referral to ophthalmology/stroke service (ED immediately if neurological symptoms, chest pain or BP ≥180/120). Systemic work-up with GP: carotid duplex, echocardiogram/ECG, BP (target <140/90), lipids, glucose/HbA1c; ESR/CRP and platelets to exclude GCA. Communicate in-office BP to the GP. Follow-up for neovascularisation.',
        {outOf: 4},
      ),
    ),
    late(
      mcq(
        'virchow',
        'Which statement about the Tutorial 2 “describe this image” fundus (blood and thunder) is correct?',
        [
          'It shows a BRAO with a cherry-red spot',
          'It shows ischaemic CRVO: haemorrhages in all 4 quadrants, dilated tortuous veins, disc swelling, CWS',
          'It shows proliferative DR with NVD',
          'It shows malignant hypertension only',
        ],
        1,
        'Widespread flame/blot haemorrhages in all four quadrants with dilated tortuous veins, CWS and disc oedema is the “blood and thunder” fundus of ischaemic CRVO.',
      ),
    ),
  ],
};

// =============================================================================
// Week 2 — CRVO
// =============================================================================

export const crvo: Case = {
  id: 'crvo',
  week: 2,
  topic: 'Retinal vascular disease',
  diagnosis: 'Ischaemic central retinal vein occlusion',
  difficulty: 2,
  source: 'Lecture 2 / Tutorial 2 — retinal vein occlusion',
  patient: {
    id: 'PX-2033',
    name: 'Graham Holt',
    age: 71,
    sex: 'M',
    background: 'Caucasian',
    occupation: 'Retired builder',
    complaint: '“My right eye went very blurry overnight.”',
    summary: 'Painless, marked blurring RE noticed on waking 2 days ago. No flashes or floaters.',
    history: ['Painless, persistent, monocular (RE).', 'Felt “misty” for a day before that.', 'No headache, scalp tenderness or jaw claudication.'],
    medicalHistory: ['Hypertension (poorly controlled)', 'Type 2 diabetes', 'Smoker 30 pack-years'],
    medications: ['Amlodipine', 'Metformin'],
    ocularHistory: ['Primary open-angle glaucoma RE on drops'],
    familyHistory: ['Father: stroke'],
  },
  exam: [
    {label: 'VA', value: 'R CF 1 m  L 6/7.5'},
    {label: 'Pupils', value: 'Marked RE RAPD'},
    {label: 'IOP', value: 'R 24  L 17 mmHg'},
    {label: 'Gonioscopy', value: 'Open angles, no NVA'},
    {label: 'BP', value: '168/96 mmHg'},
  ],
  scans: [scan('crvo_fundus', 'Colour fundus', 'RE')],
  ddx: text(
    'ddx',
    'List your differential diagnoses for sudden painless unilateral vision loss in this patient.',
    [
      kw2('Central retinal vein occlusion', 'central retinal vein occlusion', 'CRVO', 'vein occlusion'),
      kw('Central retinal artery occlusion', 'artery occlusion', 'CRAO'),
      kw('Ischaemic optic neuropathy (NAION/GCA)', 'ischaemic optic neuropathy', 'NAION', 'AION', 'GCA'),
      kw('Ocular ischaemic syndrome', 'ocular ischaemic', 'OIS'),
      kw('Vitreous haemorrhage (e.g. PDR)', 'vitreous haemorrhage', 'proliferative'),
      kw('Hypertensive retinopathy (malignant)', 'hypertensive', 'malignant'),
      kw('Retinal detachment', 'retinal detachment'),
    ],
    'CRVO (vascular risk factors + glaucoma), CRAO, NAION/AAION (exclude GCA), ocular ischaemic syndrome (mid-peripheral haemorrhages, low-pressure veins), vitreous haemorrhage from PDR, malignant hypertensive retinopathy, retinal detachment.',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'crvo-fundus',
      prompt: 'RE fundus. Label as many signs of vein occlusion as you can: haemorrhage types, venous changes, disc and cotton wool spots.',
      scanIds: ['crvo_fundus'],
      targets: [
        target('crvo_fundus', 'flame', 'Flame haemorrhages (peripapillary)', SYN.flame, circ(0.82, 0.7, 0.12)),
        target('crvo_fundus', 'dotblot', 'Dot/blot haemorrhages (all quadrants)', SYN.dotBlot, circ(0.13, 0.42, 0.14)),
        target('crvo_fundus', 'vein', 'Dilated, tortuous veins', ['dilated vein', 'tortuous vein', 'venous dilation', 'venous tortuosity', 'engorged vein', 'tortuous', 'dilated', 'vein'], circ(0.55, 0.17, 0.1)),
        target('crvo_fundus', 'disc', 'Optic disc swelling', [...SYN.discSwelling, 'disc'], circ(0.74, 0.53, 0.07)),
        target('crvo_fundus', 'cws', 'Cotton wool spot', SYN.cws, circ(0.485, 0.275, 0.05), {isBonus: true}),
      ],
      outOf: 4,
      model: '“Blood and thunder”: widespread flame-shaped haemorrhages around the disc and dot/blot haemorrhages extending to the periphery in all four quadrants, dilated tortuous veins, optic disc swelling and cotton wool spots — features of ischaemic CRVO.',
    },
  ],
  finalDx: text(
    'final',
    'Final diagnosis — and is it ischaemic or non-ischaemic? Justify.',
    [
      kw2('Central retinal vein occlusion', 'central retinal vein occlusion', 'CRVO'),
      kw2('Ischaemic', 'ischaemic', 'non perfused'),
      kw('VA worse than 6/60', '6/60', 'counting fingers', 'CF', 'poor vision'),
      kw('Marked RAPD', 'RAPD'),
      kw('Extensive haemorrhages / CWS', 'cotton wool', 'extensive haemorrhage', 'blood and thunder'),
    ],
    'Right ischaemic CRVO: VA CF (worse than 6/60), marked RAPD, extensive confluent haemorrhages in all four quadrants with CWS (blood-and-thunder); FFA would show >10 DD capillary non-perfusion; ERG b-wave reduced.',
    {outOf: 5},
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology of retinal vein occlusion (include Virchow’s triad).',
    [
      kw('Artery and vein share an adventitial sheath (AV crossing / lamina cribrosa)', 'adventitial sheath', 'shared sheath', 'common sheath', 'lamina cribrosa'),
      kw('Arteriosclerosis compresses the vein', 'arteriosclerosis', 'atherosclerosis', 'compress', 'rigid artery'),
      kw('Turbulent flow / stasis and endothelial damage', 'turbulent', 'stasis', 'endothelial'),
      kw('Virchow’s triad → thrombus', 'virchow', 'thrombus', 'thrombosis', 'hypercoagulab'),
      kw('Raised venous/capillary pressure → haemorrhage & oedema (BRB breakdown)', 'hydrostatic', 'venous pressure', 'blood retina barrier', 'haemorrhage', 'leak'),
      kw('Ischaemia → VEGF → neovascularisation / macular oedema', 'VEGF', 'neovascular', 'macular oedema', 'ischaemia'),
    ],
    'Arteries and veins share an adventitial sheath at AV crossings (BRVO) and within the lamina cribrosa (CRVO). Arteriosclerosis (hypertension, age, diabetes, smoking) stiffens the artery, which compresses the vein → turbulent flow, stasis and endothelial damage; with hypercoagulability this satisfies Virchow’s triad and a thrombus forms. Venous outflow obstruction raises intravascular/hydrostatic pressure → BRB breakdown, haemorrhages and oedema; capillary non-perfusion → ischaemia → VEGF → macular oedema and neovascularisation (NVI → neovascular glaucoma, “90-day glaucoma”).',
    {outOf: 5},
  ),
  pool: [
    early(
      mcq(
        'iop',
        'Which ocular condition is a recognised local risk factor for CRVO?',
        ['Keratoconus', 'Primary open-angle glaucoma / raised IOP', 'Pinguecula', 'Blepharitis'],
        1,
        'Raised IOP/glaucoma compresses the CRV at the lamina cribrosa — always check IOP and gonioscopy in RVO.',
      ),
    ),
    late(
      text(
        'complications',
        'What complications must be monitored for, and how?',
        [
          kw2('Neovascularisation of iris/angle → neovascular glaucoma (90-day glaucoma)', 'neovascular glaucoma', 'rubeosis', 'NVI', 'NVA', '90 day'),
          kw('Gonioscopy and undilated iris exam', 'gonioscopy', 'undilated'),
          kw('Macular oedema (OCT)', 'macular oedema', 'OCT'),
          kw('NVD/NVE and vitreous haemorrhage', 'NVD', 'NVE', 'vitreous haemorrhage'),
          kw('Monthly review for first 3 months', 'monthly', '3 months', 'three months'),
        ],
        'Ischaemic CRVO: ~60% develop rubeosis/neovascular glaucoma (classically ~90 days) — undilated iris exam and gonioscopy monthly for at least 3 months; OCT for macular oedema (anti-VEGF); NVD/NVE and vitreous haemorrhage (PRP). Non-ischaemic CRVO can convert (1/3–1/2).',
        {outOf: 4},
      ),
    ),
    late(
      text(
        'mgmt',
        'Referral and systemic management?',
        [
          kw('Same-day/urgent ophthalmology referral (ischaemic CRVO)', 'urgent', 'same day', 'ophthalmolog'),
          kw('GP: BP, glucose/HbA1c, lipids', 'blood pressure', 'HbA1c', 'glucose', 'lipid', 'cholesterol', 'GP'),
          kw('Treat IOP', 'IOP', 'pressure lowering'),
          kw('Anti-VEGF for macular oedema; PRP for neovascularisation', 'anti VEGF', 'PRP', 'panretinal'),
          kw('Thrombophilia screen if young', 'thrombophilia', 'young', 'hypercoagulab'),
        ],
        'Ischaemic CRVO → same-day ophthalmology referral; GP to optimise BP (<140/90), glucose, lipids, stop smoking; lower IOP; anti-VEGF for macular oedema; PRP if neovascularisation; thrombophilia/vasculitis screen in patients <50.',
        {outOf: 3},
      ),
    ),
  ],
};

// =============================================================================
// Week 2 — CRAO
// =============================================================================

export const crao: Case = {
  id: 'crao',
  week: 2,
  topic: 'Retinal vascular disease',
  diagnosis: 'Central retinal artery occlusion (embolic) — ocular stroke',
  difficulty: 1,
  source: 'Lecture 2 — retinal artery occlusion',
  patient: {
    id: 'PX-2051',
    name: 'Doreen Pike',
    age: 74,
    sex: 'F',
    background: 'Caucasian',
    complaint: '“The vision in my left eye just switched off about an hour ago.”',
    summary: 'Sudden, profound, painless loss of vision LE one hour ago while reading.',
    history: ['Painless, persistent, monocular.', 'Two episodes of transient blackouts LE in the last month, each lasting minutes.', 'No headache, jaw claudication or scalp tenderness.'],
    medicalHistory: ['Atrial fibrillation', 'Hypertension', 'Carotid bruit noted by GP'],
    medications: ['Perindopril', 'Apixaban (missed doses recently)'],
    familyHistory: ['Sister: stroke at 70'],
  },
  exam: [
    {label: 'VA', value: 'R 6/7.5  L hand movements'},
    {label: 'Pupils', value: 'Marked LE RAPD'},
    {label: 'IOP', value: 'R 15  L 14 mmHg'},
    {label: 'BP', value: '158/92 mmHg, irregular pulse'},
  ],
  scans: [
    scan('crao_fundus', 'Colour fundus', 'LE'),
    scan('crao_disc_embolus', 'Optic disc', 'LE', 'Disc close-up'),
    scan('crao_emboli', 'Colour fundus', 'LE', 'Mid-periphery, inferior arcade'),
  ],
  ddx: text(
    'ddx',
    'Sudden profound painless monocular vision loss. Differential diagnoses?',
    [
      kw2('CRAO', 'central retinal artery occlusion', 'CRAO', 'artery occlusion'),
      kw('Giant cell arteritis / AAION', 'giant cell', 'GCA', 'arteritic'),
      kw('CRVO', 'vein occlusion', 'CRVO'),
      kw('NAION', 'NAION', 'ischaemic optic neuropathy'),
      kw('Ophthalmic artery occlusion / OIS', 'ophthalmic artery', 'ocular ischaemic'),
      kw('Vitreous haemorrhage / RD', 'vitreous haemorrhage', 'retinal detachment'),
    ],
    'CRAO (embolic — AF, carotid disease, preceding amaurosis fugax); arteritic CRAO/AAION from GCA (must exclude); CRVO; NAION; ophthalmic artery occlusion/OIS; vitreous haemorrhage; RD.',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'crao-fundus',
      prompt: 'LE posterior pole. Label the classic signs of CRAO.',
      scanIds: ['crao_fundus'],
      targets: [
        target('crao_fundus', 'cherry', 'Cherry-red spot', ['cherry red spot', 'cherry red', 'cherry'], circ(0.54, 0.57, 0.06), {points: 2}),
        target('crao_fundus', 'pale', 'Pale, oedematous (ground-glass) retina', ['pale retina', 'retinal whitening', 'whitening', 'ground glass', 'oedema', 'cloudy', 'opacification', 'ischaemic retina'], circ(0.38, 0.4, 0.22)),
        target('crao_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.11, 0.48, 0.07)),
        target('crao_fundus', 'artery', 'Attenuated arterioles', ['attenuated arteriole', 'attenuation', 'narrow arteriole', 'thin artery', 'box carring', 'cattle trucking', 'segmentation', 'arteriole'], circ(0.25, 0.2, 0.1), {isBonus: true}),
      ],
      outOf: 4,
      model: 'Diffuse pale, cloudy (ground-glass) retina of the posterior pole from inner-retinal intracellular oedema; cherry-red spot at the fovea (thin, no ganglion cells — choroid shows through); attenuated arterioles ± box-carring.',
    },
    {
      type: 'annotate',
      id: 'crao-emboli',
      prompt: 'Disc close-up and inferior arcade. Identify the cause of the occlusion.',
      scanIds: ['crao_disc_embolus', 'crao_emboli'],
      targets: [
        target('crao_disc_embolus', 'plaque', 'Hollenhorst plaque at the disc', ['hollenhorst', 'embolus', 'emboli', 'cholesterol', 'plaque'], circ(0.44, 0.62, 0.07), {points: 2}),
        target('crao_emboli', 'plaques', 'Hollenhorst plaques along the arteriole', ['hollenhorst', 'embolus', 'emboli', 'cholesterol', 'plaque'], circ(0.55, 0.45, 0.25), {points: 2}),
      ],
      model: 'Bright, refractile orange-yellow cholesterol emboli (Hollenhorst plaques) at the disc and lodged along arteriolar bifurcations — from carotid atheroma.',
    },
  ],
  finalDx: text(
    'final',
    'Final diagnosis?',
    [
      kw2('Central retinal artery occlusion', 'central retinal artery occlusion', 'CRAO'),
      kw('Embolic (Hollenhorst / carotid / AF)', 'embolic', 'embolus', 'hollenhorst', 'carotid', 'atrial fibrillation'),
      kw('Left eye', 'left', 'LE'),
    ],
    'Left embolic central retinal artery occlusion (Hollenhorst plaques; AF and carotid disease) — an ocular stroke, preceded by amaurosis fugax.',
  ),
  pathophysiology: text(
    'patho',
    'Explain why a cherry-red spot forms, and the pathophysiology of CRAO.',
    [
      kw('Embolus/thrombus blocks the CRA (or GCA)', 'embolus', 'thrombus', 'blocks', 'occlusion'),
      kw('Inner retina loses blood supply → hypoxia', 'inner retina', 'hypoxia', 'ischaemia'),
      kw('Intracellular oedema / necrosis of ganglion cells & NFL → white retina', 'intracellular oedema', 'ganglion cell', 'nerve fibre', 'necrosis'),
      kw('Fovea is thin with no ganglion cells', 'no ganglion', 'thin', 'devoid'),
      kw('Choroidal circulation (short posterior ciliary) shows through', 'choroid', 'ciliary', 'shows through'),
      kw('Irreversible damage after ~90–100 min', '90 min', '100 min', 'irreversible', 'minutes'),
    ],
    'An embolus (Hollenhorst/platelet-fibrin/calcific) or thrombus — or GCA vasculitis — blocks the CRA, halting supply to the inner retina. Acute hypoxia causes intracellular oedema and necrosis of ganglion cells and the NFL → opaque white retina; irreversible damage within ~90–240 min. The fovea is thin and devoid of ganglion cells, so it does not opacify; the intact choroidal circulation (short posterior ciliary arteries) shows through → cherry-red spot. Later: arterioles stay attenuated, optic atrophy.',
    {outOf: 5},
  ),
  pool: [
    early(
      text(
        'gca',
        'Which questions and tests exclude giant cell arteritis, and why does it matter?',
        [
          kw('Jaw claudication', 'jaw'),
          kw('Scalp/temporal tenderness, headache', 'scalp', 'temporal', 'headache'),
          kw('Malaise, weight loss, fever, PMR', 'weight loss', 'malaise', 'fever', 'polymyalgia', 'shoulder'),
          kw('ESR, CRP, platelets', 'ESR', 'CRP', 'platelet'),
          kw('Fellow eye at risk → urgent steroids', 'steroid', 'fellow eye', 'other eye'),
        ],
        'Ask about jaw claudication, scalp/temporal tenderness, new headache, malaise/weight loss/fever, polymyalgia symptoms. Urgent ESR, CRP and platelets. Arteritic CRAO needs immediate high-dose corticosteroids to protect the fellow eye.',
        {outOf: 3},
      ),
    ),
    late(
      text(
        'mgmt',
        'What is your immediate management?',
        [
          kw2('Emergency — send to ED / stroke unit now', 'emergency', 'ED', 'stroke', 'immediate', 'same day'),
          kw('Stroke work-up: carotid duplex, echo/ECG, brain imaging', 'carotid', 'echocardiogram', 'ECG', 'MRI', 'CT'),
          kw('Exclude GCA (ESR/CRP)', 'ESR', 'CRP', 'GCA'),
          kw('Risk factor control (AF anticoagulation, BP, lipids)', 'anticoagul', 'blood pressure', 'lipid', 'atrial fibrillation'),
        ],
        'CRAO is an acute stroke equivalent: immediate referral to ED/stroke unit (possible thrombolysis within the time window), stroke work-up (MRI, carotid duplex, echo/ECG for AF), ESR/CRP to exclude GCA, and secondary prevention (anticoagulation adherence, BP, lipids). Ophthalmology follow-up for neovascularisation.',
        {outOf: 3},
      ),
    ),
  ],
};
