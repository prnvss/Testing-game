import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Table} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import type {CVPatient} from '../patient';
import type {Ctx, CVKey, Opt, TestDef} from '../types';
import {ConversationLog, Controls, initTalk, later, now, talk, usePending, type Talkative} from '../ui/common';
import {blankInterp, distQ, eyesQ, InterpPanel, lightQ, markCV, PF_OPTIONS, rxQ, type Interp} from './common';
import {ishiharaAnalysis, ishiharaResponses, ISHIHARA} from './data';
import {IshiharaPlate} from './plates';

interface IshSim extends Talkative {
  plate: number | null;
  shownAt: number;
  order: number[];
  longDwell: number;
}

interface IshRec {
  resp: string[];
  correct: string;
  interp: Interp;
}

const SEV: Opt[] = [
  {id: 'mild', text: 'Mild (both diagnostic numerals seen, one clearer)'},
  {id: 'strong', text: 'Strong (only one diagnostic numeral seen)'},
  {id: 'na', text: 'Not applicable / cannot be graded'},
];
const TYPES: Opt[] = [
  {id: 'normal', text: 'No defect shown'},
  {id: 'protan', text: 'Protan'},
  {id: 'deutan', text: 'Deutan'},
  {id: 'unclassified', text: 'Red-green, unclassified'},
  {id: 'tritan', text: 'Tritan'},
];

const say = (r: string) => (r === 'X' ? 'I can’t see a number.' : r.includes('clearer') ? `${r.split(' ')[0]}… the ${r.match(/\((\d)/)?.[1]} is clearer.` : `${r}.`);

export function ishKey(resp: string[]): CVKey {
  const a = ishiharaAnalysis(resp);
  const d = `Plate 16 read “${resp[15]}”, plate 17 “${resp[16]}”`;
  return {
    pf: [a.verdict],
    type: a.verdict === 'pass' ? ['normal'] : [a.type],
    sev: a.verdict === 'pass' || a.type === 'unclassified' ? ['na'] : [a.severity],
    pfWhy: `${a.correct}/15 of plates 1–15 read correctly (≥ 13 = normal, ≤ 9 = deficient, 10–12 = inconclusive).`,
    typeWhy:
      a.verdict === 'pass'
        ? 'Normal screening, so no type or severity is shown (Ishihara does not test tritan defects).'
        : `${d}: ${a.type === 'protan' ? 'the right-hand numeral (6, 2) is the protan response' : a.type === 'deutan' ? 'the left-hand numeral (2, 4) is the deutan response' : 'no consistent pattern'}${a.severity === 'strong' ? '; only one numeral seen → strong' : a.severity === 'mild' ? '; both seen, one clearer → mild' : ''}.`,
  };
}

function IshView({ctx, sim, setSim}: {ctx: Ctx<CVPatient>; sim: IshSim; setSim: (fn: (s: IshSim) => IshSim) => void}) {
  usePending(sim, setSim);
  const resp = ishiharaResponses(ctx.patient);
  const show = (n: number) =>
    setSim(s => {
      const t = now();
      const dwell = s.plate !== null ? (t - s.shownAt) / 1000 : 0;
      let next: IshSim = {...s, plate: n, shownAt: t, order: [...s.order, n], longDwell: s.longDwell + (dwell > 12 ? 1 : 0), epoch: s.epoch + 1};
      next = talk(next, 'you', `Plate ${n}`);
      return later(next, 1300 + Math.random() * 900, {say: say(resp[n - 1])});
    });
  const p = sim.plate;
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={1}>
        {p === null ? (
          <Text type="supporting">Open the book at plate 1 to begin.</Text>
        ) : (
          <>
            <IshiharaPlate n={p} />
            <HStack hAlign="center" gap={1}>
              <Badge label={`Plate ${p}`} />
              <Badge variant="info" label={ISHIHARA[p - 1].kind} />
            </HStack>
          </>
        )}
      </VStack>
      <VStack gap={2}>
        <Controls title="Ishihara 24-plate edition (plates 1–17)">
          <HStack gap={1} wrap="wrap">
            <Button label="Previous" icon={<Icon icon={ChevronLeft} />} isDisabled={!p || p <= 1} onClick={() => p && show(p - 1)} />
            <Button label={p === null ? 'Show plate 1' : 'Next plate'} variant="primary" icon={<Icon icon={ChevronRight} />} isDisabled={p === 17} onClick={() => show(p === null ? 1 : p + 1)} />
          </HStack>
          <Text type="supporting">Record each answer in the table below as the patient gives it. Allow about 3 s per plate.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

function IshTable({resp, onChange, isLocked, answers}: {resp: string[]; onChange?: (i: number, v: string) => void; isLocked: boolean; answers?: boolean}) {
  const data = ISHIHARA.map((pl, i) => ({id: pl.n, plate: pl.n, kind: pl.kind, normal: pl.normal, defect: pl.defect, resp: resp[i] ?? ''}));
  return (
    <Table
      density="compact"
      idKey="id"
      data={data}
      columns={[
        {key: 'plate', header: 'Plate'},
        {key: 'kind', header: 'Type'},
        {key: 'normal', header: 'Normal'},
        {key: 'defect', header: 'R/G defect'},
        {
          key: 'resp',
          header: answers ? 'Patient' : 'Patient response',
          renderCell: row =>
            answers || isLocked ? (
              <Text weight="semibold">{row.resp || '—'}</Text>
            ) : (
              <TextInput label={`Plate ${row.plate} response`} isLabelHidden size="sm" value={row.resp} placeholder="e.g. 8 or X" onChange={v => onChange?.(row.plate - 1, v)} />
            ),
        },
      ]}
    />
  );
}

function IshRecord({rec, setRec, isLocked}: {rec: IshRec; setRec: (fn: (r: IshRec) => IshRec) => void; isLocked: boolean}) {
  return (
    <VStack gap={2}>
      <IshTable resp={rec.resp} isLocked={isLocked} onChange={(i, v) => setRec(r => ({...r, resp: r.resp.map((x, j) => (j === i ? v : x))}))} />
      <TextInput label="Plates 1–15 read correctly (out of 15)" value={rec.correct} isReadOnly={isLocked} onChange={v => setRec(r => ({...r, correct: v}))} placeholder="e.g. 15" width={260} />
      <InterpPanel value={rec.interp} onChange={v => setRec(r => ({...r, interp: v}))} isLocked={isLocked} typeOptions={TYPES} sevOptions={SEV} />
    </VStack>
  );
}

const canon = (s: string) => {
  const t = s.trim().toLowerCase();
  if (!t || /^(x|-|—|nothing|none|nil|no number|can.?t see|0)$/.test(t)) return 'X';
  return t.replace(/\s+/g, '');
};
const sameResp = (rec: string, truth: string) => {
  const r = canon(rec);
  if (truth === 'X') return r === 'X';
  const main = truth.split(' ')[0];
  return r === main || r.startsWith(main);
};

export function ProvidedIshihara({patient}: {patient: CVPatient}) {
  return <IshTable resp={ishiharaResponses(patient, 'provided')} isLocked answers />;
}

export const ishiharaTest: TestDef<CVPatient, IshSim, IshRec> = {
  id: 'ishihara',
  station: 'cv',
  category: 'cv',
  group: 'ishihara',
  groupName: 'Ishihara',
  name: 'Ishihara pseudoisochromatic plates',
  short: 'Ishihara',
  brief: 'Red-green screening. Show the demonstration plate, then plates 2–15 (~3 s each); plates 16–17 classify protan vs deutan. Interpret from plates 1–15.',
  instructions: [
    {id: 'what', text: 'I’m going to show you some circles made of coloured dots. Tell me the number you see in each one.', point: 'Explain the task (say the number)'},
    {id: 'none', text: 'Some may not have a number — if you can’t see one, just say so. That’s completely fine.', point: 'It’s OK to see no number'},
    {id: 'quick', text: 'Please answer fairly quickly — within a few seconds.', point: 'Answer within a few seconds'},
    {id: 'touch', text: 'Please don’t touch the pages.', point: 'Don’t touch the plates'},
    {id: 'glasses', text: 'Keep your reading glasses on if you use them.', point: 'Wear habitual near correction'},
    {id: 'jargon', text: 'Identify the pseudoisochromatic figure on each plate.', bad: 'jargon.'},
    {id: 'guess', text: 'Always guess a number, even if you can’t see one.', bad: 'forcing guesses invalidates vanishing and hidden-digit plates.'},
    {id: 'finger', text: 'You can trace the number with your finger if it helps.', bad: 'fingers soil the plates — use a clean dry brush.'},
  ],
  needPoints: 4,
  setup: [
    lightQ,
    distQ(75, [33, 40, 150]),
    eyesQ,
    rxQ,
    {
      id: 'care',
      label: 'Preserving the test',
      options: [
        {id: 'care', text: 'Plates perpendicular to the line of sight; book closed when not in use; dry brush for tracing'},
        {id: 'open', text: 'Leave the book open on the desk between patients'},
        {id: 'finger', text: 'Patient traces with a finger'},
      ],
      correct: ['care'],
      why: 'Light and skin oils fade the inks; tilted plates change the colours seen.',
    },
  ],
  initSim: () => ({...initTalk(), plate: null, shownAt: 0, order: [], longDwell: 0}),
  Sim: IshView,
  checks: (sim, ctx) => {
    const shown = new Set(sim.order);
    const fail = ishiharaAnalysis(ishiharaResponses(ctx.patient)).verdict !== 'pass';
    return [
      {id: 'demo', label: 'Started with demonstration plate 1', ok: sim.order[0] === 1, points: 1},
      {id: 'all', label: 'Presented every screening plate (1–15)', ok: ISHIHARA.slice(0, 15).every(p => shown.has(p.n)), points: 1},
      {id: 'diag', label: 'Showed diagnostic plates 16–17 when screening plates were misread', ok: sim.order.length > 0 && (!fail || (shown.has(16) && shown.has(17))), points: 1},
      {id: 'time', label: 'Kept to ~3 s per plate (no prolonged viewing)', ok: sim.order.length > 0 && sim.longDwell === 0, points: 1},
    ];
  },
  initRec: () => ({resp: ISHIHARA.map(() => ''), correct: '', interp: blankInterp()}),
  Record: IshRecord,
  grade: (rec, sim, ctx) => {
    const truth = ishiharaResponses(ctx.patient);
    const shown = new Set(sim.order);
    const wrong = ISHIHARA.filter((pl, i) => shown.has(pl.n) && !sameResp(rec.resp[i], truth[i])).map(pl => pl.n);
    const a = ishiharaAnalysis(truth);
    const countOk = parseInt(rec.correct, 10) === a.correct;
    const notes: string[] = [];
    if (wrong.length > 1) notes.push(`Responses recorded incorrectly for plate(s) ${wrong.join(', ')}.`);
    if (!countOk) notes.push(`Plates 1–15 correct should be ${a.correct}/15.`);
    if (shown.size === 0) notes.push('No plates were presented.');
    return {interpret: markCV(wrong.length <= 1 && countOk && shown.size > 0, notes, rec.interp, ishKey(truth), {pf: PF_OPTIONS, type: TYPES, sev: SEV})};
  },
  model: (_s, ctx) => {
    const a = ishiharaAnalysis(ishiharaResponses(ctx.patient));
    return `Ishihara (24-plate ed., 75 cm, daylight, OU): ${a.correct}/15 — ${a.verdict === 'pass' ? 'PASS, normal red-green colour vision' : `${a.verdict.toUpperCase()}${a.type !== 'normal' ? `, ${a.type}${a.severity !== 'na' ? ` (${a.severity})` : ''} on plates 16–17` : ''}`}`;
  },
  provided: {
    View: ProvidedIshihara,
    key: p => ishKey(ishiharaResponses(p, 'provided')),
    pfOptions: PF_OPTIONS,
    typeOptions: TYPES,
    sevOptions: SEV,
  },
};
