import {BV_TESTS} from './bv';
import {CV_TESTS} from './cv';
import {rng} from './rng';
import type {AnyTest, StationId} from './types';

export const ALL_TESTS: AnyTest[] = [...BV_TESTS, ...CV_TESTS];
export const testById = (id: string) => ALL_TESTS.find(t => t.id === id);

export const BV_CATEGORIES = [
  {id: 'acc', title: 'Near Accommodation Tests'},
  {id: 'nearVerg', title: 'Near Vergence & Facility Tests'},
  {id: 'distVerg', title: 'Distance Vergence Tests'},
] as const;

export interface Group {
  id: string;
  name: string;
  station: StationId;
  category: AnyTest['category'];
  variants: AnyTest[];
}

export const GROUPS: Group[] = (() => {
  const out: Group[] = [];
  for (const t of ALL_TESTS) {
    const g = out.find(x => x.id === t.group);
    if (g) g.variants.push(t);
    else out.push({id: t.group, name: t.groupName, station: t.station, category: t.category, variants: [t]});
  }
  return out;
})();

/** The assessor's choice: one group per BV category, or two CV techniques. */
export function assessorPicks(station: StationId, seed: number): string[] {
  const r = rng(seed ^ 0xa55e55);
  if (station === 'bv') return BV_CATEGORIES.map(c => r.pick(GROUPS.filter(g => g.category === c.id)).id);
  return r.shuffle(GROUPS.filter(g => g.station === 'cv')).slice(0, 2).map(g => g.id);
}

// -----------------------------------------------------------------------------
// Attempt history
// -----------------------------------------------------------------------------

export interface OsceAttempt {
  station: StationId;
  tests: string[];
  score: number;
  max: number;
  date: string;
  flags: number;
}

const KEY = 'osce:attempts:v1';

export function loadOsceAttempts(): OsceAttempt[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OsceAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveOsceAttempt(a: OsceAttempt): OsceAttempt[] {
  const next = [...loadOsceAttempts(), a].slice(-200);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — keep going without persistence.
  }
  return next;
}

export function clearOsceAttempts() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
