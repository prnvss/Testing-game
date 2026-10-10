// Sanity checks for case data + marking engine. Run: npx jiti scripts/validate-cases.ts
import {existsSync} from 'node:fs';
import {CASES, buildSteps} from '../src/data/cases/index';
import {markAnnotations, markDiagnosis, markText} from '../src/lib/marking';
import {DRILLS} from '../src/data/drills';

let errors = 0;
const fail = (m: string) => { errors++; console.error('✗', m); };

for (const c of CASES) {
  const scanIds = new Set(c.scans.map(s => s.id));
  for (const s of c.scans) if (!existsSync(`public/${s.src}`)) fail(`${c.id}: missing file ${s.src}`);
  for (const q of c.annotate) {
    for (const id of q.scanIds) if (!scanIds.has(id)) fail(`${c.id}/${q.id}: unknown scan ${id}`);
    for (const t of q.targets) if (!q.scanIds.includes(t.scanId)) fail(`${c.id}/${q.id}: target ${t.id} on scan not in question`);
    // A perfect answer (arrow to each region centre with the canonical label) must score 100%.
    const anns = q.targets.map((t, i) => {
      const r = t.region;
      const p = r.kind === 'circle' ? {x: r.cx, y: r.cy} : {x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2};
      return {id: String(i), scanId: t.scanId, tool: 'arrow' as const, points: [{x: p.x - 0.1, y: p.y - 0.1}, p], label: t.synonyms[0]};
    });
    const res = markAnnotations(q, anns);
    if (res.score < 0.999) fail(`${c.id}/${q.id}: perfect annotations score ${res.score} ${JSON.stringify(res.targets.map(t => [t.target.id, t.status]))}`);
  }
  // The model answer should score well on its own rubric.
  for (const q of [c.ddx, c.finalDx, c.pathophysiology, ...c.pool.map(p => p.question)]) {
    if (q.type !== 'text') continue;
    const r = markText(q, q.model);
    if (r.score < 0.99) fail(`${c.id}/${q.id}: model answer scores ${r.score.toFixed(2)} — missed ${r.items.filter(i => !i.hit).map(i => i.item.label).join(' | ')}`);
    const empty = markText(q, 'I am not sure');
    if (empty.score > 0) fail(`${c.id}/${q.id}: nonsense answer scores ${empty.score}`);
  }
  const steps = buildSteps(c, 42);
  console.log(`✓ ${c.id.padEnd(10)} ${steps.length} steps, ${c.scans.length} scans`);
}
// Scan-practice drills: every annotation task has a diagnosis key, and the textbook answer scores 100%.
const annotateCount = CASES.reduce((s, c) => s + c.annotate.length, 0);
if (DRILLS.length !== annotateCount) fail(`drills: ${DRILLS.length} of ${annotateCount} annotation tasks have a diagnosis key`);
for (const d of DRILLS) {
  if (markDiagnosis(d.dx, d.dx.label).score !== 1) fail(`drill ${d.id}: its own label doesn't score full marks`);
  for (const a of d.dx.accept) if (markDiagnosis(d.dx, a).score !== 1) fail(`drill ${d.id}: accept "${a}" doesn't match`);
  if (markDiagnosis(d.dx, 'no idea sorry').score !== 0) fail(`drill ${d.id}: nonsense scores`);
}
console.log(`✓ ${DRILLS.length} scan-practice drills`);
console.log(errors ? `\n${errors} problem(s)` : '\nAll cases valid');
process.exit(errors ? 1 : 0);
