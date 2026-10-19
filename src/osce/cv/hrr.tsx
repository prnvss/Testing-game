import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Table} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import type {CVPatient} from '../patient';
import type {Ctx, CVKey, Opt, TestDef} from '../types';
import {ConversationLog, Controls, initTalk, later, now, talk, usePending, type Talkative} from '../ui/common';
import {blankInterp, distQ, eyesQ, InterpPanel, lightQ, markCV, rxQ, TYPE_OPTIONS, type Interp} from './common';
import {HRR, hrrAnalysis, hrrResponses, QUAD_NAME, SHAPE_NAME, type HrrCol} from './data';
import {HrrPlate} from './plates';

interface HrrSim extends Talkative {
  plate: number | null;
  shownAt: number;
  order: number[];
  longDwell: number;
}

interface HrrRec {
  seen: Record<number, boolean[]>;
  screening: string;
  interp: Interp;
}

const SEV: Opt[] = [
  {id: 'mild', text: 'Mild'},
  {id: 'medium', text: 'Medium'},
  {id: 'strong', text: 'Strong'},
  {id: 'na', text: 'Not applicable'},
];
const PF: Opt[] = [
  {id: 'pass', text: 'Pass — screening series normal'},
  {id: 'fail', text: 'Fail — defect on screening series'},
];
const SCREEN: Opt[] = [
  {id: 'normal', text: 'Normal'},
  {id: 'rg', text: 'Defective: R-G'},
  {id: 'by', text: 'Defective: B-Y'},
  {id: 'both', text: 'Defective: R-G and B-Y'},
];
const COL_LABEL: Record<HrrCol, string> = {demo: '', BY: 'B-Y', RG: 'R-G', P: 'protan', D: 'deutan', T: 'tritan', Tt: 'tetartan'};

export function hrrKey(seen: number[][]): CVKey {
  const a = hrrAnalysis(seen);
  const missedList = HRR.filter(pl => pl.n >= 5)
    .flatMap(pl => pl.syms.map((s, i) => ({pl, s, i})))
    .filter(({pl, i}) => !seen[pl.n - 1].includes(i))
    .map(({pl, s}) => `${pl.n}${s.shape}`);
  return {
    pf: [a.pass ? 'pass' : 'fail'],
    type: [a.type],
    sev: [a.extent],
    pfWhy: a.pass ? 'All symbols on screening plates 5–10 were seen.' : `Symbols missed on the screening series (${missedList.filter(m => parseInt(m) <= 10).join(', ')}).`,
    typeWhy: a.pass
      ? 'Screening normal, so the diagnostic series is not needed.'
      : a.type === 'tritan'
        ? `B-Y symbols missed (tritan column${missedList.some(m => parseInt(m) >= 21) ? `, up to plate ${Math.max(...missedList.map(m => parseInt(m)).filter(n => n >= 21))}` : ' only on screening'}) → ${a.extent}.`
        : `More ${a.type} symbols missed on plates 11–20; the most saturated group with misses is ${a.extent} (mild 11–15, medium 16–18, strong 19–20).`,
  };
}

const describe = (n: number, seenIdx: number[]) => {
  if (!seenIdx.length) return 'I can’t see anything on this one.';
  const parts = seenIdx.map(i => {
    const s = HRR[n - 1].syms[i];
    return `a ${SHAPE_NAME[s.shape]} ${QUAD_NAME[s.quad]}`;
  });
  return `${parts.join(' and ')}.`.replace(/^a/, 'A');
};

function HrrView({ctx, sim, setSim}: {ctx: Ctx<CVPatient>; sim: HrrSim; setSim: (fn: (s: HrrSim) => HrrSim) => void}) {
  usePending(sim, setSim);
  const seen = hrrResponses(ctx.patient);
  const show = (n: number) =>
    setSim(s => {
      const t = now();
      const dwell = s.plate !== null ? (t - s.shownAt) / 1000 : 0;
      const next = talk({...s, plate: n, shownAt: t, order: [...s.order, n], longDwell: s.longDwell + (dwell > 15 ? 1 : 0), epoch: s.epoch + 1}, 'you', `Plate ${n}`);
      return later(next, 1400 + Math.random() * 800, {say: describe(n, seen[n - 1])});
    });
  const p = sim.plate;
  const pl = p ? HRR[p - 1] : null;
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={1}>
        {p === null || !pl ? (
          <Text type="supporting">Open the HRR book at plate 1 to begin.</Text>
        ) : (
          <>
            <HrrPlate n={p} />
            <HStack hAlign="center" gap={1}>
              <Badge label={`Plate ${p}`} />
              <Badge variant="info" label={`${pl.section}${pl.group ? ` · ${pl.group}` : ''}`} />
            </HStack>
          </>
        )}
      </VStack>
      <VStack gap={2}>
        <Controls title="HRR 4th edition (24 plates)">
          <HStack gap={1} wrap="wrap">
            <Button label="Previous" icon={<Icon icon={ChevronLeft} />} isDisabled={!p || p <= 1} onClick={() => p && show(p - 1)} />
            <Button label={p === null ? 'Show plate 1' : 'Next plate'} variant="primary" icon={<Icon icon={ChevronRight} />} isDisabled={p === 24} onClick={() => show(p === null ? 1 : p + 1)} />
          </HStack>
          <Text type="supporting">Plates 1–4 demonstrate (4 is blank). 5–10 screen; continue to the diagnostic series only if a screening symbol is missed.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

function HrrSheet({seen, onToggle, isLocked}: {seen: Record<number, boolean[]>; onToggle?: (n: number, i: number, v: boolean) => void; isLocked: boolean}) {
  const data = HRR.filter(pl => pl.n >= 5).map(pl => ({id: pl.n, n: pl.n, section: `${pl.section}${pl.group ? ` (${pl.group})` : ''}`, pl}));
  return (
    <Table
      density="compact"
      idKey="id"
      data={data}
      columns={[
        {key: 'n', header: 'Plate'},
        {key: 'section', header: 'Series'},
        {
          key: 'pl',
          header: 'Symbols seen (tick)',
          renderCell: row => (
            <HStack gap={2} wrap="wrap">
              {row.pl.syms.length === 0 && <Text type="supporting">—</Text>}
              {row.pl.syms.map((s, i) => (
                <CheckboxInput
                  key={i}
                  label={`${s.shape} ${COL_LABEL[s.col]}`}
                  value={Boolean(seen[row.n]?.[i])}
                  isReadOnly={isLocked}
                  onChange={v => onToggle?.(row.n, i, v)}
                />
              ))}
            </HStack>
          ),
        },
      ]}
    />
  );
}

function HrrRecord({rec, setRec, isLocked}: {rec: HrrRec; setRec: (fn: (r: HrrRec) => HrrRec) => void; isLocked: boolean}) {
  return (
    <VStack gap={2}>
      <HrrSheet
        seen={rec.seen}
        isLocked={isLocked}
        onToggle={(n, i, v) => setRec(r => ({...r, seen: {...r.seen, [n]: HRR[n - 1].syms.map((_, j) => (j === i ? v : Boolean(r.seen[n]?.[j])))}}))}
      />
      <Selector label="Screening series analysis" value={rec.screening} isReadOnly={isLocked} options={SCREEN.map(o => ({value: o.id, label: o.text}))} onChange={v => setRec(r => ({...r, screening: v}))} width={320} />
      <InterpPanel value={rec.interp} onChange={v => setRec(r => ({...r, interp: v}))} isLocked={isLocked} pfOptions={PF} typeOptions={TYPE_OPTIONS} sevOptions={SEV} title="Diagnostic series analysis: type and extent" />
    </VStack>
  );
}

export function ProvidedHrr({patient}: {patient: CVPatient}) {
  const seen = hrrResponses(patient, 'provided');
  const asRec: Record<number, boolean[]> = {};
  HRR.forEach(pl => (asRec[pl.n] = pl.syms.map((_, i) => seen[pl.n - 1].includes(i))));
  return <HrrSheet seen={asRec} isLocked />;
}

export const hrrTest: TestDef<CVPatient, HrrSim, HrrRec> = {
  id: 'hrr',
  station: 'cv',
  category: 'cv',
  group: 'hrr',
  groupName: 'HRR',
  name: 'HRR pseudoisochromatic plates (4th ed.)',
  short: 'HRR',
  brief: 'Screens red-green and blue-yellow defects and grades type and extent. Demonstration plates 1–4, screening 5–10, then diagnostic plates 11–20 (R-G) / 21–24 (B-Y) if a screening symbol is missed.',
  instructions: [
    {id: 'what', text: 'Each page may have one or two shapes — a circle, a cross or a triangle — or nothing at all.', point: 'Explain the shapes (or none)'},
    {id: 'where', text: 'Tell me which shapes you see and where they are on the page — like top left or bottom right.', point: 'Name the shape and where it is'},
    {id: 'none', text: 'If you can’t see anything, just say “nothing” — that’s fine.', point: 'It’s OK to see nothing'},
    {id: 'touch', text: 'Please don’t touch the pages; you can point with this brush.', point: 'Don’t touch the plates'},
    {id: 'jargon', text: 'Identify the chromatic symbols in each quadrant.', bad: 'jargon.'},
    {id: 'guess', text: 'Try to find two shapes on every page.', bad: 'many pages have one symbol or none — this forces guessing.'},
  ],
  needPoints: 4,
  setup: [
    lightQ,
    distQ(75, [35, 50, 100]),
    eyesQ,
    rxQ,
    {
      id: 'care',
      label: 'Preserving the test',
      options: [
        {id: 'care', text: 'Plates perpendicular to the line of sight; brush to point; book closed when not in use'},
        {id: 'finger', text: 'Patient points to the shapes with a finger'},
      ],
      correct: ['care'],
      why: 'Fingers and light exposure fade the inks.',
    },
  ],
  initSim: () => ({...initTalk(), plate: null, shownAt: 0, order: [], longDwell: 0}),
  Sim: HrrView,
  checks: (sim, ctx) => {
    const shown = new Set(sim.order);
    const a = hrrAnalysis(hrrResponses(ctx.patient));
    const need = a.screening === 'normal' ? [] : [...(a.screening !== 'by' ? [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] : []), ...(a.screening !== 'rg' ? [21, 22, 23, 24] : [])];
    return [
      {id: 'demo', label: 'Showed the demonstration plates 1–4 first', ok: [1, 2, 3, 4].every(n => sim.order.indexOf(n) >= 0 && sim.order.indexOf(n) < 4), points: 1},
      {id: 'screen', label: 'Presented all screening plates 5–10', ok: [5, 6, 7, 8, 9, 10].every(n => shown.has(n)), points: 1},
      {id: 'diag', label: 'Completed the diagnostic series needed for the screening result', ok: sim.order.length > 0 && need.every(n => shown.has(n)), points: 1},
      {id: 'time', label: 'No prolonged viewing of any plate', ok: sim.order.length > 0 && sim.longDwell === 0, points: 1},
    ];
  },
  initRec: () => ({seen: {}, screening: '', interp: blankInterp()}),
  Record: HrrRecord,
  grade: (rec, sim, ctx) => {
    const truth = hrrResponses(ctx.patient);
    const shown = new Set(sim.order);
    let errs = 0;
    HRR.filter(pl => pl.n >= 5 && shown.has(pl.n)).forEach(pl => pl.syms.forEach((_, i) => (Boolean(rec.seen[pl.n]?.[i]) !== truth[pl.n - 1].includes(i) ? errs++ : 0)));
    const a = hrrAnalysis(truth);
    const notes: string[] = [];
    if (errs > 1) notes.push(`${errs} symbols recorded incorrectly on the sheet.`);
    if (rec.screening !== a.screening) notes.push(`Screening analysis should be “${SCREEN.find(o => o.id === a.screening)!.text}”.`);
    return {interpret: markCV(errs <= 1 && rec.screening === a.screening && shown.size > 0, notes, rec.interp, hrrKey(truth), {pf: PF, type: TYPE_OPTIONS, sev: SEV})};
  },
  model: (_s, ctx) => {
    const a = hrrAnalysis(hrrResponses(ctx.patient));
    return `HRR (4th ed., 75 cm, daylight, OU): screening ${SCREEN.find(o => o.id === a.screening)!.text.toLowerCase()}${a.pass ? ' — PASS' : ` — ${a.type}, ${a.extent}`}`;
  },
  provided: {View: ProvidedHrr, key: p => hrrKey(hrrResponses(p, 'provided')), pfOptions: PF, typeOptions: TYPE_OPTIONS, sevOptions: SEV},
};
