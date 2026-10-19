import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Minus, Plus, RotateCcw} from 'lucide-react';
import {hasDioptreUnit, mark, near, numbers, rxBias, rxQuestion} from '../marking';
import {NORMS} from '../norms';
import {fmtSigned, type BVPatient} from '../patient';
import type {Ctx, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, initTalk, later, talk, usePending, type Talkative} from '../ui/common';
import {PatientView, PhoropterView} from '../ui/visuals';

interface RelSim extends Talkative {
  /** Lens added binocularly over the distance Rx. */
  add: number;
  lastChange: number;
  rushed: number;
  bigSteps: number;
  nraAt: number | null;
  praAt: number | null;
  order: ('nra' | 'pra')[];
  /** Went back to the distance Rx between the two measurements. */
  reset: boolean;
  /** Plus was still in place when minus was started (or vice versa). */
  carried: boolean;
}

/** Limits the patient will report under the current setup. */
function limits(ctx: Ctx<BVPatient>) {
  const p = ctx.patient;
  const b = rxBias(ctx);
  const late = ctx.instr.includes('first') ? 0 : 0.5;
  // An uncorrected hyperope has less accommodation in reserve (PRA) and more relaxation available (NRA).
  return {nra: p.nra + b + late, pra: p.pra + b - late};
}

function RelView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: RelSim; setSim: (fn: (s: RelSim) => RelSim) => void}) {
  usePending(sim, setSim);
  const L = limits(ctx);
  const beyond = sim.add > 0 ? Math.max(0, sim.add - L.nra) : Math.max(0, L.pra - sim.add);
  const change = (delta: number) =>
    setSim(s => {
      const t = performance.now();
      const add = s.add + delta;
      const lim = limits(ctx);
      let n: RelSim = {
        ...s,
        add,
        lastChange: t,
        rushed: s.lastChange && t - s.lastChange < 1500 && (s.add > 0 ? s.nraAt === null : s.praAt === null) ? s.rushed + 1 : s.rushed,
        bigSteps: s.bigSteps + (Math.abs(delta) > 0.25 ? 1 : 0),
        epoch: s.epoch + 1,
      };
      if (add > 0 && !n.order.includes('nra')) n = {...n, order: [...n.order, 'nra'], carried: n.carried || s.add < 0};
      if (add < 0 && !n.order.includes('pra')) n = {...n, order: [...n.order, 'pra'], carried: n.carried || s.add > 0};
      n = talk(n, 'you', `Both eyes: ${fmtSigned(add)} D over the Rx`);
      const plusBlur = add > 0 && add >= lim.nra - 0.01;
      const minusBlur = add < 0 && add <= lim.pra + 0.01;
      if (plusBlur && s.nraAt === null) n = later(n, 1500, {say: 'They’ve gone blurry and they’re staying blurry.', set: {nraAt: add}});
      else if (minusBlur && s.praAt === null) n = later(n, 1500, {say: 'They’ve gone blurry and they’re staying blurry.', set: {praAt: add}});
      else if (plusBlur || minusBlur) n = later(n, 1500, {say: 'Still blurry.'});
      else n = later(n, 1500, {say: 'Still clear.'});
      return n;
    });
  const reset = () => setSim(s => talk({...s, add: 0, reset: s.reset || s.nraAt !== null || s.praAt !== null, epoch: s.epoch + 1}, 'you', 'Back to the distance Rx (0.00 add)'));
  const rx = ctx.setup.rx === 'none' ? {od: 0, os: 0} : ctx.patient.rx;
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <PhoropterView
          ph={{sph: {od: rx.od + sim.add, os: rx.os + sim.add}, h: {od: 0, os: 0}, v: {od: 0, os: 0}, aux: {od: 'O', os: 'O'}, risley: {od: false, os: false}}}
          caption={`Add over distance Rx: ${fmtSigned(sim.add)} D (both eyes) · near rod 40 cm`}
        />
        <PatientView t={{text: '0.5M  vnzrh', blur: Math.min(4, beyond * 2.4)}} title="Near card at 40 cm (patient’s view)" />
      </VStack>
      <VStack gap={2}>
        <Controls title="Change lenses binocularly">
          <HStack gap={1} wrap="wrap">
            <Button label="+0.25 D" variant="primary" icon={<Icon icon={Plus} />} onClick={() => change(0.25)} />
            <Button label="−0.25 D" variant="primary" icon={<Icon icon={Minus} />} onClick={() => change(-0.25)} />
            <Button label="+0.50" onClick={() => change(0.5)} />
            <Button label="−0.50" onClick={() => change(-0.5)} />
            <Button label="Back to Rx" variant="ghost" icon={<Icon icon={RotateCcw} />} onClick={reset} />
          </HStack>
          <Text type="supporting">NRA = total plus added at first sustained blur. PRA = total minus added at first sustained blur.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const OPTIONS = [
  {id: 'normal', text: 'Both within normal limits'},
  {id: 'lowNra', text: 'Low NRA — over-accommodating / reduced NFV (e.g. accommodative excess, CI)'},
  {id: 'lowPra', text: 'Low PRA — reduced accommodation / reduced PFV (e.g. AI, CE)'},
  {id: 'both', text: 'Both reduced — e.g. accommodative infacility or fusional vergence dysfunction'},
];
const interp = (p: BVPatient) => {
  const lowN = p.nra < NORMS.nra.lo;
  const lowP = p.pra > NORMS.pra.lo;
  return lowN && lowP ? 'both' : lowN ? 'lowNra' : lowP ? 'lowPra' : 'normal';
};

const Record = makeBVRecord<RelSim>({
  placeholder: 'e.g. NRA/PRA (40 cm, cc): +2.00 / −2.50 D',
  hint: 'Both values with signs and units; NRA is plus, PRA is minus.',
  question: 'How do the relative accommodation findings compare with norms?',
  options: OPTIONS,
});

export const praNraTest: TestDef<BVPatient, RelSim, BVRec> = {
  id: 'pranra',
  station: 'bv',
  category: 'acc',
  group: 'pranra',
  groupName: 'PRA / NRA',
  name: 'Relative accommodation (NRA / PRA)',
  short: 'PRA/NRA',
  brief: 'Binocularly through the distance Rx at 40 cm, add plus (NRA) in 0.25 D steps to first sustained blur, return to the Rx, then add minus (PRA).',
  instructions: [
    {id: 'look', text: 'Please look at the smallest letters you can read on the card and keep them as clear as you can.', point: 'Keep the letters clear'},
    {id: 'lenses', text: 'I’m going to change some lenses in front of both eyes.', point: 'Explain lenses will change'},
    {id: 'first', text: 'Tell me when the letters first become blurry and stay blurry.', point: 'Report the first sustained blur'},
    {id: 'double', text: 'If they go double, let me know straight away.', point: 'Report doubling'},
    {id: 'jargon', text: 'Report when you can no longer accommodate or relax accommodation.', bad: 'jargon.'},
    {id: 'cover', text: 'Close your left eye for this one.', bad: 'PRA/NRA is a binocular test.'},
  ],
  needPoints: 3,
  setup: [
    rxQuestion(),
    {
      id: 'target',
      label: 'Target',
      options: [
        {id: 'line', text: 'Line of letters one line above best near VA (e.g. 0.5M) at 40 cm on the near rod'},
        {id: 'big', text: 'Large print (N12) at 40 cm'},
        {id: 'dist', text: 'Distance chart at 6 m'},
      ],
      correct: ['line'],
      why: 'A threshold-level near target at 40 cm gives a sensitive blur endpoint.',
    },
    {
      id: 'view',
      label: 'Viewing',
      options: [
        {id: 'bino', text: 'Binocular, phoropter at near PD'},
        {id: 'mono', text: 'Monocular, fellow eye occluded'},
      ],
      correct: ['bino'],
      why: 'Relative accommodation is measured while convergence is held constant — binocularly.',
    },
    {
      id: 'light',
      label: 'Illumination',
      options: [
        {id: 'good', text: 'Room lights on with the near-point lamp on the card'},
        {id: 'dim', text: 'Room lights off'},
      ],
      correct: ['good'],
      why: 'Good target illumination keeps pupil size and the endpoint consistent.',
    },
  ],
  initSim: () => ({...initTalk(), add: 0, lastChange: 0, rushed: 0, bigSteps: 0, nraAt: null, praAt: null, order: [], reset: false, carried: false}),
  Sim: RelView,
  checks: sim => [
    {id: 'order', label: 'Measured NRA (plus) before PRA (minus)', ok: sim.order[0] === 'nra' && sim.order.includes('pra'), points: 1, detail: 'NRA first avoids carrying over accommodative stimulation from the minus.'},
    {id: 'steps', label: 'Changed lenses binocularly in 0.25 D steps', ok: sim.bigSteps === 0 && sim.order.length > 0, points: 1},
    {id: 'wait', label: 'Waited for the patient’s response after each step', ok: sim.rushed === 0 && sim.order.length > 0, points: 1},
    {id: 'reset', label: 'Returned to the distance Rx between NRA and PRA', ok: sim.reset && !sim.carried && sim.nraAt !== null && sim.praAt !== null, points: 1},
  ],
  initRec: initBVRec,
  Record,
  grade: (rec, _sim, ctx) => {
    const p = ctx.patient;
    const nums = numbers(rec.text);
    const plus = nums.filter(n => n > 0);
    const minus = nums.filter(n => n < 0);
    const nraOk = plus.some(n => near(n, p.nra, 0.25));
    const praOk = minus.some(n => near(n, p.pra, 0.25));
    const notes = nraOk && praOk ? [] : [`True values: NRA ${fmtSigned(p.nra)} D, PRA ${fmtSigned(p.pra)} D (±0.25 D).`];
    const fmt: string[] = [];
    if (!/nra/i.test(rec.text) || !/pra/i.test(rec.text)) fmt.push('Label both NRA and PRA.');
    if (!minus.length) fmt.push('PRA must be recorded with a minus sign.');
    if (!hasDioptreUnit(rec.text)) fmt.push('Include units (D).');
    const want = interp(p);
    return {
      accurate: mark(nraOk && praOk, 1, notes),
      record: mark(fmt.length === 0, 1, fmt),
      insight: {ok: rec.interp === want, notes: [`${OPTIONS.find(o => o.id === want)!.text}. Norms: ${NORMS.nra.text}; ${NORMS.pra.text}.`]},
    };
  },
  model: (_sim, ctx) => `NRA / PRA (40 cm, cc, binocular): ${fmtSigned(ctx.patient.nra)} D / ${fmtSigned(ctx.patient.pra)} D`,
};
