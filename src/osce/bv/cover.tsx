import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {EyeOff, Eye as EyeIcon} from 'lucide-react';
import {hasPrismUnit, mark, near, numbers, phoriaDir, rxBias, rxQuestion} from '../marking';
import {NORMS} from '../norms';
import {fmtPhoria, type BVPatient, type Eye} from '../patient';
import type {Ctx, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, initTalk, later, now, talk, usePending, type Talkative} from '../ui/common';
import {EyesView} from '../ui/visuals';

export const PRISM_STEPS = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40];

interface CoverSim extends Talkative {
  cover: Eye | null;
  coverSince: number;
  uncoveredAt: number;
  pos: Record<Eye, number>;
  prismEye: Eye;
  base: 'BI' | 'BO';
  amount: number;
  unilateral: Record<Eye, boolean>;
  alternations: number;
  altBeforeUnilateral: boolean;
  shortDwell: number;
  firstBase: 'BI' | 'BO' | null;
  sawReversal: boolean;
  neutralAt: number[];
}

/** Effective near phoria (+ eso) under the chosen correction (AC/A ≈ 4Δ/D). */
export const nearPhoria = (ctx: Ctx<BVPatient>) => ctx.patient.phoriaN + 4 * rxBias(ctx);

const residual = (ctx: Ctx<BVPatient>, s: Pick<CoverSim, 'base' | 'amount'>) => nearPhoria(ctx) - (s.base === 'BO' ? s.amount : -s.amount);

const size = (d: number) => (d < 4 ? 'small' : d < 10 ? 'moderate' : 'large');

function CoverView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: CoverSim; setSim: (fn: (s: CoverSim) => CoverSim) => void}) {
  usePending(sim, setSim);

  /** Movement of `eye` as it takes up fixation after being under cover for `dwell` s. */
  const takeUp = (s: CoverSim, eye: Eye, dwell: number): CoverSim => {
    const R = residual(ctx, s);
    const f = Math.min(1, dwell / 1.5);
    const dev = R * f;
    if (Math.abs(dev) < 1.5) return talk(s, 'note', `${eye.toUpperCase()}: no movement`);
    // Exo deviation (R<0) → eye was out, moves in to fixate.
    const dir = dev < 0 ? 'inward (from out)' : 'outward (from in)';
    let n = talk(s, 'note', `${eye.toUpperCase()}: ${size(Math.abs(dev))} ${dir} movement`);
    n = {...n, pos: {...n.pos, [eye]: dev}};
    if (s.amount > 0 && Math.sign(R) !== Math.sign(nearPhoria(ctx)) && Math.abs(R) >= 1.5) n = {...n, sawReversal: true};
    return later(n, 150, {set: {pos: {...n.pos, [eye]: 0}}}, false);
  };

  const coverEye = (eye: Eye) =>
    setSim(s => {
      const t = now();
      if (s.cover === eye) return s;
      const R = residual(ctx, s);
      let n: CoverSim = {...s, pos: {...s.pos, [eye]: R}};
      if (s.cover && s.cover !== eye) {
        // Alternate cover: transfer straight across.
        const dwell = (t - s.coverSince) / 1000;
        n = {...n, alternations: s.alternations + 1, shortDwell: s.shortDwell + (dwell < 1.5 ? 1 : 0)};
        if (!(s.unilateral.od && s.unilateral.os)) n = {...n, altBeforeUnilateral: true};
        n = talk(n, 'you', `Cover → ${eye.toUpperCase()}`);
        n = takeUp(n, s.cover, dwell);
        if (s.amount > 0 && Math.abs(residual(ctx, s)) < 1.5) n = {...n, neutralAt: [...n.neutralAt, s.amount]};
      } else {
        // Fixing eye doesn't move when the other is covered: phoria, not tropia.
        n = talk(n, 'you', `Cover ${eye.toUpperCase()}`);
        n = talk(n, 'note', `${eye === 'od' ? 'OS' : 'OD'}: no movement`);
      }
      return {...n, cover: eye, coverSince: t};
    });

  const uncover = () =>
    setSim(s => {
      if (!s.cover) return s;
      const t = now();
      const dwell = (t - s.coverSince) / 1000;
      let n: CoverSim = {...s, cover: null, uncoveredAt: t, unilateral: dwell >= 1 ? {...s.unilateral, [s.cover]: true} : s.unilateral};
      n = talk(n, 'you', `Uncover ${s.cover.toUpperCase()}`);
      return takeUp(n, s.cover, dwell);
    });

  const setPrism = (patch: Partial<Pick<CoverSim, 'base' | 'amount' | 'prismEye'>>) =>
    setSim(s => {
      const n = {...s, ...patch};
      return {...n, firstBase: s.firstBase ?? (n.amount > 0 ? n.base : null)};
    });

  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <EyesView pos={sim.pos} covered={sim.cover} prism={sim.amount > 0 ? {eye: sim.prismEye, base: sim.base, amount: sim.amount} : null} glasses={ctx.patient.wearsSpecs && ctx.setup.rx !== 'none'} />
        <Text type="supporting">
          Patient fixating an accommodative target at 40 cm. Watch the eye that is <Text weight="semibold">uncovered</Text> — the direction it moves to take up
          fixation tells you the deviation (moves in → it was out → exo).
        </Text>
      </VStack>
      <VStack gap={2}>
        <Controls title="Occluder">
          <HStack gap={1} wrap="wrap">
            <Button label="Cover OD" icon={<Icon icon={EyeOff} />} onClick={() => coverEye('od')} variant={sim.cover === 'od' ? 'primary' : 'secondary'} />
            <Button label="Cover OS" icon={<Icon icon={EyeOff} />} onClick={() => coverEye('os')} variant={sim.cover === 'os' ? 'primary' : 'secondary'} />
            <Button label="Uncover" icon={<Icon icon={EyeIcon} />} onClick={uncover} isDisabled={!sim.cover} />
          </HStack>
          <Text type="supporting">Clicking the other eye while one is covered moves the occluder straight across (alternate cover).</Text>
        </Controls>
        <Controls title="Prism bar">
          <HStack gap={1} vAlign="center" wrap="wrap">
            <SegmentedControl label="Prism eye" size="sm" value={sim.prismEye} onChange={v => setPrism({prismEye: v as Eye})}>
              <SegmentedControlItem value="od" label="Over OD" />
              <SegmentedControlItem value="os" label="Over OS" />
            </SegmentedControl>
            <SegmentedControl label="Base" size="sm" value={sim.base} onChange={v => setPrism({base: v as 'BI' | 'BO'})}>
              <SegmentedControlItem value="BI" label="Base in" />
              <SegmentedControlItem value="BO" label="Base out" />
            </SegmentedControl>
          </HStack>
          <Selector
            label="Prism power"
            size="sm"
            value={String(sim.amount)}
            options={PRISM_STEPS.map(p => ({value: String(p), label: p === 0 ? 'No prism' : `${p}Δ`}))}
            onChange={v => setPrism({amount: Number(v)})}
          />
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const OPTIONS = [
  {id: 'normal', text: 'Within normal limits for near (ortho to 6Δ XP)'},
  {id: 'exo', text: 'Excessive exophoria at near (> 6Δ XP) — e.g. convergence insufficiency / basic exo'},
  {id: 'eso', text: 'Esophoria at near — e.g. convergence excess'},
];
const interp = (p: BVPatient) => (p.phoriaN > NORMS.phoriaN.eso + 0.5 ? 'eso' : p.phoriaN < -NORMS.phoriaN.exo ? 'exo' : 'normal');

const Record = makeBVRecord<CoverSim>({
  placeholder: 'e.g. CT (near, 40 cm, cc): 6Δ XP, no tropia',
  hint: 'Distance tested, correction, size in Δ and direction (XP/EP), phoria vs tropia.',
  question: 'How does the near deviation compare with the norm?',
  options: OPTIONS,
});

export const coverTest: TestDef<BVPatient, CoverSim, BVRec> = {
  id: 'cover',
  station: 'bv',
  category: 'nearVerg',
  group: 'cover',
  groupName: 'Cover test with prism neutralisation',
  name: 'Cover test with prism neutralisation (near)',
  short: 'Cover test',
  brief: 'Cover–uncover each eye to rule out a tropia, then alternate cover, and neutralise the movement with a prism bar (BI for exo, BO for eso) until no movement, bracketing past reversal.',
  instructions: [
    {id: 'look', text: 'Please look at this letter and keep it as clear as you can the whole time.', point: 'Keep looking at the letter and keep it clear'},
    {id: 'cover', text: 'I’ll be covering your eyes one at a time — just keep looking at the letter even when an eye is covered.', point: 'Explain covering; keep looking even when covered'},
    {id: 'still', text: 'Try to keep your head still.', point: 'Keep the head still'},
    {id: 'jargon', text: 'Maintain bifoveal fixation while I dissociate you.', bad: 'jargon.'},
    {id: 'follow', text: 'Follow the occluder with your eyes.', bad: 'the patient must keep fixating the target.'},
  ],
  needPoints: 2,
  setup: [
    rxQuestion(),
    {
      id: 'target',
      label: 'Fixation target',
      options: [
        {id: 'acc', text: 'Accommodative target: single letter one line above best near VA, held at 40 cm'},
        {id: 'pen', text: 'Penlight at 40 cm'},
        {id: 'dist', text: 'Distance spotlight at 6 m'},
      ],
      correct: ['acc'],
      why: 'An accommodative target controls accommodation so the near phoria isn’t under-estimated.',
    },
    {
      id: 'room',
      label: 'Illumination',
      options: [
        {id: 'lights', text: 'Room lights on'},
        {id: 'dark', text: 'Room lights off'},
      ],
      correct: ['lights'],
      why: 'You need to see the eye movements clearly.',
    },
    {
      id: 'prism',
      label: 'Prism equipment',
      options: [
        {id: 'hbar', text: 'Horizontal prism bar'},
        {id: 'vbar', text: 'Vertical prism bar'},
        {id: 'none', text: 'No prism — estimate size'},
      ],
      correct: ['hbar'],
      why: 'A horizontal bar is needed to neutralise a horizontal deviation.',
    },
  ],
  initSim: () => ({
    ...initTalk(),
    cover: null,
    coverSince: 0,
    uncoveredAt: 0,
    pos: {od: 0, os: 0},
    prismEye: 'od',
    base: 'BI',
    amount: 0,
    unilateral: {od: false, os: false},
    alternations: 0,
    altBeforeUnilateral: false,
    shortDwell: 0,
    firstBase: null,
    sawReversal: false,
    neutralAt: [],
  }),
  Sim: CoverView,
  checks: (sim, ctx) => {
    const P = nearPhoria(ctx);
    const ortho = Math.abs(P) < 1;
    return [
      {id: 'uni', label: 'Cover–uncover on each eye before alternating', ok: sim.unilateral.od && sim.unilateral.os && !sim.altBeforeUnilateral, points: 1},
      {id: 'dwell', label: 'Held the occluder ≥ 1.5–2 s on each eye when alternating (full dissociation)', ok: sim.alternations >= 2 && sim.shortDwell === 0, points: 1},
      {id: 'base', label: 'Used the correct prism base for the deviation (BI for exo, BO for eso)', ok: ortho ? sim.alternations >= 2 : sim.firstBase === (P < 0 ? 'BI' : 'BO'), points: 1},
      {id: 'bracket', label: 'Bracketed: found the reversal and the neutral point', ok: ortho ? sim.alternations >= 2 : sim.sawReversal && sim.neutralAt.length > 0, points: 1},
    ];
  },
  initRec: initBVRec,
  Record,
  grade: (rec, _sim, ctx) => {
    const p = ctx.patient;
    const truth = p.phoriaN;
    const dir = phoriaDir(rec.text);
    const val = numbers(rec.text).filter(n => n !== 40 && n !== 6 * 100).find(n => Math.abs(n) <= 45);
    const ortho = Math.abs(truth) < 1;
    const accurate = ortho ? dir === 'ortho' || (val !== undefined && Math.abs(val) <= 1) : val !== undefined && near(Math.abs(val), Math.abs(truth), 2) && dir === (truth < 0 ? 'exo' : 'eso');
    const notes = accurate ? [] : [`True near deviation: ${fmtPhoria(truth)} (±2Δ, correct direction).`];
    if (rxBias(ctx) !== 0) notes.push('The wrong correction changed the accommodative demand and therefore the near phoria you measured.');
    const fmt: string[] = [];
    if (!ortho && !hasPrismUnit(rec.text)) fmt.push('Record the size in prism dioptres (Δ).');
    if (!dir) fmt.push('State the direction (XP / EP / ortho).');
    if (!/near|40\s*cm|\bn\b/i.test(rec.text)) fmt.push('State the test distance (near / 40 cm).');
    const want = interp(p);
    return {
      accurate: mark(accurate, 1, notes),
      record: mark(fmt.length === 0, 1, fmt),
      insight: {ok: rec.interp === want, notes: [`${OPTIONS.find(o => o.id === want)!.text}. Norm: ${NORMS.phoriaN.text}.`]},
    };
  },
  model: (_s, ctx) => `CT (near 40 cm, cc, accommodative target): ${fmtPhoria(ctx.patient.phoriaN)} (prism neutralised), no tropia`,
};
