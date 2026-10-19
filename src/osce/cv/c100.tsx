import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Table} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Dices, Hand} from 'lucide-react';
import type {CVPatient} from '../patient';
import type {Ctx, CVKey, Opt, TestDef} from '../types';
import {ConversationLog, Controls, initTalk, later, talk, usePending, type Talkative} from '../ui/common';
import {blankInterp, eyesQ, InterpPanel, markCV, rxQ, type Interp} from './common';
import {C100, c100Analysis, c100Mean, c100Reading} from './data';

interface C100Sim extends Talkative {
  knob: number;
  randomised: boolean;
  unrandomised: number;
  readings: number[];
  adjusting: boolean;
}

interface C100Rec {
  readings: string[];
  mean: string;
  interp: Interp;
}

const PF: Opt[] = [
  {id: 'pass', text: 'Within the normal zone (−2 to +2)'},
  {id: 'fail', text: 'Outside the normal zone — protan or deutan'},
];
const TYPES: Opt[] = [
  {id: 'normal', text: 'No protan/deutan shift'},
  {id: 'protan', text: 'Protan (red end, negative)'},
  {id: 'deutan', text: 'Deutan (green end, positive)'},
  {id: 'tritan', text: 'Tritan'},
];
const SEV: Opt[] = [
  {id: 'na', text: 'Cannot be graded with the C-100'},
  {id: 'mild', text: 'Mild'},
  {id: 'moderate', text: 'Moderate'},
  {id: 'strong', text: 'Strong'},
];

export function c100Key(readings: number[]): CVKey {
  const a = c100Analysis(readings);
  return {
    pf: [a.pass ? 'pass' : 'fail'],
    type: [a.type],
    sev: ['na'],
    pfWhy: `Mean of ${readings.length} readings = ${a.mean.toFixed(1)} (normal zone ${C100.lo} to +${C100.hi}).`,
    typeWhy: `${a.type === 'normal' ? 'A mean near zero shows no protan/deutan luminosity shift' : `A mean at the ${a.type === 'protan' ? 'red (−)' : 'green (+)'} end indicates a ${a.type}`}. The C-100 is a protan/deutan dichotomiser — it does not grade severity (and does not test tritan defects).`,
  };
}

function Eyepiece({flicker}: {flicker: boolean}) {
  return (
    <svg viewBox="0 0 220 220" width="100%" style={{maxWidth: 260, display: 'block', margin: '0 auto'}} role="img" aria-label={flicker ? 'Flickering field' : 'Steady field'}>
      <circle cx={110} cy={110} r={105} fill="#050505" />
      <circle cx={110} cy={110} r={60} fill="#d8322a">
        {flicker && <animate attributeName="fill" values="#d8322a;#4cae3f;#d8322a" dur="0.14s" repeatCount="indefinite" />}
      </circle>
      {!flicker && <circle cx={110} cy={110} r={60} fill="#a9822f" />}
    </svg>
  );
}

function Dial({value}: {value: number}) {
  const x = (v: number) => 20 + ((v + 5) / 10) * 260;
  return (
    <svg viewBox="0 0 300 70" width="100%" role="img" aria-label={`Dial reading ${value}`}>
      <rect x={0} y={0} width={300} height={70} rx={12} fill="var(--color-background-muted)" />
      <rect x={20} y={30} width={130} height={8} fill="#d8322a88" />
      <rect x={150} y={30} width={130} height={8} fill="#4cae3f88" />
      {Array.from({length: 21}, (_, i) => -5 + i * 0.5).map(v => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={v % 1 === 0 ? 24 : 28} y2={42} stroke="var(--color-text-secondary)" />
          {v % 1 === 0 && (
            <text x={x(v)} y={58} fontSize={10} textAnchor="middle" fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
              {v > 0 ? `+${v}` : v}
            </text>
          )}
        </g>
      ))}
      <polygon points={`${x(value) - 6},14 ${x(value) + 6},14 ${x(value)},26`} fill="var(--color-text-primary)" />
    </svg>
  );
}

function C100View({ctx, sim, setSim}: {ctx: Ctx<CVPatient>; sim: C100Sim; setSim: (fn: (s: C100Sim) => C100Sim) => void}) {
  usePending(sim, setSim);
  const mean = c100Mean(ctx.patient);
  const flicker = Math.abs(sim.knob - mean) > 0.6;
  const randomise = () =>
    setSim(s => {
      const v = Math.round((Math.random() * 10 - 5) * 2) / 2;
      return talk({...s, knob: v, randomised: true}, 'you', 'Turn the knob to a random position');
    });
  const adjust = () =>
    setSim(s => {
      const reading = s.randomised ? c100Reading(ctx.patient, s.readings.length) : s.knob;
      const n = talk({...s, adjusting: true, unrandomised: s.unrandomised + (s.randomised ? 0 : 1)}, 'you', 'Turn the knob until the flicker stops, then let go');
      return later(n, 2200, {say: s.randomised ? 'There — that’s where it’s steadiest.' : 'It already looked steady, so I left it.', set: {knob: reading, adjusting: false, randomised: false, readings: [...s.readings, reading]}}, false);
    });
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <Eyepiece flicker={flicker} />
        <Dial value={sim.knob} />
        <Text type="supporting" justify="center">
          Readings taken: {sim.readings.length}
        </Text>
      </VStack>
      <VStack gap={2}>
        <Controls title="Medmont C-100 (examiner’s controls)">
          <HStack gap={1} wrap="wrap">
            <Button label="Randomise knob" icon={<Icon icon={Dices} />} onClick={randomise} isDisabled={sim.adjusting} />
            <Button label="Patient adjusts" variant="primary" icon={<Icon icon={Hand} />} onClick={adjust} isDisabled={sim.adjusting} />
          </HStack>
          <Text type="supporting">Read the dial after each adjustment and record it below. Average about five readings.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

function C100Record({rec, setRec, isLocked}: {rec: C100Rec; setRec: (fn: (r: C100Rec) => C100Rec) => void; isLocked: boolean}) {
  return (
    <VStack gap={2}>
      <HStack gap={1} wrap="wrap">
        {rec.readings.map((v, i) => (
          <TextInput key={i} label={`Reading ${i + 1}`} size="sm" width={90} value={v} isReadOnly={isLocked} onChange={x => setRec(r => ({...r, readings: r.readings.map((y, j) => (j === i ? x : y))}))} />
        ))}
        <TextInput label="Mean" size="sm" width={90} value={rec.mean} isReadOnly={isLocked} onChange={x => setRec(r => ({...r, mean: x}))} />
      </HStack>
      <InterpPanel value={rec.interp} onChange={v => setRec(r => ({...r, interp: v}))} isLocked={isLocked} pfOptions={PF} typeOptions={TYPES} sevOptions={SEV} />
    </VStack>
  );
}

const providedReadings = (p: CVPatient) => [0, 1, 2, 3, 4].map(i => c100Reading({...p, seed: p.seed ^ 0x2f}, i));

function ProvidedC100({patient}: {patient: CVPatient}) {
  const r = providedReadings(patient);
  return (
    <Table
      density="compact"
      data={r.map((v, i) => ({id: i, n: i + 1, v: v > 0 ? `+${v}` : String(v)}))}
      idKey="id"
      columns={[
        {key: 'n', header: 'Reading'},
        {key: 'v', header: 'Dial value'},
      ]}
    />
  );
}

export const c100Test: TestDef<CVPatient, C100Sim, C100Rec> = {
  id: 'c100',
  station: 'cv',
  category: 'cv',
  group: 'c100',
  groupName: 'Medmont C-100',
  name: 'Medmont C-100',
  short: 'C-100',
  brief: 'Heterochromatic flicker photometry: the patient turns the knob until the red/green flicker stops. Randomise the knob before each of ~5 readings and average. Negative (red end) = protan, positive (green end) = deutan.',
  instructions: [
    {id: 'look', text: 'Look into the eyepiece — you’ll see a light that flickers.', point: 'Look into the eyepiece at the flickering light'},
    {id: 'turn', text: 'Turn this knob slowly until the flickering stops or is at its least, then let go.', point: 'Turn the knob until the flicker stops / is least'},
    {id: 'repeat', text: 'We’ll do this a few times; I’ll move the knob in between.', point: 'Explain it will be repeated'},
    {id: 'nocolour', text: 'Don’t worry about the colours — just get rid of the flicker.', point: 'Ignore colour, judge flicker only'},
    {id: 'jargon', text: 'Find the isoluminant null point of the heterochromatic stimulus.', bad: 'jargon.'},
    {id: 'match', text: 'Make the two colours look the same colour.', bad: 'wrong criterion — it’s flicker, not colour, that is minimised.'},
  ],
  needPoints: 4,
  setup: [
    {
      id: 'room',
      label: 'Room lighting',
      options: [
        {id: 'normal', text: 'Normal room lighting; patient seated comfortably holding the instrument to one eye'},
        {id: 'sun', text: 'Bright window behind the patient'},
      ],
      correct: ['normal'],
      why: 'Stray bright light around the eyepiece reduces flicker sensitivity.',
    },
    {...eyesQ, options: [{id: 'either', text: 'Either eye (congenital defects are symmetrical)'}, {id: 'both', text: 'Both eyes simultaneously'}], correct: ['either'], why: 'The C-100 is viewed monocularly through the eyepiece; for a congenital defect either eye represents both.'},
    rxQ,
    {
      id: 'count',
      label: 'Number of readings',
      options: [
        {id: '5', text: 'About five readings, knob randomised before each, then averaged'},
        {id: '1', text: 'A single reading'},
      ],
      correct: ['5'],
      why: 'Averaging ~5 readings is needed to separate protans from deutans reliably (Metha & Vingrys 1992).',
    },
  ],
  initSim: () => ({...initTalk(), knob: 0, randomised: false, unrandomised: 0, readings: [], adjusting: false}),
  Sim: C100View,
  checks: sim => [
    {id: 'rand', label: 'Randomised the knob before every reading', ok: sim.readings.length > 0 && sim.unrandomised === 0, points: 1},
    {id: 'five', label: 'Took at least five readings to average', ok: sim.readings.length >= 5, points: 1},
  ],
  initRec: () => ({readings: ['', '', '', '', '', ''], mean: '', interp: blankInterp()}),
  Record: C100Record,
  grade: (rec, sim, ctx) => {
    const vals = rec.readings.map(v => parseFloat(v.replace('−', '-'))).filter(v => !Number.isNaN(v));
    const truth = sim.readings;
    const left = [...truth];
    let matched = 0;
    for (const v of vals) {
      const i = left.findIndex(t => Math.abs(t - v) <= 0.25);
      if (i >= 0) {
        matched++;
        left.splice(i, 1);
      }
    }
    const mean = truth.length ? truth.reduce((a, b) => a + b, 0) / truth.length : NaN;
    const meanOk = Math.abs(parseFloat(rec.mean.replace('−', '-')) - mean) <= 0.3;
    const notes: string[] = [];
    if (matched < truth.length || vals.length !== truth.length) notes.push(`Readings were ${truth.map(v => (v > 0 ? `+${v}` : v)).join(', ') || '(none taken)'}.`);
    if (!meanOk) notes.push(`Mean should be ${Number.isNaN(mean) ? '—' : mean.toFixed(1)}.`);
    return {interpret: markCV(truth.length > 0 && matched === truth.length && vals.length === truth.length && meanOk, notes, rec.interp, c100Key(truth.length ? truth : [c100Mean(ctx.patient)]), {pf: PF, type: TYPES, sev: SEV})};
  },
  model: (sim, ctx) => {
    const r = sim.readings.length ? sim.readings : [0, 1, 2, 3, 4].map(i => c100Reading(ctx.patient, i));
    const a = c100Analysis(r);
    return `Medmont C-100: ${r.map(v => (v > 0 ? `+${v}` : v)).join(', ')}; mean ${a.mean.toFixed(1)} — ${a.type === 'normal' ? 'within normal zone' : a.type}`;
  },
  provided: {View: ProvidedC100, key: p => c100Key(providedReadings(p)), pfOptions: PF, typeOptions: TYPES, sevOptions: SEV},
};
