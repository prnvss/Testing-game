import type {Case} from '../types';
import {box, circ, early, kw, kw2, late, mcq, scan, SYN, target, text} from '../helpers';

// =============================================================================
// Week 6 — Tutorial 6: Retinitis pigmentosa
// =============================================================================

export const rp: Case = {
  id: 'rp',
  week: 6,
  topic: 'Inherited retinal dystrophies',
  diagnosis: 'Retinitis pigmentosa (rod–cone dystrophy)',
  difficulty: 2,
  source: 'Tutorial 6 — “I am having trouble driving at night”',
  patient: {
    id: 'PX-6003',
    name: 'Emily Cooper',
    age: 24,
    sex: 'F',
    occupation: 'Graphic designer',
    complaint: '“I’m having increasing difficulty seeing at night.”',
    summary: 'Progressive night blindness over 3–4 years, always slow to dark-adapt; recently bumping into door frames.',
    history: [
      '“The room goes dark for me way before it does for everyone else” — cinema, getting up at night.',
      'Worse over the last 3–4 years; slower than friends to adjust even as a teenager.',
      'Same in both eyes. Clipped door frames and missed a step last month.',
      'No flashes, floaters or patches of missing vision.',
    ],
    medicalHistory: ['Unremarkable'],
    medications: ['Nil'],
    ocularHistory: ['Mild myopia'],
    familyHistory: [
      'Younger brother: night vision problems (worse than hers).',
      'Maternal uncle: blind by his 40s.',
      'Parents see fine. No hearing or kidney problems in the family.',
    ],
  },
  exam: [
    {label: 'VA', value: 'R 6/6  L 6/6 (PH 6/6)'},
    {label: 'Refraction', value: '−0.75 DS OU'},
    {label: 'Amsler', value: 'Normal'},
    {label: 'Pupils', value: 'No RAPD'},
    {label: 'Anterior segment', value: 'Clear and quiet'},
    {label: 'ERG', value: 'Scotopic: severely reduced amplitude, delayed. Photopic: mildly reduced. 30 Hz flicker: preserved, mildly reduced.'},
  ],
  scans: [
    scan('rp_fundus', 'Colour fundus', 'RE', 'Representative fundus'),
    scan('rp_faf', 'FAF', 'RE', 'Widefield autofluorescence'),
    scan('rp_vf', 'Visual field', 'LE', 'HFA 24-2'),
  ],
  ddx: text(
    'ddx',
    'What are your differential diagnoses for night blindness (nyctalopia) in a 24-year-old?',
    [
      kw2('Retinitis pigmentosa', 'retinitis pigmentosa', 'RP', 'rod cone dystrophy'),
      kw('Congenital stationary night blindness', 'congenital stationary', 'CSNB'),
      kw('Vitamin A deficiency', 'vitamin a'),
      kw('Choroideremia / gyrate atrophy', 'choroideremia', 'gyrate'),
      kw('Uncorrected myopia / refractive (pseudo-nyctalopia)', 'myopia', 'refractive', 'pseudo'),
      kw('Cataract', 'cataract'),
      kw('Fundus albipunctatus / Oguchi', 'albipunctatus', 'oguchi'),
      kw('Drug-induced / CAR', 'drug', 'thioridazine', 'chloroquine', 'cancer associated'),
    ],
    'True progressive: retinitis pigmentosa, choroideremia, gyrate atrophy. True stationary: CSNB, fundus albipunctatus, Oguchi disease. Pseudo-nyctalopia: uncorrected (high) myopia, cataract, visual pathway lesions. Acquired: vitamin A deficiency (malabsorption/bariatric surgery), drug toxicity, CAR/MAR, glaucoma, RD.',
    {outOf: 5},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'rp-fundus',
      prompt: 'Representative RP fundus. Label the classic triad.',
      scanIds: ['rp_fundus'],
      targets: [
        target('rp_fundus', 'spicules', 'Bone-spicule pigmentation (mid-periphery)', ['bone spicule', 'bone spicules', 'pigment', 'pigmentation', 'RPE migration', 'pigment clumping', 'hyperpigmentation'], box(0.04, 0.05, 0.33, 0.95), {points: 2}),
        target('rp_fundus', 'disc', 'Waxy disc pallor', ['waxy pallor', 'waxy disc', 'pallor', 'pale disc', 'optic atrophy', 'disc'], circ(0.75, 0.46, 0.07), {points: 2}),
        target('rp_fundus', 'vessels', 'Arteriolar attenuation', ['attenuated', 'attenuation', 'narrow arteriole', 'thin vessel', 'vessel attenuation', 'arteriolar narrowing'], circ(0.58, 0.3, 0.12)),
      ],
      model: 'Classic triad: mid-peripheral bone-spicule intraretinal pigment migration, arteriolar attenuation and waxy optic disc pallor; ± CMO, ERM, posterior subcapsular cataract.',
    },
    {
      type: 'annotate',
      id: 'rp-faf-vf',
      prompt: 'FAF and visual field. Label the FAF ring and the field defect.',
      scanIds: ['rp_faf', 'rp_vf'],
      targets: [
        target('rp_faf', 'ring', 'Hyperautofluorescent parafoveal ring', ['hyperautofluorescent ring', 'ring', 'robson holder', 'hyperautofluorescence', 'hyper AF ring', 'bright ring'], circ(0.42, 0.58, 0.2), {points: 2}),
        target('rp_faf', 'hypo', 'Mid-peripheral hypoautofluorescence (RPE loss)', ['hypoautofluorescence', 'hypoautofluorescent', 'atrophy', 'RPE loss', 'mottled', 'dark'], circ(0.85, 0.65, 0.15)),
        target('rp_vf', 'ring', 'Ring (annular) scotoma', ['ring scotoma', 'annular scotoma', 'mid peripheral', 'constriction', 'ring', 'annular', 'tunnel'], box(0.54, 0.16, 0.9, 0.48), {points: 2}),
      ],
      model: 'FAF: hyperautofluorescent parafoveal ring marking the edge of preserved photoreceptors, with mottled hypoautofluorescence peripherally (RPE/photoreceptor loss). VF: mid-peripheral ring scotoma with central sparing, progressing to tunnel vision.',
    },
  ],
  finalDx: text(
    'final',
    'What is the diagnosis? Which inheritance pattern fits Emily’s family history best, and what does the ERG show?',
    [
      kw2('Retinitis pigmentosa (rod–cone dystrophy)', 'retinitis pigmentosa', 'rod cone', 'RP'),
      kw('ERG: rods affected earlier/more than cones', 'rod', 'scotopic'),
      kw('Autosomal dominant with reduced penetrance (mum)', 'autosomal dominant', 'reduced penetrance', 'dominant'),
      kw('Genetic counselling / gene panel', 'genetic', 'gene panel', 'counselling'),
    ],
    'Retinitis pigmentosa (non-syndromic rod–cone dystrophy): rod responses severely reduced and delayed, cones mildly reduced. Pedigree (affected female + brother + maternal uncle, unaffected parents) fits AD with reduced penetrance in mum better than AR (requires dad to be a carrier) or XLR (affected female). Pedigree alone can’t confirm — refer for genetic counselling and a retinal dystrophy gene panel.',
    {outOf: 4},
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology of RP and link it to the signs.',
    [
      kw('Genetic mutation (e.g. RHO) → rod/RPE dysfunction', 'mutation', 'rhodopsin', 'RHO', 'gene'),
      kw('Rod apoptosis → nyctalopia & peripheral field loss', 'rod', 'apoptosis', 'night blindness', 'peripheral'),
      kw('RPE migration / hyperplasia → bone spicules', 'bone spicule', 'RPE migrat', 'hyperplasia'),
      kw('Reduced oxygen demand → vessel attenuation', 'oxygen', 'attenuat'),
      kw('Glial proliferation → waxy pallor', 'glial', 'pallor'),
      kw('BRB compromise → CMO', 'macular oedema', 'CMO', 'blood retina'),
      kw('Secondary cone death → central vision loss', 'cone', 'central vision'),
    ],
    '1) Mutations (e.g. RHO in adRP; USH2A, RPGR) alter rhodopsin, phototransduction, visual-cycle or ciliary proteins → 2) rod/RPE dysfunction → 3) rod apoptosis: nyctalopia and mid-peripheral field loss. 4) Rod death triggers RPE migration into the retina around vessels (bone spicules), glial proliferation (waxy disc pallor), reduced retinal O₂ consumption (arteriolar attenuation), BRB compromise (CMO). 5) Remodelling and loss of rod-derived cone viability factor → secondary cone apoptosis and eventual central vision loss.',
    {outOf: 5},
  ),
  pool: [
    early(
      text(
        'tests',
        'What tests do you want to do today, and why?',
        [
          kw('Visual fields (full threshold / Goldmann)', 'visual field', 'goldmann', 'perimetry'),
          kw('Dilated fundus exam', 'dilated', 'fundus'),
          kw('FAF', 'autofluorescence', 'FAF'),
          kw('OCT (EZ loss, CMO)', 'OCT', 'ellipsoid'),
          kw('ERG (full-field)', 'ERG', 'electroretinogram'),
          kw('Dark adaptometry / colour vision', 'dark adapt', 'colour vision'),
        ],
        'VA and refraction, colour vision, visual fields (mid-peripheral loss), dilated fundus exam, FAF (hyperAF ring), OCT (EZ loss, CMO, ERM), full-field ERG (rod > cone reduction), dark adaptometry; referral for genetic testing.',
        {outOf: 4},
      ),
    ),
    late(
      text(
        'syndromic',
        'Name syndromic forms of RP and their key systemic features.',
        [
          kw('Usher syndrome — deafness', 'usher', 'deaf'),
          kw('Bardet–Biedl — polydactyly, obesity, renal', 'bardet', 'polydactyly'),
          kw('Refsum — phytanic acid, ichthyosis', 'refsum', 'phytanic', 'ichthyosis'),
          kw('Kearns–Sayre — CPEO, ptosis, heart block', 'kearns', 'ophthalmoplegia', 'ptosis'),
          kw('Bassen–Kornzweig — abetalipoproteinaemia', 'bassen', 'abetalipoprotein', 'acanthocyt'),
        ],
        'Usher (AR; sensorineural deafness), Bardet–Biedl (polydactyly, obesity, renal disease, learning difficulty), Refsum (phytanic acid; ichthyosis, neuropathy — low-phytanic diet), Kearns–Sayre (mitochondrial; CPEO, ptosis, heart block), Bassen–Kornzweig (abetalipoproteinaemia; fat-soluble vitamin malabsorption, acanthocytosis — vitamin A/E).',
        {outOf: 3},
      ),
    ),
    late(
      mcq(
        'xl',
        'Which inheritance pattern of RP has the most severe prognosis?',
        ['Autosomal dominant', 'Autosomal recessive', 'X-linked recessive', 'Digenic'],
        2,
        'X-linked RP is rarest but most severe (blindness often before 40). AD has the best prognosis; AR is most common.',
      ),
    ),
    late(
      text(
        'mgmt',
        'Management and advice for Emily?',
        [
          kw('Genetic counselling and testing', 'genetic'),
          kw('Driving / night driving advice, VF for licensing', 'driving', 'licen'),
          kw('Low vision aids / orientation & mobility', 'low vision', 'mobility', 'aid'),
          kw('Treat complications (CMO, cataract)', 'CMO', 'cataract', 'carbonic anhydrase'),
          kw('Gene therapy (voretigene for RPE65)', 'gene therapy', 'voretigene', 'RPE65', 'luxturna'),
          kw('UV protection / sunglasses', 'sunglass', 'UV', 'tint'),
        ],
        'Genetic counselling and panel testing (family planning, eligibility for trials/voretigene for RPE65); driving advice and formal fields for licensing; low-vision services, orientation & mobility, lighting; tinted/UV-protective lenses; monitor and treat CMO (topical/oral CAIs) and cataract; annual review.',
        {outOf: 3},
      ),
    ),
  ],
};

// =============================================================================
// Week 6 — Stargardt disease
// =============================================================================

export const stargardt: Case = {
  id: 'stgd',
  week: 6,
  topic: 'Inherited retinal dystrophies',
  diagnosis: 'Stargardt disease (ABCA4, STGD1)',
  difficulty: 2,
  source: 'Tutorial 6 practice images — Stargardt / fundus flavimaculatus',
  patient: {
    id: 'PX-6019',
    name: 'Liam Ferreira',
    age: 17,
    sex: 'M',
    occupation: 'Year 12 student',
    complaint: '“I can’t read the board anymore, even with my glasses.”',
    summary: 'Gradual central vision loss in both eyes over 18 months; struggles with faces and print.',
    history: ['Bilateral, symmetric, gradual central blur.', 'Colours look duller; slow to adjust from bright sunlight to indoors.', 'Peripheral vision fine. No night blindness.'],
    medicalHistory: ['Nil'],
    medications: ['Nil'],
    ocularHistory: ['Glasses updated twice this year with little improvement'],
    familyHistory: ['Parents unaffected (first cousins). Older sister similar symptoms.'],
  },
  exam: [
    {label: 'VA', value: 'R 6/30  L 6/36 — no improvement with refraction'},
    {label: 'Colour vision', value: 'Mild red-green errors OU'},
    {label: 'Pupils', value: 'No RAPD'},
    {label: 'Central 10-2', value: 'Bilateral central scotomas'},
  ],
  scans: [scan('stgd_fundus', 'Colour fundus', 'RE'), scan('stgd_faf', 'FAF', 'LE')],
  ddx: text(
    'ddx',
    'Bilateral progressive central vision loss in a teenager. Differentials?',
    [
      kw2('Stargardt disease', 'stargardt', 'fundus flavimaculatus', 'ABCA4'),
      kw('Cone / cone–rod dystrophy', 'cone dystrophy', 'cone rod'),
      kw('Best vitelliform dystrophy', 'best', 'vitelliform'),
      kw('Drug toxicity (hydroxychloroquine)', 'hydroxychloroquine', 'chloroquine', 'toxic'),
      kw('X-linked retinoschisis', 'retinoschisis'),
      kw('Optic neuropathy (LHON) / functional', 'LHON', 'leber', 'optic neuropathy', 'functional'),
    ],
    'Stargardt disease (most common inherited macular dystrophy, commonest cause of central loss <50), cone/cone–rod dystrophy, Best disease, X-linked retinoschisis, drug toxicity (bull’s-eye), LHON/optic neuropathy, functional loss.',
    {outOf: 4},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'stgd-fundus',
      prompt: 'RE fundus. Label the flecks and the macular change.',
      scanIds: ['stgd_fundus'],
      targets: [
        target('stgd_fundus', 'flecks', 'Yellow-white pisciform flecks', ['fleck', 'flecks', 'pisciform', 'lipofuscin', 'yellow white', 'deposits'], circ(0.3, 0.4, 0.15), {points: 2}),
        target('stgd_fundus', 'macula', 'Macular atrophy / beaten-bronze change', ['atrophy', 'macular atrophy', 'beaten bronze', 'bull’s eye', 'bulls eye', 'mottling', 'macula'], circ(0.55, 0.47, 0.07)),
        target('stgd_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.87, 0.43, 0.07), {isBonus: true}),
      ],
      outOf: 3,
      model: 'Yellow-white pisciform (fish-shaped) flecks at the RPE level across the posterior pole with central macular atrophy (beaten-bronze appearance).',
    },
    {
      type: 'annotate',
      id: 'stgd-faf',
      prompt: 'LE FAF. Label the hyper- and hypoautofluorescent features.',
      scanIds: ['stgd_faf'],
      targets: [
        target('stgd_faf', 'hyper', 'Hyperautofluorescent flecks', ['hyperautofluorescent', 'hyperautofluorescence', 'fleck', 'flecks', 'bright'], circ(0.33, 0.35, 0.14), {points: 2}),
        target('stgd_faf', 'hypo', 'Hypoautofluorescent macular atrophy', ['hypoautofluorescent', 'hypoautofluorescence', 'atrophy', 'dark', 'RPE loss'], circ(0.65, 0.55, 0.12), {points: 2}),
      ],
      model: 'Scattered hyperautofluorescent flecks (lipofuscin) with confluent central hypoautofluorescence from RPE atrophy; peripapillary sparing is characteristic.',
    },
  ],
  finalDx: text(
    'final',
    'Diagnosis and inheritance?',
    [
      kw2('Stargardt disease', 'stargardt', 'STGD1', 'fundus flavimaculatus'),
      kw('ABCA4', 'ABCA4'),
      kw('Autosomal recessive', 'autosomal recessive', 'recessive'),
    ],
    'Stargardt disease (STGD1) — autosomal recessive ABCA4 mutation (consanguineous parents, affected sibling).',
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology of Stargardt disease.',
    [
      kw('ABCA4 transporter defect in rod outer segment discs', 'ABCA4', 'transporter', 'outer segment'),
      kw('Failure to clear all-trans-retinal → bisretinoids (A2E)', 'retinal', 'A2E', 'bisretinoid', 'visual cycle'),
      kw('Lipofuscin accumulates in RPE', 'lipofuscin'),
      kw('RPE toxicity/atrophy → photoreceptor death', 'RPE atrophy', 'RPE death', 'toxic', 'photoreceptor'),
      kw('Dark choroid on FFA (RPE masking)', 'dark choroid', 'mask'),
    ],
    'Mutations in ABCA4 (a flippase in photoreceptor outer-segment discs) impair clearance of N-retinylidene-PE/all-trans-retinal from the visual cycle → toxic bisretinoids (A2E) are phagocytosed by the RPE and accumulate as lipofuscin (flecks, hyperAF; “dark choroid” on FFA as the lipofuscin masks background fluorescence). RPE dysfunction and death cause overlying photoreceptor loss → macular atrophy and central scotoma.',
    {outOf: 4},
  ),
  pool: [
    late(
      mcq(
        'best-test',
        'What is the best test to support the diagnosis early?',
        ['Gonioscopy', 'Fundus autofluorescence', 'Corneal topography', 'Colour vision alone'],
        1,
        'FAF shows hyperautofluorescent flecks and macular hypoautofluorescence early; FFA dark choroid, ERG/genetic testing confirm.',
      ),
    ),
    late(
      text(
        'advice',
        'What lifestyle advice is specific to Stargardt?',
        [
          kw2('Avoid vitamin A supplements', 'vitamin a', 'AREDS', 'beta carotene'),
          kw('UV/blue light protection, sunglasses', 'sunglass', 'UV', 'tint', 'light'),
          kw('Low vision support', 'low vision', 'magnif'),
          kw('Genetic counselling', 'genetic'),
        ],
        'Avoid vitamin A supplementation (accelerates bisretinoid formation — so no AREDS-type supplements containing beta-carotene), wear UV/blue-light-filtering sunglasses, low-vision aids and school support, genetic counselling and clinical-trial registration; don’t smoke.',
        {outOf: 3},
      ),
    ),
  ],
};

// =============================================================================
// Week 6 — Best vitelliform macular dystrophy
// =============================================================================

export const best: Case = {
  id: 'best',
  week: 6,
  topic: 'Inherited retinal dystrophies',
  diagnosis: 'Best vitelliform macular dystrophy (BEST1, vitelliform stage)',
  difficulty: 2,
  source: 'Tutorial 6 — Best disease',
  patient: {
    id: 'PX-6025',
    name: 'Chloe Tan',
    age: 12,
    sex: 'F',
    complaint: 'Referred after failing a school vision screening — no symptoms.',
    summary: 'Asymptomatic child; RE 6/9 at school screening.',
    history: ['No complaints; reads comfortably.', 'Mild blur RE only when covering the LE.'],
    medicalHistory: ['Nil'],
    medications: ['Nil'],
    familyHistory: ['Father: “central scar” in one eye diagnosed in his 30s; paternal grandmother poor central vision.'],
  },
  exam: [
    {label: 'VA', value: 'R 6/9  L 6/6'},
    {label: 'Refraction', value: '+1.50 DS OU'},
    {label: 'Pupils', value: 'No RAPD'},
    {label: 'EOG (Arden ratio)', value: 'R 1.2  L 1.3 (reduced)'},
    {label: 'Full-field ERG', value: 'Normal'},
  ],
  scans: [scan('best_fundus', 'Colour fundus', 'RE'), scan('best_oct', 'OCT', 'RE')],
  ddx: text(
    'ddx',
    'A yellow central macular lesion in an asymptomatic child. Differentials?',
    [
      kw2('Best vitelliform macular dystrophy', 'best', 'vitelliform'),
      kw('Adult-onset foveomacular vitelliform dystrophy', 'adult onset', 'foveomacular', 'pattern dystrophy'),
      kw('Stargardt disease', 'stargardt'),
      kw('CSCR', 'central serous'),
      kw('Toxoplasmosis scar / coloboma', 'toxoplasm', 'scar', 'coloboma'),
      kw('CNV', 'CNV', 'MNV', 'neovascular'),
    ],
    'Best vitelliform macular dystrophy, adult-onset foveomacular vitelliform (pattern) dystrophy, Stargardt disease, CSCR with fibrin, macular scar (toxoplasmosis), coloboma, CNV.',
    {outOf: 3},
  ),
  annotate: [
    {
      type: 'annotate',
      id: 'best-imaging',
      prompt: 'RE fundus and OCT. Label the lesion on both.',
      scanIds: ['best_fundus', 'best_oct'],
      targets: [
        target('best_fundus', 'yolk', 'Vitelliform “egg-yolk” lesion', ['vitelliform', 'egg yolk', 'yolk', 'yellow lesion', 'lipofuscin', 'sunny side up'], circ(0.49, 0.5, 0.15), {points: 2}),
        target('best_oct', 'material', 'Subretinal vitelliform material / fluid', ['subretinal', 'vitelliform material', 'hyperreflective material', 'fluid', 'lesion', 'SRF', 'material'], box(0.3, 0.22, 0.62, 0.66), {points: 2}),
        target('best_fundus', 'disc', 'Optic disc', SYN.disc, circ(0.93, 0.45, 0.07), {isBonus: true}),
      ],
      outOf: 4,
      model: 'Fundus: round, yellow, “sunny-side-up egg-yolk” lesion ½–2 DD at the fovea. OCT: dome-shaped subretinal accumulation of material/fluid between the photoreceptors and RPE.',
    },
  ],
  finalDx: text(
    'final',
    'Diagnosis, stage, gene and inheritance?',
    [
      kw2('Best vitelliform macular dystrophy', 'best', 'vitelliform macular dystrophy'),
      kw('Vitelliform stage', 'vitelliform stage', 'egg yolk', 'stage 2'),
      kw('BEST1 (bestrophin)', 'BEST1', 'bestrophin', 'VMD2'),
      kw('Autosomal dominant', 'autosomal dominant', 'dominant'),
    ],
    'Best vitelliform macular dystrophy, vitelliform stage — autosomal dominant BEST1 (bestrophin) mutation, variable penetrance/expressivity (father affected).',
    {outOf: 4},
  ),
  pathophysiology: text(
    'patho',
    'Explain the pathophysiology and why the EOG is abnormal while the ERG is normal.',
    [
      kw('BEST1 encodes bestrophin, a Ca²⁺-activated Cl⁻ channel on the basolateral RPE', 'bestrophin', 'chloride', 'ion channel', 'basolateral'),
      kw('Impaired RPE fluid/ion transport', 'fluid transport', 'ion transport', 'RPE dysfunction'),
      kw('Lipofuscin/debris accumulates in subretinal space', 'lipofuscin', 'accumulat', 'debris', 'subretinal'),
      kw('EOG light rise generated by RPE → reduced Arden ratio', 'light rise', 'arden', 'EOG'),
      kw('Photoreceptors normal → ERG normal', 'ERG normal', 'photoreceptors', 'normal ERG'),
      kw('Progression: pseudohypopyon → vitelliruptive → atrophic/CNV', 'pseudohypopyon', 'vitelliruptive', 'atrophic', 'CNV'),
    ],
    'BEST1 encodes bestrophin, a calcium-activated chloride channel on the RPE basolateral membrane. Dysfunction impairs RPE ion/fluid transport and photoreceptor–RPE interaction → lipofuscin-rich outer-segment debris accumulates in the subretinal space (vitelliform lesion). The EOG light rise is generated by RPE basolateral chloride conductance → reduced Arden ratio (<1.5) even pre-vitelliform, while photoreceptors work normally (normal ERG). Stages: previtelliform → vitelliform → pseudohypopyon → vitelliruptive (scrambled egg) → atrophic ± CNV/scarring.',
    {outOf: 5},
  ),
  pool: [
    late(
      mcq(
        'eog',
        'Which test is diagnostic even before a lesion is visible?',
        ['Full-field ERG', 'EOG — Arden ratio < 1.5', 'Ishihara', 'Gonioscopy'],
        1,
        'EOG is abnormal (Arden ratio <1.5) in all stages of Best disease, including carriers with a normal fundus.',
      ),
    ),
    late(
      text(
        'stages',
        'List the stages of Best disease in order.',
        [
          kw('Previtelliform', 'previtelliform', 'pre vitelliform'),
          kw('Vitelliform', 'vitelliform'),
          kw('Pseudohypopyon', 'pseudohypopyon'),
          kw('Vitelliruptive (scrambled egg)', 'vitelliruptive', 'scrambled'),
          kw('Atrophic ± CNV', 'atrophic', 'atrophy', 'CNV'),
        ],
        'Previtelliform (abnormal EOG, normal fundus) → vitelliform (egg yolk) → pseudohypopyon (fluid level, often at puberty) → vitelliruptive (scrambled egg, VA drops) → atrophic/cicatricial ± CNV.',
        {outOf: 4},
      ),
    ),
  ],
};
