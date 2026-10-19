/** Small seeded PRNG (mulberry32) so a patient and their responses are reproducible from one seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
    /** Approximately normal (Irwin–Hall). */
    normal: (mean = 0, sd = 1) => {
      let s = 0;
      for (let i = 0; i < 6; i++) s += next();
      return mean + (s - 3) * sd * Math.SQRT2;
    },
    shuffle: <T>(xs: readonly T[]): T[] => {
      const out = [...xs];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
export type Rng = ReturnType<typeof rng>;

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Derive a stable sub-seed (e.g. per test) from a patient seed and a label. */
export function subSeed(seed: number, label: string) {
  let h = seed ^ 0x9e3779b9;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export const round = (v: number, step: number) => Math.round(v / step) * step;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
