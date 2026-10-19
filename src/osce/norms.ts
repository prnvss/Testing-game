import {hofMax, hofMin} from './patient';

/**
 * Norms used for interpretation. Sources: Morgan (1944) expected values and Haynes, as collected in the
 * "Calculators – Norms" sheet of github.com/WheezyE/optometry; Hofstetter amplitude formulae; Scheiman et al.
 * (2003) NPC cut-offs; Zellers et al. facility norms (ages 13–30). Check against your clinic's protocol.
 */
export const NORMS = {
  mem: {lo: 0.25, hi: 0.75, text: 'MEM lag +0.25 to +0.75 D (mean +0.50 D)'},
  nott: {lo: 0.25, hi: 0.75, text: 'NOTT lag +0.25 to +0.75 D'},
  amp: (age: number) =>
    `Hofstetter for age ${age}: minimum ${hofMin(age).toFixed(2)} D, average ${(18.5 - 0.3 * age).toFixed(2)} D, maximum ${hofMax(age).toFixed(2)} D. Push-up typically reads ~2 D above minus-lens.`,
  nra: {lo: 1.5, hi: 2.5, text: 'NRA +2.00 ± 0.50 D (Morgan)'},
  pra: {lo: -1.25, text: 'PRA −2.37 ± 1.00 D (Morgan); less than −1.25 D is reduced'},
  baf: {min: 8, text: 'BAF ±2.00 D: ≥ 8 cpm (Zellers, ages 13–30)'},
  maf: {min: 11, text: 'MAF ±2.00 D: ≥ 11 cpm per eye (Zellers, ages 13–30)'},
  npc: {brk: 5, rec: 7, text: 'NPC break ≤ 5 cm, recovery ≤ 7 cm (Scheiman et al. 2003)'},
  phoriaD: {exo: 3, eso: 1, text: 'Distance phoria: 1Δ XP ± 2Δ (Morgan) → normal 3Δ XP to 1Δ EP'},
  phoriaN: {exo: 6, eso: 0, text: 'Near phoria (40 cm): 3Δ XP ± 3Δ (Morgan) → normal ortho to 6Δ XP'},
  bi: {text: 'Distance BI: x / 7 / 4 Δ (± 3 / 2) (Morgan)'},
  bo: {text: 'Distance BO: 9 / 19 / 10 Δ (± 4 / 8 / 4) (Morgan)'},
};

export type Verdict = 'normal' | 'high' | 'low';
