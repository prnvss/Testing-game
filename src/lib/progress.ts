export interface Attempt {
  caseId: string;
  score: number; // 0..1
  date: string;
  seed: number;
}

const KEY = 'case-lab:attempts:v1';

export function loadAttempts(): Attempt[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(a: Attempt): Attempt[] {
  const next = [...loadAttempts(), a].slice(-300);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode) — progress just won't persist.
  }
  return next;
}

export function clearAttempts() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function bestByCase(attempts: Attempt[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const a of attempts) best[a.caseId] = Math.max(best[a.caseId] ?? 0, a.score);
  return best;
}

export const pct = (score: number) => `${Math.round(score * 100)}%`;
