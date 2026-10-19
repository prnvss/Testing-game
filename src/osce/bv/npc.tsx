import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {ChevronsLeft, ChevronsRight, Flag, Undo2} from 'lucide-react';
import {hasCmUnit, mark, near, numbers, rxQuestion} from '../marking';
import {NORMS} from '../norms';
import type {BVPatient, Eye} from '../patient';
import {clamp} from '../rng';
import type {Ctx, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, HoldButton, initTalk, later, SpeedPicker, talk, usePending, type Talkative} from '../ui/common';
import {DistanceRuler, EyesView} from '../ui/visuals';

interface NpcSim extends Talkative {
  dist: number;
  speed: number;
  broken: boolean;
  approachSpeed: number;
  minDistAfterBreak: number;
  breaks: number[];
  recs: number[];
  runs: number;
}

function NpcView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: NpcSim; setSim: (fn: (s: NpcSim) => NpcSim) => void}) {
  usePending(sim, setSim);
  const p = ctx.patient;
  const reportsDouble = !p.npc.suppresses;
  const move = (dir: 1 | -1) => (dt: number) =>
    setSim(s => {
      const d = clamp(s.dist + dir * s.speed * dt, 1, 50);
      let n: NpcSim = {...s, dist: d};
      if (dir < 0 && d < p.npc.brk + 8) n = {...n, approachSpeed: Math.max(n.approachSpeed, s.speed)};
      if (!s.broken && d <= p.npc.brk) {
        n = {...n, broken: true, minDistAfterBreak: d, runs: s.runs + 1};
        n = talk(n, 'note', `${p.npc.driftEye === 'od' ? 'Right' : 'Left'} eye drifts outward`);
        if (reportsDouble) n = later(n, ctx.instr.includes('double') ? 600 : 1800, {say: ctx.instr.includes('double') ? 'It’s gone double!' : 'Um… I think it’s two now?'}, false);
      }
      if (s.broken) n = {...n, minDistAfterBreak: Math.min(n.minDistAfterBreak, d)};
      if (s.broken && d >= p.npc.rec) {
        n = talk({...n, broken: false}, 'note', `${p.npc.driftEye === 'od' ? 'Right' : 'Left'} eye moves back in — realigned`);
        if (reportsDouble) n = later(n, 600, {say: ctx.instr.includes('single') ? 'It’s one again.' : 'Oh, it’s back to normal.'}, false);
      }
      return n;
    });
  const note = (kind: 'break' | 'rec') =>
    setSim(s => {
      const d = Math.round(s.dist * 2) / 2;
      return talk(kind === 'break' ? {...s, breaks: [...s.breaks, d]} : {...s, recs: [...s.recs, d]}, 'note', `Noted ${kind === 'break' ? 'break' : 'recovery'} at ${d} cm`);
    });
  // Convergence per eye in Δ (shown scaled); the drifting eye swings out after the break.
  const demand = (p.pd.near / 10) * (100 / sim.dist) * 0.5 * 0.55;
  const pos: Record<Eye, number> = {od: demand, os: demand};
  if (sim.broken) pos[p.npc.driftEye] = -3;
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <EyesView pos={pos} glasses={ctx.patient.wearsSpecs && ctx.setup.rx !== 'none'} />
        <DistanceRuler cm={sim.dist} label="Target from bridge of nose" />
      </VStack>
      <VStack gap={2}>
        <Controls title="Move the target along the midline">
          <SpeedPicker value={sim.speed} onChange={v => setSim(s => ({...s, speed: v}))} options={[1, 2, 5]} unit="cm/s" />
          <HStack gap={1} wrap="wrap">
            <HoldButton label="Move closer" icon={ChevronsLeft} variant="primary" onTick={move(-1)} />
            <HoldButton label="Move away" icon={ChevronsRight} onTick={move(1)} />
          </HStack>
          <HStack gap={1} wrap="wrap">
            <Button label="Note break here" icon={<Icon icon={Flag} />} onClick={() => note('break')} />
            <Button label="Note recovery here" icon={<Icon icon={Undo2} />} onClick={() => note('rec')} />
          </HStack>
          <Text type="supporting">Watch the eyes as well as listening — some patients suppress and never report doubling.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const OPTIONS = [
  {id: 'normal', text: 'Normal NPC (break ≤ 5 cm, recovery ≤ 7 cm)'},
  {id: 'receded', text: 'Receded NPC — consistent with convergence insufficiency'},
];
const interp = (p: BVPatient) => (p.npc.brk > NORMS.npc.brk || p.npc.rec > NORMS.npc.rec ? 'receded' : 'normal');

const Record = makeBVRecord<NpcSim>({
  placeholder: 'e.g. NPC (accommodative target): 6 / 9 cm, OS drifts out',
  hint: 'Break / recovery in cm, target, which eye deviated; note suppression if no diplopia.',
  question: 'Is the near point of convergence normal?',
  options: OPTIONS,
});

export const npcTest: TestDef<BVPatient, NpcSim, BVRec> = {
  id: 'npc',
  station: 'bv',
  category: 'nearVerg',
  group: 'npc',
  groupName: 'Near point of convergence',
  name: 'Near point of convergence',
  short: 'NPC',
  brief: 'Slowly move an accommodative target towards the bridge of the nose until the patient reports doubling or an eye drifts out (break), then away until single (recovery).',
  instructions: [
    {id: 'look', text: 'Keep looking at the letter on this stick and keep it single and clear as it comes towards you.', point: 'Keep the letter single and clear'},
    {id: 'double', text: 'Tell me as soon as it goes double.', point: 'Report doubling (break)'},
    {id: 'single', text: 'When I move it away, tell me when it becomes one again.', point: 'Report when it is single again (recovery)'},
    {id: 'blur', text: 'If it goes blurry, try to make it clear again.', point: 'Keep it clear'},
    {id: 'jargon', text: 'Report diplopia and fusion recovery.', bad: 'jargon — say “double” and “one again”.'},
    {id: 'close', text: 'Close one eye if it starts to feel uncomfortable.', bad: 'NPC is binocular; closing an eye ends the test.'},
  ],
  needPoints: 3,
  setup: [
    rxQuestion(),
    {
      id: 'target',
      label: 'Target',
      options: [
        {id: 'acc', text: 'Accommodative target — single small letter (one line above best near VA) on a fixation stick'},
        {id: 'pen', text: 'Penlight only'},
        {id: 'finger', text: 'Examiner’s finger tip'},
      ],
      correct: ['acc'],
      why: 'An accommodative target is the standard for NPC (Scheiman norms); it drives accommodative convergence.',
    },
    {
      id: 'measure',
      label: 'Measuring from',
      options: [
        {id: 'nose', text: 'Bridge of the nose / spectacle plane, with a ruler'},
        {id: 'cornea', text: 'Lateral canthus'},
        {id: 'est', text: 'Estimate by eye'},
      ],
      correct: ['nose'],
      why: 'NPC is measured from the bridge of the nose (spectacle plane) for comparison with norms.',
    },
    {
      id: 'room',
      label: 'Illumination',
      options: [
        {id: 'lights', text: 'Room lights on, target well lit'},
        {id: 'dark', text: 'Room lights off'},
      ],
      correct: ['lights'],
      why: 'You need to see the eyes to detect the objective break.',
    },
  ],
  initSim: () => ({...initTalk(), dist: 40, speed: 2, broken: false, approachSpeed: 0, minDistAfterBreak: 99, breaks: [], recs: [], runs: 0}),
  Sim: NpcView,
  checks: (sim, ctx) => {
    const p = ctx.patient;
    return [
      {id: 'slow', label: 'Moved the target slowly (≤ 2 cm/s) near the endpoint', ok: sim.approachSpeed > 0 && sim.approachSpeed <= 2, points: 1},
      {id: 'stop', label: 'Stopped at the break instead of pushing on to the nose', ok: sim.runs > 0 && sim.minDistAfterBreak >= p.npc.brk - 2.5, points: 1},
      {id: 'rec', label: 'Measured recovery by moving the target away', ok: sim.recs.length > 0, points: 1},
      {id: 'repeat', label: 'Repeated the measurement (NPC can recede with fatigue)', ok: sim.runs > 1, points: 1},
    ];
  },
  initRec: initBVRec,
  Record,
  grade: (rec, _sim, ctx) => {
    const p = ctx.patient;
    const nums = numbers(rec.text).map(Math.abs).filter(n => n > 0 && n < 50);
    const accurate = nums.length >= 2 && near(nums[0], p.npc.brk, 2) && near(nums[1], p.npc.rec, 3);
    const notes = accurate ? [] : [`True NPC: ${p.npc.brk} / ${p.npc.rec} cm (break ±2 cm, recovery ±3 cm).`];
    if (p.npc.suppresses) notes.push('This patient suppresses — the break had to be judged objectively (eye drifting out).');
    const fmt: string[] = [];
    if (!hasCmUnit(rec.text)) fmt.push('Record in cm.');
    if (nums.length < 2) fmt.push('Record both break and recovery (break / recovery).');
    if (!/npc/i.test(rec.text)) fmt.push('Label the test (NPC).');
    const want = interp(p);
    return {
      accurate: mark(accurate, 1, notes),
      record: mark(fmt.length === 0, 1, fmt),
      insight: {ok: rec.interp === want, notes: [`${OPTIONS.find(o => o.id === want)!.text}. Norm: ${NORMS.npc.text}.`]},
    };
  },
  model: (_s, ctx) => {
    const p = ctx.patient;
    return `NPC (accommodative target, cc): ${p.npc.brk} / ${p.npc.rec} cm, ${p.npc.driftEye.toUpperCase()} drifts out${p.npc.suppresses ? ', no diplopia reported (suppression)' : ''}`;
  },
};
