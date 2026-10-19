import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {ChevronsLeft, ChevronsRight, Minus, Ruler, RotateCcw} from 'lucide-react';
import {eyeValues, hasDioptreUnit, mark, near, rxBias, rxQuestion} from '../marking';
import {NORMS} from '../norms';
import {hofMin, type BVPatient, type Eye} from '../patient';
import {clamp} from '../rng';
import type {Ctx, SetupQuestion, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, HoldButton, initTalk, later, SpeedPicker, talk, usePending, type Talkative} from '../ui/common';
import {DistanceRuler, EyesView, PatientView} from '../ui/visuals';

type Occ = 'none' | Eye;
const tested = (occ: Occ): Eye | 'ou' => (occ === 'od' ? 'os' : occ === 'os' ? 'od' : 'ou');

/** Amplitude the patient will actually report under the current conditions. */
function apparentAmp(ctx: Ctx<BVPatient>, eye: Eye | 'ou') {
  const p = ctx.patient;
  const base = eye === 'ou' ? Math.max(p.amp.od, p.amp.os) + 0.75 : p.amp[eye];
  const firstBlur = ctx.instr.includes('first') ? 0 : 1; // waits for "really blurry" without instruction
  return Math.max(1, base - rxBias(ctx) + firstBlur);
}

const ampInterp = (p: BVPatient) => (Math.min(p.amp.od, p.amp.os) < hofMin(p.age) ? 'low' : 'normal');
const AMP_OPTIONS = [
  {id: 'normal', text: 'Normal for age (at or above Hofstetter’s minimum)'},
  {id: 'low', text: 'Reduced for age (below Hofstetter’s minimum, 15 − 0.25 × age) — suggests accommodative insufficiency'},
  {id: 'high', text: 'Abnormally high — suspect the patient is under-corrected myope'},
];

function gradeAmp(rec: BVRec, ctx: Ctx<BVPatient>, tol: number, method: RegExp) {
  const p = ctx.patient;
  const v = eyeValues(rec.text);
  const ok = (e: Eye) => (v[e] ?? []).some(n => near(Math.abs(n), p.amp[e], tol));
  const accurate = ok('od') && ok('os');
  const notes = accurate ? [] : [`True amplitude: OD ${p.amp.od.toFixed(2)} D, OS ${p.amp.os.toFixed(2)} D (±${tol.toFixed(2)} D accepted).`];
  const fmt: string[] = [];
  if (!v.od || !v.os) fmt.push('Record each eye separately with laterality (OD / OS) — amplitude is monocular.');
  if (!hasDioptreUnit(rec.text)) fmt.push('Record amplitude in dioptres (D).');
  if (!method.test(rec.text)) fmt.push('State the method (push-up / minus lens).');
  const want = ampInterp(p);
  return {
    accurate: mark(accurate, 1, notes),
    record: mark(fmt.length === 0, 1, fmt),
    insight: {ok: rec.interp === want, notes: [`${AMP_OPTIONS.find(o => o.id === want)!.text}. ${NORMS.amp(p.age)}`]},
  };
}

const occlusionQ: SetupQuestion<BVPatient> = {
  id: 'occ',
  label: 'Occlusion',
  options: [
    {id: 'mono', text: 'Occlude the fellow eye; test each eye in turn'},
    {id: 'bino', text: 'Both eyes open'},
  ],
  correct: ['mono'],
  why: 'Monocular amplitude: binocular testing adds convergence-driven accommodation and overestimates it.',
};
const lightQ: SetupQuestion<BVPatient> = {
  id: 'light',
  label: 'Illumination',
  options: [
    {id: 'good', text: 'Room lights on plus good illumination on the near target'},
    {id: 'dim', text: 'Dim room so the patient can concentrate'},
  ],
  correct: ['good'],
  why: 'Poor illumination enlarges the pupil, reduces depth of focus cues and makes the blur endpoint unreliable.',
};

const instructions = [
  {id: 'cover', text: 'I’m going to cover one eye at a time.', point: 'Explain one eye will be covered'},
  {id: 'look', text: 'Look at the smallest letters on the card and keep them as clear as you can.', point: 'Keep the letters clear'},
  {id: 'first', text: 'Tell me as soon as the letters first become blurry and stay blurry, even if you could clear them by trying hard.', point: 'Report the FIRST SUSTAINED blur'},
  {id: 'normal', text: 'It’s normal for them to go blurry — there’s no right or wrong answer.', point: 'Reassure'},
  {id: 'jargon', text: 'Report the first sustained loss of accommodative focus.', bad: 'jargon.'},
  {id: 'double', text: 'Tell me when the letters go double.', bad: 'wrong endpoint — that is NPC.'},
  {id: 'squint', text: 'Squint if you need to so they stay clear.', bad: 'squinting creates a pinhole and falsely extends the range.'},
];

// -----------------------------------------------------------------------------
// Push-up
// -----------------------------------------------------------------------------

interface PushSim extends Talkative {
  dist: number;
  speed: number;
  occ: Occ;
  reported: boolean;
  approachSpeed: number;
  measures: {eye: Eye | 'ou'; cm: number}[];
}

function PushView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: PushSim; setSim: (fn: (s: PushSim) => PushSim) => void}) {
  usePending(sim, setSim);
  const eye = tested(sim.occ);
  const A = apparentAmp(ctx, eye);
  const move = (dir: 1 | -1) => (dt: number) =>
    setSim(s => {
      const d = clamp(s.dist + dir * s.speed * dt, 3, 50);
      const bCm = 100 / apparentAmp(ctx, tested(s.occ));
      let n: PushSim = {...s, dist: d};
      if (dir < 0 && d < bCm + 8) n = {...n, approachSpeed: Math.max(n.approachSpeed, s.speed)};
      if (dir < 0 && !s.reported && d <= bCm) {
        n = later({...n, reported: true}, 650, {say: ctx.instr.includes('first') ? 'It’s just gone blurry… and it’s staying blurry.' : 'Okay, it’s really blurry now.'}, false);
      }
      if (dir > 0 && s.reported && d > bCm + 3) n = {...n, reported: false};
      return n;
    });
  const measure = () =>
    setSim(s => talk({...s, measures: [...s.measures, {eye: tested(s.occ), cm: Math.round(s.dist * 2) / 2}]}, 'note', `Measured ${s.dist.toFixed(1)} cm from the spectacle plane (${tested(s.occ).toUpperCase()}) → ${(100 / s.dist).toFixed(2)} D`));
  const over = Math.max(0, 100 / sim.dist - A);
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <EyesView pos={{od: 0, os: 0}} covered={sim.occ === 'none' ? null : sim.occ} glasses={ctx.patient.wearsSpecs && ctx.setup.rx !== 'none'} />
        <DistanceRuler cm={sim.dist} label="Target" />
        <PatientView t={{text: 'N5  ozkh', blur: Math.min(4, over * 2.2)}} title="Near target (as the patient sees it)" />
      </VStack>
      <VStack gap={2}>
        <Controls title="Push-up: move the target along the midline">
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text type="supporting">Occlude</Text>
            <SegmentedControl label="Occlude" size="sm" value={sim.occ} onChange={v => setSim(s => talk({...s, occ: v as Occ, reported: false}, 'you', v === 'none' ? 'Remove occluder' : `Occlude ${v.toUpperCase()}`))}>
              <SegmentedControlItem value="none" label="None" />
              <SegmentedControlItem value="od" label="OD" />
              <SegmentedControlItem value="os" label="OS" />
            </SegmentedControl>
          </HStack>
          <SpeedPicker value={sim.speed} onChange={v => setSim(s => ({...s, speed: v}))} options={[1, 2, 5]} unit="cm/s" />
          <HStack gap={1} wrap="wrap">
            <HoldButton label="Move closer" icon={ChevronsLeft} variant="primary" onTick={move(-1)} />
            <HoldButton label="Move away" icon={ChevronsRight} onTick={move(1)} />
            <Button label="Measure here" icon={<Icon icon={Ruler} />} onClick={measure} />
          </HStack>
          <Text type="supporting">
            Testing: <Text weight="semibold">{eye === 'ou' ? 'both eyes (binocular)' : eye.toUpperCase()}</Text>. Amplitude (D) = 100 ÷ distance (cm), measured from the
            spectacle plane.
          </Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const pushRecord = makeBVRecord<PushSim>({
  placeholder: 'e.g. AoA (push-up, cc): OD 10.00 D (10 cm), OS 10.00 D (10 cm)',
  hint: 'Each eye in dioptres; method and correction.',
  question: 'How does the amplitude compare with age norms?',
  options: AMP_OPTIONS,
});

const targetQ = (where: string): SetupQuestion<BVPatient> => ({
  id: 'target',
  label: 'Target',
  options: [
    {id: 'line', text: `Single line of near letters one line larger than best near VA (e.g. N5/0.5M) ${where}`},
    {id: 'big', text: `Large single letter (N24) ${where}`},
    {id: 'pen', text: 'Penlight'},
  ],
  correct: ['line'],
  why: 'A detailed accommodative target one line above threshold gives a sensitive blur endpoint; a penlight does not stimulate accommodation accurately.',
});

export const pushUpTest: TestDef<BVPatient, PushSim, BVRec> = {
  id: 'pushup',
  station: 'bv',
  category: 'acc',
  group: 'aoa',
  groupName: 'Monocular amplitude of accommodation',
  name: 'Amplitude — push-up (Donders)',
  short: 'Push-up AoA',
  brief: 'Occlude one eye; slowly move a near target towards the eye until the first sustained blur. Amplitude = 100 ÷ distance (cm). Repeat for the other eye.',
  instructions,
  needPoints: 3,
  setup: [rxQuestion(), occlusionQ, targetQ('on a near-point rule'), lightQ],
  initSim: () => ({...initTalk(), dist: 40, speed: 2, occ: 'none', reported: false, approachSpeed: 0, measures: []}),
  Sim: PushView,
  checks: sim => {
    const mono = sim.measures.filter(m => m.eye !== 'ou');
    const per = (e: Eye) => sim.measures.filter(m => m.eye === e).length;
    return [
      {id: 'occ', label: 'Occluded the fellow eye for every measurement', ok: sim.measures.length > 0 && mono.length === sim.measures.length, points: 1},
      {id: 'slow', label: 'Approached the blur point slowly (≤ 2 cm/s)', ok: sim.approachSpeed > 0 && sim.approachSpeed <= 2, points: 1, detail: sim.approachSpeed > 2 ? `you moved at ${sim.approachSpeed} cm/s — the reaction delay makes you overshoot` : undefined},
      {id: 'both', label: 'Measured both eyes', ok: per('od') > 0 && per('os') > 0, points: 1},
      {id: 'repeat', label: 'Repeated the measurement to confirm', ok: per('od') > 1 || per('os') > 1, points: 1},
    ];
  },
  initRec: initBVRec,
  Record: pushRecord,
  grade: (rec, _sim, ctx) => gradeAmp(rec, ctx, 1, /push|donder/i),
  model: (_sim, ctx) => {
    const p = ctx.patient;
    return `AoA (push-up, cc): OD ${p.amp.od.toFixed(2)} D (${(100 / p.amp.od).toFixed(1)} cm), OS ${p.amp.os.toFixed(2)} D (${(100 / p.amp.os).toFixed(1)} cm)`;
  },
};

// -----------------------------------------------------------------------------
// Minus lens
// -----------------------------------------------------------------------------

interface MinusSim extends Talkative {
  occ: Occ;
  lens: Record<Eye, number>;
  lastChange: number;
  rushed: number;
  bigSteps: number;
  blurAt: Record<Eye, number | null>;
}

function MinusView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: MinusSim; setSim: (fn: (s: MinusSim) => MinusSim) => void}) {
  usePending(sim, setSim);
  const eye = tested(sim.occ);
  const lensOn = eye === 'ou' ? (sim.lens.od + sim.lens.os) / 2 : sim.lens[eye];
  const demand = 2.5 - lensOn;
  const A = apparentAmp(ctx, eye);
  const change = (delta: number) =>
    setSim(s => {
      const e = tested(s.occ);
      if (e === 'ou') return talk(s, 'note', 'Occlude one eye first — the minus-lens amplitude is monocular.');
      const t = performance.now();
      const nextLens = Math.min(0, s.lens[e] + delta);
      const rushed = s.lastChange && t - s.lastChange < 1500 ? s.rushed + 1 : s.rushed;
      let n: MinusSim = {...s, lens: {...s.lens, [e]: nextLens}, lastChange: t, rushed, bigSteps: s.bigSteps + (Math.abs(delta) > 0.25 ? 1 : 0), epoch: s.epoch + 1};
      n = talk(n, 'you', `${e.toUpperCase()}: ${nextLens.toFixed(2)} D`);
      const blurry = 2.5 - nextLens >= apparentAmp(ctx, e) - 0.01;
      if (blurry && s.blurAt[e] === null) {
        n = later(n, 1500, {say: 'That’s gone blurry — and it’s staying blurry.', set: {blurAt: {...n.blurAt, [e]: nextLens}}});
      } else if (!blurry) {
        n = later(n, 1500, {say: 'Still clear.'});
      } else {
        n = later(n, 1500, {say: 'Still blurry.'});
      }
      return n;
    });
  const reset = () =>
    setSim(s => {
      const e = tested(s.occ);
      if (e === 'ou') return s;
      return talk({...s, lens: {...s.lens, [e]: 0}, blurAt: {...s.blurAt, [e]: null}, epoch: s.epoch + 1}, 'you', `${e.toUpperCase()}: back to the distance Rx`);
    });
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <EyesView
          pos={{od: 0, os: 0}}
          covered={sim.occ === 'none' ? null : sim.occ}
          lensLabel={`Trial frame over Rx — OD ${sim.lens.od.toFixed(2)} · OS ${sim.lens.os.toFixed(2)}`}
          glasses={false}
        />
        <PatientView t={{text: 'N5  ozkh', blur: Math.min(4, Math.max(0, demand - A) * 2.2)}} title="Near target at 40 cm (patient’s view)" />
      </VStack>
      <VStack gap={2}>
        <Controls title="Minus lens: target fixed at 40 cm">
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text type="supporting">Occlude</Text>
            <SegmentedControl label="Occlude" size="sm" value={sim.occ} onChange={v => setSim(s => talk({...s, occ: v as Occ}, 'you', v === 'none' ? 'Remove occluder' : `Occlude ${v.toUpperCase()}`))}>
              <SegmentedControlItem value="none" label="None" />
              <SegmentedControlItem value="od" label="OD" />
              <SegmentedControlItem value="os" label="OS" />
            </SegmentedControl>
          </HStack>
          <HStack gap={1} wrap="wrap">
            <Button label="Add −0.25 D" variant="primary" icon={<Icon icon={Minus} />} onClick={() => change(-0.25)} />
            <Button label="Add −0.50 D" icon={<Icon icon={Minus} />} onClick={() => change(-0.5)} />
            <Button label="+0.25 D" onClick={() => change(0.25)} />
            <Button label="Reset eye" variant="ghost" icon={<Icon icon={RotateCcw} />} onClick={reset} />
          </HStack>
          <Text type="supporting">
            Testing <Text weight="semibold">{eye === 'ou' ? '— occlude an eye' : eye.toUpperCase()}</Text>. Amplitude = total minus added + 2.50 D (the 40 cm demand).
          </Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const minusRecord = makeBVRecord<MinusSim>({
  placeholder: 'e.g. AoA (minus lens, 40 cm, cc): OD 8.00 D, OS 8.00 D',
  hint: 'Remember to add the 2.50 D demand of the 40 cm target.',
  question: 'How does the amplitude compare with age norms?',
  options: AMP_OPTIONS,
});

export const minusLensTest: TestDef<BVPatient, MinusSim, BVRec> = {
  id: 'minus',
  station: 'bv',
  category: 'acc',
  group: 'aoa',
  groupName: 'Monocular amplitude of accommodation',
  name: 'Amplitude — minus lens (Sheard)',
  short: 'Minus-lens AoA',
  brief: 'Occlude one eye; with the target at 40 cm add minus in −0.25 D steps until the first sustained blur. Amplitude = total minus + 2.50 D.',
  instructions,
  needPoints: 3,
  setup: [rxQuestion(), occlusionQ, targetQ('at 40 cm'), lightQ],
  initSim: () => ({...initTalk(), occ: 'none', lens: {od: 0, os: 0}, lastChange: 0, rushed: 0, bigSteps: 0, blurAt: {od: null, os: null}}),
  Sim: MinusView,
  checks: sim => [
    {id: 'occ', label: 'Tested monocularly (fellow eye occluded)', ok: sim.blurAt.od !== null || sim.blurAt.os !== null, points: 1},
    {id: 'steps', label: 'Added minus in −0.25 D steps', ok: sim.bigSteps === 0 && (sim.blurAt.od !== null || sim.blurAt.os !== null), points: 1},
    {id: 'wait', label: 'Paused after each lens for the patient to respond', ok: sim.rushed === 0 && (sim.blurAt.od !== null || sim.blurAt.os !== null), points: 1, detail: sim.rushed ? `${sim.rushed} lens change(s) before the patient answered` : undefined},
    {id: 'both', label: 'Found the blur endpoint in both eyes', ok: sim.blurAt.od !== null && sim.blurAt.os !== null, points: 1},
  ],
  initRec: initBVRec,
  Record: minusRecord,
  grade: (rec, _sim, ctx) => gradeAmp(rec, ctx, 0.5, /minus|sheard|−|-\s*lens/i),
  model: (_sim, ctx) => {
    const p = ctx.patient;
    return `AoA (minus lens, 40 cm, cc): OD ${p.amp.od.toFixed(2)} D (−${(p.amp.od - 2.5).toFixed(2)} + 2.50), OS ${p.amp.os.toFixed(2)} D (−${(p.amp.os - 2.5).toFixed(2)} + 2.50)`;
  },
};
