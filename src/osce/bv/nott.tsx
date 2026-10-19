import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {ChevronsLeft, ChevronsRight, Flashlight} from 'lucide-react';
import {rxQuestion} from '../marking';
import {fmtSigned, type BVPatient, type Eye} from '../patient';
import {clamp} from '../rng';
import type {Ctx, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, HoldButton, initTalk, later, talk, usePending, type Talkative} from '../ui/common';
import {DistanceRuler, ReflexView} from '../ui/visuals';
import {gradeLagRecord, LAG_OPTIONS, measuredLag} from './mem';

interface NottSim extends Talkative {
  eye: Eye;
  dist: number;
  sweeping: boolean;
  startWith: Record<Eye, boolean>;
  sawAgainst: Record<Eye, boolean>;
  neutral: Record<Eye, number | null>;
  maxSpeed: number;
}

/** Distance (cm) at which the reflex neutralises: the eye's focus behind the card. */
const neutralCm = (ctx: Ctx<BVPatient>, eye: Eye) => 100 / Math.max(0.6, 2.5 - measuredLag(ctx, eye));

function NottSimView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: NottSim; setSim: (fn: (s: NottSim) => NottSim) => void}) {
  usePending(sim, setSim);
  const F = neutralCm(ctx, sim.eye);
  const error = 100 / sim.dist - 100 / F;
  const move = (dir: 1 | -1) => (dt: number) =>
    setSim(s => {
      const speed = 6; // cm/s while held
      return {...s, dist: clamp(s.dist + dir * speed * dt, 25, 100), maxSpeed: Math.max(s.maxSpeed, speed)};
    });
  const sweep = () =>
    setSim(s => {
      const err = 100 / s.dist - 100 / neutralCm(ctx, s.eye);
      let n: NottSim = {...s, sweeping: true};
      if (s.dist <= 41) n = {...n, startWith: {...n.startWith, [s.eye]: true}};
      if (err < -0.12) n = {...n, sawAgainst: {...n.sawAgainst, [s.eye]: true}};
      if (Math.abs(err) <= 0.12) n = talk({...n, neutral: {...n.neutral, [s.eye]: Math.round(s.dist)}}, 'note', `${s.eye.toUpperCase()} looks neutral at ${Math.round(s.dist)} cm`);
      return later(n, 1500, {set: {sweeping: false}}, false);
    });
  const motion = Math.abs(error) <= 0.12 ? 'neutral' : error > 0 ? 'with' : 'against';
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <ReflexView error={error} sweeping={sim.sweeping} lensLabel={`${sim.eye.toUpperCase()} · scope at ${sim.dist.toFixed(0)} cm`} />
        <DistanceRuler cm={sim.dist} max={100} label="Retinoscope" marks={[{cm: 40, text: 'card 40 cm'}]} />
      </VStack>
      <VStack gap={2}>
        <Controls title="Dynamic retinoscopy (card fixed at 40 cm)">
          <HStack gap={1} vAlign="center">
            <Text type="supporting">Eye</Text>
            <SegmentedControl label="Eye" size="sm" value={sim.eye} onChange={v => setSim(s => ({...s, eye: v as Eye}))}>
              <SegmentedControlItem value="od" label="OD" />
              <SegmentedControlItem value="os" label="OS" />
            </SegmentedControl>
          </HStack>
          <HStack gap={1} wrap="wrap">
            <HoldButton label="Move scope back" icon={ChevronsRight} onTick={move(1)} />
            <HoldButton label="Move scope closer" icon={ChevronsLeft} onTick={move(-1)} />
            <Button label="Sweep" variant="primary" icon={<Icon icon={Flashlight} />} onClick={sweep} />
          </HStack>
          <Text type="supporting">
            Reflex: <Text weight="semibold">{sim.sweeping ? `${motion}${motion === 'neutral' ? '' : ' motion'}` : 'sweep to judge'}</Text>. Lag = 2.50 D − (100 ÷
            neutral distance in cm).
          </Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const Record = makeBVRecord<NottSim>({
  placeholder: 'e.g. NOTT (40 cm, cc): OD +0.50 D (neutral 50 cm), OS +0.50 D',
  hint: 'Convert the neutral distance to a lag in dioptres for each eye.',
  question: 'What does the lag of accommodation indicate?',
  options: LAG_OPTIONS,
});

export const nottTest: TestDef<BVPatient, NottSim, BVRec> = {
  id: 'nott',
  station: 'bv',
  category: 'acc',
  group: 'accuracy',
  groupName: 'Accuracy of accommodation',
  name: 'Nott dynamic retinoscopy',
  short: 'NOTT',
  brief: 'The patient reads a card fixed at 40 cm; move the retinoscope back behind the card until the reflex neutralises. Lag = 2.50 D − 1/(neutral distance in m).',
  instructions: [
    {id: 'read', text: 'Please read the letters on this card quietly to yourself, and keep them clear.', point: 'Keep the letters on the card clear'},
    {id: 'look', text: 'Keep both eyes open and keep looking at the card, even when the light moves.', point: 'Keep looking at the card with both eyes open'},
    {id: 'light', text: 'I’ll be shining a light towards your eyes from behind the card — it may be a little bright.', point: 'Warn about the light'},
    {id: 'still', text: 'Try to keep your head still for me.', point: 'Keep the head still'},
    {id: 'jargon', text: 'Fixate the near target and maintain your accommodative response.', bad: 'jargon the patient won’t understand.'},
    {id: 'follow', text: 'Follow the light with your eyes as I move back.', bad: 'the patient must keep looking at the card, not the light.'},
  ],
  needPoints: 3,
  setup: [
    rxQuestion(),
    {
      id: 'target',
      label: 'Target',
      options: [
        {id: 'card40', text: 'Near card at 40 cm, held fixed (scope moves behind it)'},
        {id: 'cardScope', text: 'Card attached to the retinoscope so it moves with the scope'},
        {id: 'chart', text: 'Distance chart at 6 m'},
      ],
      correct: ['card40'],
      why: 'In Nott the stimulus stays at 40 cm and only the retinoscope moves.',
    },
    {
      id: 'room',
      label: 'Room illumination',
      options: [
        {id: 'lights', text: 'Normal room lighting'},
        {id: 'dark', text: 'Room lights off'},
      ],
      correct: ['lights'],
      why: 'The card must be easy to read.',
    },
    {
      id: 'view',
      label: 'Viewing conditions',
      options: [
        {id: 'bino', text: 'Binocular — both eyes open'},
        {id: 'mono', text: 'Monocular — fellow eye occluded'},
      ],
      correct: ['bino'],
      why: 'The habitual binocular response is measured.',
    },
  ],
  initSim: () => ({...initTalk(), eye: 'od', dist: 40, sweeping: false, startWith: {od: false, os: false}, sawAgainst: {od: false, os: false}, neutral: {od: null, os: null}, maxSpeed: 0}),
  Sim: NottSimView,
  checks: sim => [
    {id: 'start', label: 'Started with the scope at the card plane (40 cm) to judge the initial motion', ok: sim.startWith.od || sim.startWith.os, points: 1},
    {id: 'bracket', label: 'Bracketed neutrality (went past to against motion, then back)', ok: sim.sawAgainst.od || sim.sawAgainst.os, points: 1},
    {id: 'od', label: 'Found neutrality OD', ok: sim.neutral.od !== null, points: 1},
    {id: 'os', label: 'Found neutrality OS', ok: sim.neutral.os !== null, points: 1},
  ],
  initRec: initBVRec,
  Record,
  grade: (rec, _sim, ctx) => gradeLagRecord(rec, ctx, 'NOTT|Nott'),
  model: (_sim, ctx) => {
    const p = ctx.patient;
    const cm = (e: Eye) => Math.round(100 / (2.5 - p.lag[e]));
    return `NOTT (40 cm, cc, binocular): OD ${fmtSigned(p.lag.od)} D (neutral ${cm('od')} cm), OS ${fmtSigned(p.lag.os)} D (neutral ${cm('os')} cm)`;
  },
};
