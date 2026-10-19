# Ocular Disease Case Lab

An exam-practice game for OPTO3011 *Disease of the Eye 2* (Weeks 1–8). Each case gives you a patient's
presenting complaint, then walks you through exam-style questions:

1. **Provisional differentials** for the presenting complaint
2. A randomly drawn **history / tests** question
3. **Scan annotation** — real patient fundus, OCT, FFA, FAF and visual field images from the course
   material. Draw arrows, lines (with length), boxes, ellipses, freehand outlines or point markers, and
   label each one (e.g. *microaneurysm*, *dot blot haemorrhage*, *cotton wool spot*). Labels **and**
   positions are marked; afterwards dashed outlines show where every finding is.
4. **Final diagnosis** and **pathophysiology**
5. Two randomly drawn **late questions** — grading, management/referral, or MCQs

Everything is auto-marked against key words, phrases and processes from the lectures, tutorials and
reference sheets. Marking understands abbreviations (MA, CWS, NPDR, BRAO, RAPD…), UK/US spelling and
plurals, and won't credit negated terms ("non-ischaemic" doesn't earn the "ischaemic" point).

**Scan practice tab** — tick the weeks you want (e.g. Weeks 1–4), get a random scan from those
weeks, mark and label the findings, then type the diagnosis. Findings are worth 60% and the
diagnosis 40% (half marks for the right family, e.g. "retinal artery occlusion" for a BRAO).
Optional clinical context, a session average and streak, and your week selection is remembered.

Imaging tools: pan/zoom (scroll wheel), fit, brightness/contrast, invert, red-free (green channel),
1–3 viewport layouts, a series strip, and keyboard shortcuts — `V` pan, `A` arrow, `L` line, `R` box,
`E` ellipse, `P` freehand, `D` point, `F` fit, `+`/`−` zoom, `I` invert, `G` red-free, `Ctrl+Z` undo,
`Del` delete the selected mark.

Progress (best score per case) is saved in your browser.

## Cases

| Week | Patient | Topic |
| --- | --- | --- |
| 1 | Marcus Webb | Rhegmatogenous RD / PVD |
| 2 | Jaclyn Boyle (Tutorial 2) | BRAO + hypertensive retinopathy |
| 2 | Graham Holt | Ischaemic CRVO |
| 2 | Doreen Pike | CRAO (Hollenhorst plaques) |
| 3 | Rahul Sharma (Tutorial 3) | Diabetic retinopathy / DME |
| 4 | Ada Flemming (Tutorial 4) | Intermediate AMD, PED, GA |
| 5 | Daniel Okafor | CSCR |
| 5 | Helen Novak | Macular hole / VMT / ERM |
| 6 | Emily Cooper (Tutorial 6) | Retinitis pigmentosa |
| 6 | Liam Ferreira | Stargardt disease |
| 6 | Chloe Tan | Best vitelliform dystrophy |
| 7 | Victor Lawrence (Tutorial 7) | NAION |
| 7 | Sienna Morales | Papilloedema / IIH vs disc drusen |
| 8 | Nuru Abara (Tutorial 8) | POAG |

## OSCE Clinic (OPTO3009 Clinical Skills 3) — works offline

**Offline:** open **`offline/OSCE-Clinic.html`** — one self-contained file (scripts, styles and fonts inlined). Double-click it,
or copy it to a laptop/phone; no internet or server needed. It is also reachable from the CaseLab dashboard (“OSCE clinic”).

Simulated OSCEs based on the Binocular Vision and Colour Vision assessment rubrics:

- **Binocular Vision station** (/30) — the assessor picks one test per category; you choose the variant:
  Accuracy of accommodation (MEM / NOTT), monocular AoA (push-up / minus lens), PRA/NRA · BAF / MAF ±2.00 D,
  cover test with prism neutralisation, NPC · horizontal phoria (Von Graefe / Maddox rod), PFV/NFV (phoropter / prism bar).
- **Colour Vision station** (/30) — two of Ishihara (24-plate), HRR 4th ed., Farnsworth D-15, Lanthony desaturated D-15,
  Medmont C-100 and City University; then interpret a *different* patient’s provided results for the same two tests.

Each test: **1 · Instructions** (pick what you’d say — the patient follows them literally) → **2 · Set up** (correction, target,
distance, lighting, occlusion, test care) → **3 · Perform & record** on an interactive simulator (retinoscopy reflex,
phoropter with Risley prisms, cover test with prism bar, NPC stick, flippers with a 60 s timer, Maddox rod, dot plates,
D-15 caps plotted on the score sheet, C-100 dial) with a randomly generated patient whose hidden findings drive their
responses. Record findings on the recording sheet and interpret them. 8-minute timer with a one-minute warning (or untimed),
marking against the rubric rows, red flags, model record entries and the patient’s full hidden profile at the end.

Norms: Morgan / Haynes (from the WheezyE/optometry norms sheet), Hofstetter, Scheiman et al. 2003 (NPC) and
Zellers et al. (facility). C-100 cut-offs (≈ −2…+2 normal, protan negative, deutan positive) follow common course notes —
check them against your clinic’s protocol.

```bash
npm run build:offline   # rebuild offline/OSCE-Clinic.html
```

Code: `src/osce/` (`bv/`, `cv/` test modules, `patient.ts` patient generator, `marking.ts`, `StationRunner.tsx`).

## Upload to Hostinger

Easiest: download **`hostinger-upload.zip`** from the repo root, upload it to `public_html` in hPanel File Manager, then right-click → Extract (and delete the zip). The steps below do the same by hand.

The ready-to-upload site is in **`dist/`**. It uses only relative paths, so it works in `public_html`
or any subfolder.

1. hPanel → **Websites → Manage → File Manager** → open `public_html` (or a subfolder such as
   `public_html/caselab`).
2. Upload **the contents of `dist/`** (`index.html`, `favicon.svg`, `assets/`, `scans/`), not the
   `dist` folder itself. Tip: zip the contents, upload the zip, then right-click → *Extract*.
3. Visit your domain (or `/caselab/`).

## Develop

```bash
npm install
npm run dev        # local dev server
npm run validate   # checks every case: scans exist, perfect answers score 100%, model answers pass
npm run build      # rebuild dist/ for upload
```

Case data lives in `src/data/cases/*.ts` — each case defines the patient, exam findings, scans,
annotation targets (normalised image coordinates), keyword rubrics, model answers and a pool of
randomised questions. Marking logic is in `src/lib/marking.ts`.

The UI is built with [Astryx](https://www.npmjs.com/package/@astryxdesign/core) (`AGENTS.md` has the
conventions) using a dark imaging-workstation theme that extends the Gothic theme (`src/theme.ts`).

Images are reproduced from Flinders University OPTO3011 course material for personal study under
s113P of the Copyright Act 1968 — keep the deployed site private/unlisted.
