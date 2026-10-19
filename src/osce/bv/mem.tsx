import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {Flashlight, Hand} from 'lucide-react';
import {eyeValues, hasDioptreUnit, mark, near, rxBias, rxQuestion} from '../marking';
import {NORMS} from '../norms';
import {fmtSigned, type BVPatient, type Eye} from '../patient';
import {round} from '../rng';
import type {Ctx, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, initTalk, later, talk, usePending, type Talkative} from '../ui/common';
import {ReflexView} from '../ui/visuals';

interface MemSim extends Talkative {
  eye: Eye;
  lens: number;
  /** What is in front of the eye right now. */
  showing: 'none' | 'flash' | 'hold';
  sweeping: boolean;
  sweptBare: Record<Eye, boolean>;
  tried: Record<Eye, number[]>;
  neutral: Record<Eye, number | null>;
  usedHold: boolean;
  readingStarted: boolean;
}

const LENSES = [-0.25, 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5];

/** Lag the student would actually measure (biased if the correction is wrong). */
export const measuredLag = (ctx: Ctx<BVPatient>, eye: Eye) => round(ctx.patient.lag[eye] + rxBias(ctx) * 0.5, 0.25);

export function lagInterp(lagAvg: number) {
  return lagAvg > NORMS.mem.hi ? 'high' : lagAvg < NORMS.mem.lo ? 'low' : 'normal';
}

export const LAG_OPTIONS = [
  {id: 'normal', text: 'Normal lag (+0.25 to +0.75 D)'},
  {id: 'high', text: 'High lag (> +0.75 D) — under-accommodating (e.g. AI, CE)'},
  {id: 'low', text: 'Low lag / lead (< +0.25 D) — over-accommodating (e.g. AE, CI)'},
];

export function gradeLagRecord(rec: BVRec, ctx: Ctx<BVPatient>, label: string) {
  const p = ctx.patient;
  const v = eyeValues(rec.text);
  const od = v.od?.[0];
  const os = v.os?.[0];
  const notes: string[] = [];
  const truth = {od: p.lag.od, os: p.lag.os};
  const accurate = od !== undefined && os !== undefined && near(od, truth.od, 0.25) && near(os, truth.os, 0.25);
  if (!accurate) notes.push(`True lag: OD ${fmtSigned(truth.od)} D, OS ${fmtSigned(truth.os)} D (±0.25 D accepted).`);
  if (rxBias(ctx) !== 0) notes.push('Testing through the wrong correction shifted the lag you measured.');
  const fmtNotes: string[] = [];
  if (od === undefined || os === undefined) fmtNotes.push('Record a value for each eye with laterality (OD / OS).');
  if (!hasDioptreUnit(rec.text) && !/[+-]\s*\d/.test(rec.text)) fmtNotes.push('Include the sign and units (e.g. +0.50 D).');
  if (!new RegExp(label, 'i').test(rec.text)) fmtNotes.push(`Name the test (${label}) on the record.`);
  const avg = (truth.od + truth.os) / 2;
  const want = lagInterp(avg);
  return {
    accurate: mark(accurate, 1, notes),
    record: mark(fmtNotes.length === 0, 1, fmtNotes),
    insight: {ok: rec.interp === want, notes: [`${LAG_OPTIONS.find(o => o.id === want)!.text}. Norm: ${NORMS.mem.text}.`]},
  };
}

function MemSimView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: MemSim; setSim: (fn: (s: MemSim) => MemSim) => void}) {
  usePending(sim, setSim);
  const lag = measuredLag(ctx, sim.eye);
  // A held lens lets the patient relax accommodation, so the reflex barely changes.
  const lensEffect = sim.showing === 'flash' ? sim.lens : sim.showing === 'hold' ? sim.lens * 0.25 : 0;
  const error = lag - lensEffect;
  const readsAloud = ctx.instr.includes('read');

  const startReading = (s: MemSim) =>
    s.readingStarted || !readsAloud ? s : later({...s, readingStarted: true}, 600, {say: '“The cat sat on the mat… the dog ran up the hill…”'}, false);

  const sweep = () =>
    setSim(s => {
      let n = startReading({...s, sweeping: true});
      if (n.showing === 'none') n = {...n, sweptBare: {...n.sweptBare, [n.eye]: true}};
      return later(n, 1600, {set: {sweeping: false}}, false);
    });

  const flash = () =>
    setSim(s => {
      const errNow = measuredLag(ctx, s.eye) - s.lens;
      let n = startReading({...s, showing: 'flash', sweeping: true, tried: {...s.tried, [s.eye]: [...s.tried[s.eye], s.lens]}});
      if (Math.abs(errNow) < 0.13) n = {...n, neutral: {...n.neutral, [s.eye]: s.lens}};
      n = talk(n, 'you', `Flash ${fmtSigned(s.lens)} D before ${s.eye.toUpperCase()} (≈0.3 s) and sweep`);
      return later(n, 700, {set: {showing: 'none', sweeping: false}}, false);
    });

  const hold = () =>
    setSim(s => talk(startReading({...s, showing: s.showing === 'hold' ? 'none' : 'hold', usedHold: true, sweeping: s.showing !== 'hold'}), 'you', s.showing === 'hold' ? 'Remove the lens' : `Hold ${fmtSigned(s.lens)} D in front of ${s.eye.toUpperCase()}`));

  const motion = Math.abs(error) < 0.13 ? 'neutral' : error > 0 ? 'with' : 'against';
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <ReflexView
          error={error}
          sweeping={sim.sweeping}
          lensLabel={`${sim.eye.toUpperCase()} · ${sim.showing === 'none' ? 'no lens' : `${fmtSigned(sim.lens)} D ${sim.showing === 'flash' ? '(flashed)' : '(held)'}`}`}
        />
        <Text type="supporting">
          Sweep horizontally along the patient’s line of sight. Judge the motion of the reflex relative to your streak: with = band moves the same way,
          against = opposite, neutral = pupil fills/flashes.
        </Text>
      </VStack>
      <VStack gap={2}>
        <Controls title="Retinoscope (MEM card on the scope at 40 cm)">
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text type="supporting">Eye</Text>
            <SegmentedControl label="Eye" size="sm" value={sim.eye} onChange={v => setSim(s => ({...s, eye: v as Eye, showing: 'none'}))}>
              <SegmentedControlItem value="od" label="OD" />
              <SegmentedControlItem value="os" label="OS" />
            </SegmentedControl>
          </HStack>
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text type="supporting">Lens</Text>
            <SegmentedControl label="Lens power" size="sm" value={String(sim.lens)} onChange={v => setSim(s => ({...s, lens: Number(v), showing: s.showing === 'hold' ? 'hold' : 'none'}))}>
              {LENSES.map(l => (
                <SegmentedControlItem key={l} value={String(l)} label={l === 0 ? '0' : fmtSigned(l)} />
              ))}
            </SegmentedControl>
          </HStack>
          <HStack gap={1} wrap="wrap">
            <Button label="Sweep (no lens)" icon={<Icon icon={Flashlight} />} onClick={sweep} isDisabled={sim.showing !== 'none'} />
            <Button label="Flash lens & sweep" variant="primary" icon={<Icon icon={Flashlight} />} onClick={flash} />
            <Button label={sim.showing === 'hold' ? 'Remove held lens' : 'Hold lens in place'} variant="ghost" icon={<Icon icon={Hand} />} onClick={hold} />
          </HStack>
          <Text type="supporting">
            Reflex now: <Text weight="semibold">{sim.sweeping ? (motion === 'neutral' ? 'neutral' : `${motion} motion`) : 'sweep to judge'}</Text>
          </Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const Record = makeBVRecord<MemSim>({
  placeholder: 'e.g. MEM (40 cm, cc): OD +0.50 D, OS +0.50 D',
  hint: 'Test, conditions, a value per eye with sign and units.',
  question: 'What does the lag of accommodation indicate?',
  options: LAG_OPTIONS,
});

export const memTest: TestDef<BVPatient, MemSim, BVRec> = {
  id: 'mem',
  station: 'bv',
  category: 'acc',
  group: 'accuracy',
  groupName: 'Accuracy of accommodation',
  name: 'MEM retinoscopy',
  short: 'MEM',
  brief: 'Monocular estimate method: with the patient reading a card on the retinoscope at 40 cm, briefly flash plus lenses before each eye to find the lens that neutralises the reflex (the lag of accommodation).',
  instructions: [
    {id: 'read', text: 'Please read the words on the card out loud.', point: 'Ask the patient to read the words aloud'},
    {id: 'clear', text: 'Try to keep the words clear while you read them.', point: 'Keep the words clear'},
    {id: 'light', text: 'I’ll be shining a light towards your eyes — it may be a little bright, that’s normal.', point: 'Warn about the light'},
    {id: 'look', text: 'Keep both eyes open and keep looking at the words, not at the light.', point: 'Keep looking at the words with both eyes open'},
    {id: 'jargon', text: 'Maintain fixation on the MEM target and keep accommodating.', bad: 'jargon the patient won’t understand.'},
    {id: 'blur', text: 'Tell me as soon as the words go blurry.', bad: 'MEM is objective — there is no blur endpoint.'},
    {id: 'cover', text: 'Cover your left eye with your hand.', bad: 'MEM is done binocularly.'},
  ],
  needPoints: 3,
  setup: [
    rxQuestion(),
    {
      id: 'target',
      label: 'Target',
      options: [
        {id: 'memcard', text: 'MEM card (age-appropriate words) on the retinoscope at the patient’s 40 cm / Harmon distance'},
        {id: 'chart', text: 'Distance letter chart at 6 m'},
        {id: 'light', text: 'Fixation light at 40 cm'},
        {id: 'near20', text: 'Near card held by the patient at 20 cm'},
      ],
      correct: ['memcard'],
      why: 'The card must sit in the retinoscope’s plane at the working distance so the reflex is measured relative to the target.',
    },
    {
      id: 'room',
      label: 'Room illumination',
      options: [
        {id: 'lights', text: 'Normal room lighting (lights on)'},
        {id: 'dark', text: 'Room lights off'},
      ],
      correct: ['lights'],
      why: 'The patient must be able to read the card easily; MEM is done in normal illumination.',
    },
    {
      id: 'view',
      label: 'Viewing conditions',
      options: [
        {id: 'bino', text: 'Binocular — both eyes open'},
        {id: 'mono', text: 'Monocular — fellow eye occluded'},
      ],
      correct: ['bino'],
      why: 'MEM measures the habitual binocular accommodative response.',
    },
  ],
  initSim: () => ({
    ...initTalk(),
    eye: 'od',
    lens: 0.25,
    showing: 'none',
    sweeping: false,
    sweptBare: {od: false, os: false},
    tried: {od: [], os: []},
    neutral: {od: null, os: null},
    usedHold: false,
    readingStarted: false,
  }),
  Sim: MemSimView,
  checks: sim => [
    {id: 'bare', label: 'Swept each eye without a lens first to judge the motion', ok: sim.sweptBare.od && sim.sweptBare.os, points: 1},
    {id: 'brief', label: 'Interposed lenses only briefly (a held lens lets accommodation relax)', ok: !sim.usedHold && sim.tried.od.length + sim.tried.os.length > 0, points: 1},
    {id: 'bracket', label: 'Tried more than one lens in each eye to bracket neutrality', ok: new Set(sim.tried.od).size > 1 && new Set(sim.tried.os).size > 1, points: 1},
    {id: 'both', label: 'Found neutrality in both eyes', ok: sim.neutral.od !== null && sim.neutral.os !== null, points: 1},
  ],
  initRec: initBVRec,
  Record,
  grade: (rec, _sim, ctx) => gradeLagRecord(rec, ctx, 'MEM'),
  model: (_sim, ctx) => `MEM (40 cm, cc, binocular): OD ${fmtSigned(ctx.patient.lag.od)} D, OS ${fmtSigned(ctx.patient.lag.os)} D`,
};
