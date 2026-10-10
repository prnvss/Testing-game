export interface DrillAttempt {
  drillId: string;
  score: number; // combined 0..1
  findings: number;
  dx: number;
  date: string;
}

const KEY = 'case-lab:drills:v1';
const WEEKS_KEY = 'case-lab:drill-weeks:v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — keep going without persistence.
  }
}

export const loadDrillAttempts = () => read<DrillAttempt[]>(KEY, []);
export function saveDrillAttempt(a: DrillAttempt): DrillAttempt[] {
  const next = [...loadDrillAttempts(), a].slice(-500);
  write(KEY, next);
  return next;
}

export const loadDrillWeeks = () => read<number[]>(WEEKS_KEY, [1, 2, 3, 4, 5, 6, 7, 8]);
export const saveDrillWeeks = (weeks: number[]) => write(WEEKS_KEY, weeks);
