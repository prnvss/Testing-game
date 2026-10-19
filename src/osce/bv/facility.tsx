import {useEffect, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {FlipHorizontal2, MessageCircleQuestion, Play, RotateCcw} from 'lucide-react';
import {eyeValues, hasCpmUnit, mark, near, numbers, rxBias, rxQuestion} from '../marking';
import {NORMS} from '../norms';
import type {BVPatient, Eye} from '../patient';
import type {Ctx, SetupQuestion, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, initTalk, later, now, talk, usePending, type Talkative} from '../ui/common';
import {EyesView, PatientView} from '../ui/visuals';

type Mode = 'baf' | 'maf';
type Side = '+' | '−';

interface FacSim extends Talkative {
  occ: 'none' | Eye;
  running: boolean;
  startAt: number;
  finished: boolean;
  side: Side;
  clear: boolean;
  clearAt: number;
  flips: number;
  early: number;
  delays: number[];
  asked: boolean;
  /** Eye that was tested (MAF) / 'ou' (BAF). */
  testedEye: Eye | 'ou' | null;
}

const DURATION = 60;

function latency(ctx: Ctx<BVPatient>, mode: Mode, side: Side) {
  const f = mode === 'baf' ? ctx.patient.baf : ctx.patient.maf;
  const base = Math.max(0.35, 60 / f.cpm / 2 - 0.45);
  const hard = f.hard === 'both' ? 1 : (f.hard === 'plus' && side === '+') || (f.hard === 'minus' && side === '−') ? 1.55 : f.hard ? 0.45 : 1;
  // Uncorrected hyperopia makes the minus side harder still.
  const bias = side === '−' ? Math.max(0, rxBias(ctx)) * 0.8 : 0;
  return (base * hard + bias) * 1000;
}

function makeView(mode: Mode) {
  return function FacView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: FacSim; setSim: (fn: (s: FacSim) => FacSim) => void}) {
    usePending(sim, setSim);
    const [, setTick] = useState(0);
    useEffect(() => {
      if (!sim.running) return;
      const id = window.setInterval(() => {
        setTick(t => t + 1);
        setSim(s => (s.running && now() - s.startAt >= DURATION * 1000 ? talk({...s, running: false, finished: true, epoch: s.epoch + 1}, 'note', `60 s — stop. ${s.flips} flips made.`) : s));
      }, 200);
      return () => window.clearInterval(id);
    }, [sim.running, setSim]);
    const elapsed = sim.running ? (now() - sim.startAt) / 1000 : sim.finished ? DURATION : 0;
    const eye: Eye | 'ou' = mode === 'baf' ? 'ou' : sim.occ === 'od' ? 'os' : sim.occ === 'os' ? 'od' : 'ou';

    const scheduleClear = (s: FacSim, side: Side) => later(s, latency(ctx, mode, side), {say: 'Clear', set: {clear: true}, stamp: 'clearAt'});
    const start = () =>
      setSim(s => {
        if (mode === 'maf' && eye === 'ou') return talk(s, 'note', 'Occlude one eye first — MAF is monocular.');
        const n: FacSim = {...s, running: true, finished: false, startAt: now(), flips: 0, early: 0, delays: [], clear: false, epoch: s.epoch + 1, testedEye: eye};
        return scheduleClear(talk(n, 'you', `Start timing — ${s.side}2.00 D in place`), s.side);
      });
    const flip = () =>
      setSim(s => {
        if (!s.running) return s;
        const side: Side = s.side === '+' ? '−' : '+';
        const n: FacSim = {
          ...s,
          side,
          flips: s.flips + 1,
          early: s.early + (s.clear ? 0 : 1),
          delays: s.clear ? [...s.delays, (now() - s.clearAt) / 1000] : s.delays,
          clear: false,
          epoch: s.epoch + 1,
        };
        return scheduleClear(n, side);
      });
    const ask = () =>
      setSim(s => {
        const f = mode === 'baf' ? ctx.patient.baf : ctx.patient.maf;
        const say =
          f.hard === 'plus' ? 'The plus side — the letters took longer to clear with that one.' : f.hard === 'minus' ? 'The minus side was harder; it took a while to clear.' : f.hard === 'both' ? 'Both were slow to clear, honestly.' : 'They were about the same.';
        return later(talk({...s, asked: true}, 'you', 'Was one side harder to clear than the other?'), 900, {say}, false);
      });
    const reset = () => setSim(s => ({...s, running: false, finished: false, flips: 0, early: 0, delays: [], clear: false, epoch: s.epoch + 1}));
    const blur = sim.running && !sim.clear ? 2.5 : 0;
    return (
      <Grid columns={{minWidth: 320, max: 2}} gap={2}>
        <VStack gap={2}>
          <EyesView pos={{od: 3, os: 3}} covered={sim.occ === 'none' ? null : sim.occ} lensLabel={`±2.00 D flipper — ${sim.side}2.00 D in front`} />
          <PatientView
            t={{text: mode === 'baf' ? 'Vectograph 0.6M' : '0.6M  zrhv', blur}}
            title={mode === 'baf' ? 'Polarised (vectographic) card at 40 cm' : 'Near card at 40 cm'}
          />
        </VStack>
        <VStack gap={2}>
          <Controls title={`${mode === 'baf' ? 'Binocular' : 'Monocular'} accommodative facility (±2.00 D, 40 cm)`}>
            {mode === 'maf' && (
              <HStack gap={1} vAlign="center">
                <Text type="supporting">Occlude</Text>
                <SegmentedControl label="Occlude" size="sm" value={sim.occ} onChange={v => setSim(s => ({...s, occ: v as FacSim['occ']}))}>
                  <SegmentedControlItem value="none" label="None" />
                  <SegmentedControlItem value="od" label="OD" />
                  <SegmentedControlItem value="os" label="OS" />
                </SegmentedControl>
              </HStack>
            )}
            <HStack gap={1} vAlign="center">
              <Text type="supporting">Start with</Text>
              <SegmentedControl label="Starting lens" size="sm" value={sim.side} isDisabled={sim.running} onChange={v => setSim(s => ({...s, side: v as Side}))}>
                <SegmentedControlItem value="+" label="+2.00" />
                <SegmentedControlItem value="−" label="−2.00" />
              </SegmentedControl>
            </HStack>
            <HStack gap={1} wrap="wrap">
              <Button label="Start 60 s" icon={<Icon icon={Play} />} onClick={start} isDisabled={sim.running} />
              <Button label="Flip lenses" variant="primary" icon={<Icon icon={FlipHorizontal2} />} onClick={flip} isDisabled={!sim.running} />
              <Button label="Ask which side was harder" variant="ghost" icon={<Icon icon={MessageCircleQuestion} />} onClick={ask} />
              <Button label="Reset" variant="ghost" icon={<Icon icon={RotateCcw} />} onClick={reset} isDisabled={sim.running} />
            </HStack>
            <Text type="supporting" hasTabularNumbers>
              Time {Math.min(DURATION, elapsed).toFixed(0)} / {DURATION} s · flips (half-cycles) made: <Text weight="semibold">{sim.flips}</Text>. One cycle = clearing both + and −.
            </Text>
          </Controls>
          <ConversationLog log={sim.log} />
        </VStack>
      </Grid>
    );
  };
}

const OPTIONS = [
  {id: 'normal', text: 'Normal facility'},
  {id: 'minus', text: 'Reduced — difficulty clearing minus (stimulating accommodation): e.g. AI, CE'},
  {id: 'plus', text: 'Reduced — difficulty clearing plus (relaxing accommodation): e.g. AE, CI'},
  {id: 'both', text: 'Reduced — difficulty with both: accommodative infacility'},
];
const interp = (p: BVPatient, mode: Mode) => {
  const f = mode === 'baf' ? p.baf : p.maf;
  if (f.cpm >= (mode === 'baf' ? NORMS.baf.min : NORMS.maf.min)) return 'normal';
  return f.hard === 'plus' ? 'plus' : f.hard === 'minus' ? 'minus' : 'both';
};

const instructions = (mode: Mode) => [
  {id: 'read', text: 'Look at the letters on the card. I’ll flip some lenses in front of your eyes.', point: 'Explain what will happen'},
  {id: 'clear', text: 'Each time, say “clear” as soon as the letters are clear again.', point: 'Say “clear” when the letters clear'},
  {id: 'single', text: mode === 'baf' ? 'If any letters disappear or go double, tell me.' : 'Keep looking at the same letters the whole time.', point: mode === 'baf' ? 'Report letters disappearing / doubling (suppression)' : 'Keep looking at the same letters'},
  {id: 'quick', text: 'Try to make them clear as quickly as you can — this goes for one minute.', point: 'Work quickly — one minute'},
  {id: 'jargon', text: 'Report when accommodation has been regained after each lens change.', bad: 'jargon.'},
  {id: 'guess', text: 'Say “clear” every time I flip, even if it isn’t clear yet, to keep the pace.', bad: 'invalidates the test.'},
];

const setup = (mode: Mode): SetupQuestion<BVPatient>[] => [
  rxQuestion(),
  {
    id: 'target',
    label: 'Target',
    options: [
      {id: 'vecto', text: 'Polarised (vectographic) suppression card e.g. Bernell No. 9 at 40 cm, with polarised glasses'},
      {id: 'line', text: 'Line of 0.6M (N6) letters at 40 cm'},
      {id: 'dist', text: 'Distance chart at 6 m'},
    ],
    correct: mode === 'baf' ? ['vecto'] : ['line', 'vecto'],
    why: mode === 'baf' ? 'BAF needs a suppression check — a polarised target shows if one eye switches off.' : 'A threshold-level near target at 40 cm (one line above best VA).',
  },
  {
    id: 'occ',
    label: 'Viewing',
    options: [
      {id: 'bino', text: 'Both eyes open'},
      {id: 'mono', text: 'One eye occluded'},
    ],
    correct: mode === 'baf' ? ['bino'] : ['mono'],
    why: mode === 'baf' ? 'BAF is binocular.' : 'MAF is monocular (only one eye is needed for this OSCE).',
  },
  {
    id: 'lens',
    label: 'Flipper',
    options: [
      {id: '2', text: '±2.00 D flippers, held parallel to the spectacle plane'},
      {id: '1', text: '±1.00 D flippers'},
      {id: '3', text: '±3.00 D flippers'},
    ],
    correct: ['2'],
    why: 'Norms are for ±2.00 D at 40 cm.',
  },
];

function grade(mode: Mode) {
  return (rec: BVRec, sim: FacSim, ctx: Ctx<BVPatient>) => {
    const p = ctx.patient;
    const f = mode === 'baf' ? p.baf : p.maf;
    const nums = numbers(rec.text).filter(n => Math.abs(n) !== 2);
    const counted = Math.floor(sim.flips / 2);
    const accurate = nums.some(n => near(n, f.cpm, 2));
    const notes = accurate ? [] : [`Expected about ${f.cpm} cpm${sim.finished ? ` (your flips gave ${counted} full cycles)` : ''}. Count only full cycles (+ and −), not single flips.`];
    if (sim.early) notes.push('Flipping before the patient reports “clear” inflates the count.');
    const fmt: string[] = [];
    if (!hasCpmUnit(rec.text)) fmt.push('Record in cycles per minute (cpm).');
    if (!/±\s*2|\+\/-\s*2|2\.?0*\s*d/i.test(rec.text)) fmt.push('State the lens power (±2.00 D).');
    if (f.hard && !/(plus|minus|\+|−|-)\s*(slow|hard|diff)|slow|diff|hard|fail/i.test(rec.text.replace(/±\s*2(\.00)?/g, ''))) fmt.push('Note which lens was difficult.');
    if (mode === 'maf' && !eyeValues(rec.text).od && !eyeValues(rec.text).os) fmt.push('MAF: record which eye (OD / OS).');
    const want = interp(p, mode);
    return {
      accurate: mark(accurate, 1, notes),
      record: mark(fmt.length === 0, 1, fmt),
      insight: {ok: rec.interp === want, notes: [`${OPTIONS.find(o => o.id === want)!.text}. Norm: ${mode === 'baf' ? NORMS.baf.text : NORMS.maf.text}.`]},
    };
  };
}

const initSim = (): FacSim => ({...initTalk(), occ: 'none', running: false, startAt: 0, finished: false, side: '+', clear: false, clearAt: 0, flips: 0, early: 0, delays: [], asked: false, testedEye: null});

const checks = (sim: FacSim) => {
  const avgDelay = sim.delays.length ? sim.delays.reduce((a, b) => a + b, 0) / sim.delays.length : 0;
  return [
    {id: 'full', label: 'Timed the full 60 seconds', ok: sim.finished, points: 1},
    {id: 'wait', label: 'Flipped only after the patient reported “clear”', ok: sim.flips > 0 && sim.early === 0, points: 1, detail: sim.early ? `${sim.early} early flip(s)` : undefined},
    {id: 'prompt', label: 'Flipped promptly once clear (examiner delay lowers the score)', ok: sim.flips > 2 && avgDelay < 1.2, points: 1, detail: avgDelay >= 1.2 ? `average ${avgDelay.toFixed(1)} s delay` : undefined},
    {id: 'ask', label: 'Asked which lens was harder to clear', ok: sim.asked, points: 1},
  ];
};

const record = (mode: Mode) =>
  makeBVRecord<FacSim>({
    placeholder: mode === 'baf' ? 'e.g. BAF ±2.00 D (40 cm, cc): 9 cpm, no suppression' : 'e.g. MAF ±2.00 D (40 cm, cc): OD 11 cpm, slow with −',
    hint: 'Cycles per minute (1 cycle = + and −), lens power, which side was slow.',
    question: 'What does the facility result indicate?',
    options: OPTIONS,
  });

export const bafTest: TestDef<BVPatient, FacSim, BVRec> = {
  id: 'baf',
  station: 'bv',
  category: 'nearVerg',
  group: 'facility',
  groupName: 'BAF / MAF with ±2D',
  name: 'Binocular accommodative facility (±2.00 D)',
  short: 'BAF',
  brief: 'With a polarised suppression target at 40 cm, flip ±2.00 D lenses each time the patient reports clear; count cycles in 60 s.',
  instructions: instructions('baf'),
  needPoints: 3,
  setup: setup('baf'),
  initSim,
  Sim: makeView('baf'),
  checks,
  initRec: initBVRec,
  Record: record('baf'),
  grade: grade('baf'),
  model: (_s, ctx) => `BAF ±2.00 D (40 cm, cc, vectographic): ${ctx.patient.baf.cpm} cpm${ctx.patient.baf.hard ? `, slow with ${ctx.patient.baf.hard === 'both' ? '+ and −' : ctx.patient.baf.hard === 'plus' ? '+' : '−'}` : ''}, no suppression`,
};

export const mafTest: TestDef<BVPatient, FacSim, BVRec> = {
  id: 'maf',
  station: 'bv',
  category: 'nearVerg',
  group: 'facility',
  groupName: 'BAF / MAF with ±2D',
  name: 'Monocular accommodative facility (±2.00 D)',
  short: 'MAF',
  brief: 'Occlude one eye; flip ±2.00 D lenses each time the patient reports clear; count cycles in 60 s (one eye is enough for this OSCE).',
  instructions: instructions('maf'),
  needPoints: 3,
  setup: setup('maf'),
  initSim,
  Sim: makeView('maf'),
  checks,
  initRec: initBVRec,
  Record: record('maf'),
  grade: grade('maf'),
  model: (_s, ctx) => `MAF ±2.00 D (40 cm, cc): OD ${ctx.patient.maf.cpm} cpm${ctx.patient.maf.hard ? `, slow with ${ctx.patient.maf.hard === 'both' ? '+ and −' : ctx.patient.maf.hard === 'plus' ? '+' : '−'}` : ''}`,
};
