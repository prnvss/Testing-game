import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Table} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import type {CVPatient} from '../patient';
import type {Ctx, CVKey, Opt, TestDef} from '../types';
import {ConversationLog, Controls, initTalk, later, now, talk, usePending, type Talkative} from '../ui/common';
import {blankInterp, distQ, eyesQ, InterpPanel, lightQ, markCV, PF_OPTIONS, rxQ, TYPE_OPTIONS, type Interp} from './common';
import {CITY_P1, CITY_P2, cityAnalysis, cityResponses, type CityResp, type Dir} from './data';
import {CityPage} from './plates';

type Page = number | 'D';
const PAGES: Page[] = [1, 2, 3, 4, 'D', 5, 6, 7, 8, 9, 10];

interface CitySim extends Talkative {
  idx: number | null;
  shownAt: number;
  order: Page[];
  longDwell: number;
}

interface CityRec {
  seen: string[];
  total: string;
  choice: string[];
  scores: string[];
  interp: Interp;
}

const SEV: Opt[] = [
  {id: 'mild', text: 'Mild'},
  {id: 'moderate', text: 'Moderate'},
  {id: 'strong', text: 'Strong'},
  {id: 'na', text: 'Not applicable'},
];
const DIR_NAME: Record<Dir, string> = {T: 'top', B: 'bottom', L: 'left', R: 'right'};
const POS_NAME = ['top left', 'top right', 'middle left', 'middle right', 'bottom left', 'bottom right'];

export function cityKey(resp: CityResp): CVKey {
  const a = cityAnalysis(resp);
  return {
    pf: [a.pass ? 'pass' : 'fail'],
    type: [a.type],
    sev: [a.severity],
    pfWhy: `Part 1: ${a.total}/10 spots seen; Part 2 normal matches ${a.scores.N}/6.`,
    typeWhy: a.pass
      ? 'All spots seen and all six normal matches — no defect shown.'
      : `Part 2 scores — protan ${a.scores.P}/6, deutan ${a.scores.D}/6, tritan ${a.scores.T}/6; ${a.defectChoices} defect choice${a.defectChoices === 1 ? '' : 's'} (more defect choices = more severe; part 1 misses only = mild).`,
  };
}

const p1Count = (resp: CityResp, i: number) => resp.p1[i].reduce((s, panel) => s + panel.length, 0);

function CityView({ctx, sim, setSim}: {ctx: Ctx<CVPatient>; sim: CitySim; setSim: (fn: (s: CitySim) => CitySim) => void}) {
  usePending(sim, setSim);
  const resp = cityResponses(ctx.patient);
  const answer = (pg: Page) => {
    if (pg === 'D') return 'The right-hand one.';
    if (pg <= 4) {
      const panels = resp.p1[pg - 1];
      const parts = panels.flatMap((spots, pi) => spots.map(pos => `${POS_NAME[pos]} in the ${pi === 0 ? 'top' : 'bottom'} group`));
      return parts.length ? `This one looks different… ${parts.join(', and ')}.` : 'They all look the same to me.';
    }
    return `The ${DIR_NAME[resp.p2[pg - 5]]} one.`;
  };
  const show = (i: number) =>
    setSim(s => {
      const t = now();
      const dwell = s.idx !== null ? (t - s.shownAt) / 1000 : 0;
      const pg = PAGES[i];
      const next = talk({...s, idx: i, shownAt: t, order: [...s.order, pg], longDwell: s.longDwell + (dwell > 15 ? 1 : 0), epoch: s.epoch + 1}, 'you', `Page ${pg}`);
      return later(next, 1500 + Math.random() * 800, {say: answer(pg)});
    });
  const pg = sim.idx === null ? null : PAGES[sim.idx];
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={1}>
        {pg === null ? (
          <Text type="supporting">Open the book at page 1 to begin.</Text>
        ) : (
          <>
            <CityPage page={pg} />
            <HStack hAlign="center" gap={1}>
              <Badge label={`Page ${pg}`} />
              <Badge variant="info" label={pg === 'D' ? 'Demonstration' : pg <= 4 ? 'Part 1 — spots' : 'Part 2 — closest match'} />
            </HStack>
          </>
        )}
      </VStack>
      <VStack gap={2}>
        <Controls title="City University Test">
          <HStack gap={1} wrap="wrap">
            <Button label="Previous" icon={<Icon icon={ChevronLeft} />} isDisabled={!sim.idx} onClick={() => sim.idx && show(sim.idx - 1)} />
            <Button label={sim.idx === null ? 'Show page 1' : 'Next page'} variant="primary" icon={<Icon icon={ChevronRight} />} isDisabled={sim.idx === PAGES.length - 1} onClick={() => show(sim.idx === null ? 0 : sim.idx + 1)} />
          </HStack>
          <Text type="supporting">Part 1 (pages 1–4): which spots look different. Part 2 (D, 5–10): which outer colour is closest to the centre.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

function CitySheet({rec, setRec, isLocked}: {rec: CityRec; setRec?: (fn: (r: CityRec) => CityRec) => void; isLocked: boolean}) {
  const p1 = CITY_P1.map((p, i) => ({id: p.page, page: p.page, i}));
  const p2 = CITY_P2.map((p, i) => ({id: p.page, page: p.page, i, ...p.key}));
  return (
    <VStack gap={2}>
      <Table
        density="compact"
        idKey="id"
        data={p1}
        columns={[
          {key: 'page', header: 'Part 1 page'},
          {
            key: 'i',
            header: 'No. seen',
            renderCell: row => (
              <TextInput label={`Page ${row.page} seen`} isLabelHidden size="sm" width={80} value={rec.seen[row.i]} isReadOnly={isLocked} onChange={v => setRec?.(r => ({...r, seen: r.seen.map((x, j) => (j === row.i ? v : x))}))} />
            ),
          },
        ]}
      />
      <TextInput label="TOTAL correctly seen (out of 10)" width={260} value={rec.total} isReadOnly={isLocked} onChange={v => setRec?.(r => ({...r, total: v}))} />
      <Table
        density="compact"
        idKey="id"
        data={p2}
        columns={[
          {key: 'page', header: 'Page'},
          {
            key: 'i',
            header: 'Choice',
            renderCell: row => (
              <Selector
                label={`Page ${row.page} choice`}
                isLabelHidden
                size="sm"
                value={rec.choice[row.i]}
                isReadOnly={isLocked}
                options={(['T', 'B', 'L', 'R'] as const).map(d => ({value: d, label: d}))}
                onChange={v => setRec?.(r => ({...r, choice: r.choice.map((x, j) => (j === row.i ? v : x))}))}
              />
            ),
          },
          {key: 'N', header: 'Normal'},
          {key: 'P', header: 'Protan'},
          {key: 'D', header: 'Deutan'},
          {key: 'T', header: 'Tritan'},
        ]}
      />
      <HStack gap={1} wrap="wrap">
        {['Normal', 'Protan', 'Deutan', 'Tritan'].map((l, i) => (
          <TextInput key={l} label={`${l} score /6`} size="sm" width={110} value={rec.scores[i]} isReadOnly={isLocked} onChange={v => setRec?.(r => ({...r, scores: r.scores.map((x, j) => (j === i ? v : x))}))} />
        ))}
      </HStack>
    </VStack>
  );
}

function CityRecord({rec, setRec, isLocked}: {rec: CityRec; setRec: (fn: (r: CityRec) => CityRec) => void; isLocked: boolean}) {
  return (
    <VStack gap={2}>
      <CitySheet rec={rec} setRec={setRec} isLocked={isLocked} />
      <InterpPanel value={rec.interp} onChange={v => setRec(r => ({...r, interp: v}))} isLocked={isLocked} pfOptions={PF_OPTIONS.slice(0, 2)} typeOptions={TYPE_OPTIONS} sevOptions={SEV} />
    </VStack>
  );
}

function asRec(resp: CityResp): CityRec {
  const a = cityAnalysis(resp);
  return {
    seen: CITY_P1.map((_, i) => String(p1Count(resp, i))),
    total: String(a.total),
    choice: resp.p2,
    scores: [a.scores.N, a.scores.P, a.scores.D, a.scores.T].map(String),
    interp: blankInterp(),
  };
}

export const cityTest: TestDef<CVPatient, CitySim, CityRec> = {
  id: 'city',
  station: 'cv',
  category: 'cv',
  group: 'city',
  groupName: 'City University Test',
  name: 'City University Test',
  short: 'City',
  brief: 'Part 1: spots that look different (10 in total). Part 2: for each page choose the outer colour closest to the centre; tally choices in the Normal / Protan / Deutan / Tritan columns.',
  instructions: [
    {id: 'p1', text: 'On the first pages, tell me which circles look different from the others.', point: 'Part 1: point out circles that look different'},
    {id: 'p2', text: 'On the later pages, tell me which of the four outer colours is closest to the one in the middle — top, bottom, left or right.', point: 'Part 2: choose the closest outer colour'},
    {id: 'one', text: 'Pick just one, even if two look similar.', point: 'Choose one only'},
    {id: 'touch', text: 'Please don’t touch the pages.', point: 'Don’t touch the pages'},
    {id: 'jargon', text: 'Select the chromatic match along your confusion axis.', bad: 'jargon.'},
    {id: 'time', text: 'Take as long as you like on each page.', bad: 'each page should be answered within a few seconds.'},
  ],
  needPoints: 4,
  setup: [
    lightQ,
    distQ(35, [20, 75, 100]),
    eyesQ,
    rxQ,
    {
      id: 'care',
      label: 'Preserving the test',
      options: [
        {id: 'care', text: 'Pages perpendicular to the line of sight; patient doesn’t touch the pages; book closed when not in use'},
        {id: 'touch', text: 'Patient points by touching the colours'},
      ],
      correct: ['care'],
      why: 'Touching and light exposure fade the colours.',
    },
  ],
  initSim: () => ({...initTalk(), idx: null, shownAt: 0, order: [], longDwell: 0}),
  Sim: CityView,
  checks: sim => [
    {id: 'demo', label: 'Showed the demonstration page before part 2', ok: sim.order.includes('D') && sim.order.indexOf('D') < sim.order.indexOf(5), points: 1},
    {id: 'all', label: 'Presented every page', ok: PAGES.every(p => sim.order.includes(p)), points: 1},
    {id: 'time', label: 'Kept viewing time short on each page', ok: sim.order.length > 0 && sim.longDwell === 0, points: 1},
  ],
  initRec: () => ({seen: ['', '', '', ''], total: '', choice: ['', '', '', '', '', ''], scores: ['', '', '', ''], interp: blankInterp()}),
  Record: CityRecord,
  grade: (rec, sim, ctx) => {
    const resp = cityResponses(ctx.patient);
    const want = asRec(resp);
    const notes: string[] = [];
    const seenErr = rec.seen.filter((v, i) => v.trim() !== want.seen[i]).length;
    const choiceErr = rec.choice.filter((v, i) => v !== want.choice[i]).length;
    const scoreErr = rec.scores.filter((v, i) => v.trim() !== want.scores[i]).length;
    if (seenErr || rec.total.trim() !== want.total) notes.push(`Part 1 should read ${want.seen.join(', ')} (total ${want.total}).`);
    if (choiceErr > 1) notes.push(`Part 2 choices were ${want.choice.join(', ')}.`);
    if (scoreErr) notes.push(`Scores: Normal ${want.scores[0]}, Protan ${want.scores[1]}, Deutan ${want.scores[2]}, Tritan ${want.scores[3]} (/6).`);
    const ok = sim.order.length > 0 && seenErr === 0 && rec.total.trim() === want.total && choiceErr <= 1 && scoreErr === 0;
    return {interpret: markCV(ok, notes, rec.interp, cityKey(resp), {pf: PF_OPTIONS, type: TYPE_OPTIONS, sev: SEV})};
  },
  model: (_s, ctx) => {
    const a = cityAnalysis(cityResponses(ctx.patient));
    return `City University (35 cm, daylight, OU): part 1 ${a.total}/10; N ${a.scores.N} P ${a.scores.P} D ${a.scores.D} T ${a.scores.T} (/6) — ${a.pass ? 'PASS' : `FAIL, ${a.type}${a.severity !== 'na' ? ` (${a.severity})` : ''}`}`;
  },
  provided: {
    View: ({patient}) => <CitySheet rec={asRec(cityResponses(patient, 'provided'))} isLocked />,
    key: p => cityKey(cityResponses(p, 'provided')),
    pfOptions: PF_OPTIONS.slice(0, 2),
    typeOptions: TYPE_OPTIONS,
    sevOptions: SEV,
  },
};
