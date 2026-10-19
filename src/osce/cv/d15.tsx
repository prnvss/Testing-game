import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Eraser, FlipVertical2, Hand, Shuffle, Timer, Undo2, Wand2} from 'lucide-react';
import type {CVPatient} from '../patient';
import {rng, subSeed} from '../rng';
import type {Ctx, CVKey, Opt, TestDef} from '../types';
import {ConversationLog, Controls, initTalk, later, talk, usePending, type Talkative} from '../ui/common';
import {analyseD15, arrangeD15, capColor, D15_UV} from './color';
import {blankInterp, distQ, eyesQ, InterpPanel, lightQ, markCV, rxQ, TYPE_OPTIONS, type Interp} from './common';

type Phase = 'tray' | 'arranging' | 'arranged';

interface D15Sim extends Talkative {
  phase: Phase;
  shuffled: boolean;
  revealed: boolean;
  revealedEarly: boolean;
  reviewed: boolean;
  rushed: boolean;
  order: number[];
}

interface D15Rec {
  seq: number[];
  interp: Interp;
}

const PF: Opt[] = [
  {id: 'pass', text: 'Pass (0–1 major crossing)'},
  {id: 'fail', text: 'Fail (≥ 2 major crossings)'},
];
const SEV_D15: Opt[] = [
  {id: 'normal_mild', text: 'Normal or mild (passes the D-15)'},
  {id: 'mod_strong', text: 'Moderate to strong (fails the D-15)'},
];
const SEV_DESAT: Opt[] = [
  {id: 'none', text: 'No defect shown'},
  {id: 'mild', text: 'Mild (a few crossings)'},
  {id: 'mod_strong', text: 'Moderate to strong (many, regular crossings)'},
];

/** The arrangement the patient ends up with (after an optional review) in this simulation. */
function finalOrder(p: CVPatient, desat: boolean, opts: {rushed: boolean; reviewed: boolean}, label: string) {
  let order = arrangeD15(p.seed, p.defect, p.severity, desat, `${label}${opts.rushed ? '-rush' : ''}`);
  if (opts.rushed) {
    const r = rng(subSeed(p.seed, `${label}-rushswap`));
    const i = r.int(2, 12);
    order = [...order];
    [order[i], order[i + 2]] = [order[i + 2], order[i]];
  }
  if (opts.reviewed && (p.defect === 'normal' || p.severity === 'mild')) {
    // On review the patient spots and fixes one obvious adjacent swap.
    const seq = [0, ...order];
    for (let i = 1; i < seq.length - 1; i++) {
      const cost = (a: number, b: number) => Math.min(Math.abs(a - b), 16 - Math.abs(a - b));
      const before = cost(seq[i - 1], seq[i]) + cost(seq[i], seq[i + 1]) + (i + 2 < seq.length ? cost(seq[i + 1], seq[i + 2]) : 0);
      const after = cost(seq[i - 1], seq[i + 1]) + cost(seq[i + 1], seq[i]) + (i + 2 < seq.length ? cost(seq[i], seq[i + 2]) : 0);
      if (after + 1 < before) {
        [seq[i], seq[i + 1]] = [seq[i + 1], seq[i]];
        break;
      }
    }
    order = seq.slice(1);
  }
  return order;
}

export function d15Key(order: number[], desat: boolean): CVKey {
  const a = analyseD15(order);
  const near = a.angle !== null && Math.abs(a.angle - 0.5) < 5;
  const type = a.pass ? ['normal'] : a.type === 'unclassified' ? ['unclassified'] : near && a.type !== 'tritan' ? ['protan', 'deutan', 'unclassified'] : [a.type];
  const sev = desat ? (a.pass ? ['none'] : a.crossings >= 6 ? ['mod_strong'] : a.crossings <= 3 ? ['mild'] : ['mild', 'mod_strong']) : a.pass ? ['normal_mild'] : ['mod_strong'];
  return {
    pf: [a.pass ? 'pass' : 'fail'],
    type,
    sev,
    pfWhy: `${a.crossings} major (diametrical) crossing${a.crossings === 1 ? '' : 's'}${a.minor ? ` and ${a.minor} minor transposition${a.minor === 1 ? '' : 's'}` : ''}; ≥ 2 major crossings is a fail.`,
    typeWhy: a.pass
      ? desat
        ? 'Arrangement follows the hue circle — no defect shown.'
        : 'Passes — the D-15 is designed to pass mild anomalous trichromats, so it cannot exclude a mild defect.'
      : `The crossing lines run ${type.length > 1 ? 'between the protan and deutan axes (red-green, hard to classify)' : `parallel to the ${type[0]} axis`}${a.angle !== null ? ` (mean angle ${a.angle.toFixed(0)}°)` : ''}; ${desat ? `${a.crossings} crossings` : 'failing the standard D-15 indicates at least a moderate defect'}.`,
  };
}

// -----------------------------------------------------------------------------
// Score-sheet diagram
// -----------------------------------------------------------------------------

const C = 160;
const RAD = 118;
/** Schematic cap circle as on the printed score sheet: reference on the left, caps 1–15 clockwise. */
const angleOf = (i: number) => ((i === 0 ? 176 : 156 - (i - 1) * 22.5) * Math.PI) / 180;
const pos = (i: number) => ({x: C + Math.cos(angleOf(i)) * RAD, y: C - Math.sin(angleOf(i)) * RAD});

/** Axis direction (radians, screen) fitted to the classic arrangement for each defect, so the guide lines match plotted crossings. */
const CLASSIC: Record<'protan' | 'deutan' | 'tritan', number[]> = {
  protan: [15, 1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9, 7, 8],
  deutan: [1, 15, 2, 14, 3, 13, 4, 12, 5, 11, 6, 10, 7, 9, 8],
  tritan: [1, 2, 3, 4, 5, 6, 7, 15, 8, 14, 9, 13, 10, 12, 11],
};
const AXIS_DIR = Object.fromEntries(
  (Object.keys(CLASSIC) as (keyof typeof CLASSIC)[]).map(k => {
    const seq = [0, ...CLASSIC[k]];
    let sx = 0;
    let sy = 0;
    for (let i = 1; i < seq.length; i++) {
      const d = Math.abs(seq[i] - seq[i - 1]);
      if (Math.min(d, 16 - d) < 3) continue;
      const a = pos(seq[i - 1]);
      const b = pos(seq[i]);
      const th = Math.atan2(b.y - a.y, b.x - a.x);
      sx += Math.cos(2 * th);
      sy += Math.sin(2 * th);
    }
    return [k, Math.atan2(sy, sx) / 2];
  }),
) as Record<keyof typeof CLASSIC, number>;

export function D15Diagram({seq, onPick, desat, isLocked}: {seq: number[]; onPick?: (cap: number) => void; desat: boolean; isLocked?: boolean}) {
  const axes = (Object.keys(AXIS_DIR) as (keyof typeof AXIS_DIR)[]).map(k => {
    const dx = Math.cos(AXIS_DIR[k]);
    const dy = Math.sin(AXIS_DIR[k]);
    // Protan labelled at the top end, deutan at the bottom, tritan at the right, so near-parallel guides stay readable.
    const sign = k === 'tritan' ? (dx >= 0 ? 1 : -1) : (dy < 0 ? 1 : -1) * (k === 'protan' ? 1 : -1);
    const lx = Math.min(290, Math.max(30, C + sign * dx * 150 + (k === 'protan' ? -22 : k === 'deutan' ? 22 : 0)));
    const ly = Math.min(312, Math.max(12, C + sign * dy * 150 + (k === 'tritan' ? -10 : 0)));
    return {k, x1: C - dx * 150, y1: C - dy * 150, x2: C + dx * 150, y2: C + dy * 150, lx, ly};
  });
  const path = [0, ...seq].map(i => pos(i));
  return (
    <svg viewBox="0 0 320 320" width="100%" style={{maxWidth: 420, display: 'block', margin: '0 auto'}} role="img" aria-label="D-15 score sheet">
      <rect x={0} y={0} width={320} height={320} rx={16} fill="var(--color-background-muted)" />
      {axes.map(a => (
        <g key={a.k}>
          <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="var(--color-text-secondary)" strokeDasharray="5 5" opacity={0.6} />
          <text x={a.lx} y={a.ly} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
            {a.k.toUpperCase()}
          </text>
        </g>
      ))}
      {path.length > 1 && <polyline points={path.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" />}
      {D15_UV.map((_, i) => {
        const p = pos(i);
        const used = i === 0 || seq.includes(i);
        return (
          <g
            key={i}
            style={{cursor: onPick && !isLocked && !used ? 'pointer' : 'default'}}
            onClick={() => !isLocked && !used && onPick?.(i)}
            role={onPick && !isLocked ? 'button' : undefined}
            aria-label={i === 0 ? 'Reference cap' : `Cap ${i}`}>
            <circle cx={p.x} cy={p.y} r={11} fill={capColor(i, desat)} stroke={used ? 'var(--color-accent)' : 'var(--color-text-secondary)'} strokeWidth={used ? 2.5 : 1} />
            <text x={p.x} y={p.y + (i === 0 ? -16 : 4)} textAnchor="middle" fontSize={i === 0 ? 10 : 10} fontWeight={700} fill={i === 0 ? 'var(--color-text-primary)' : '#111'} style={{fontFamily: 'var(--font-family-body)', pointerEvents: 'none'}}>
              {i === 0 ? 'Ref' : i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Simulator
// -----------------------------------------------------------------------------

function CapRow({order, revealed, desat, scatter}: {order: number[]; revealed: boolean; desat: boolean; scatter: boolean}) {
  const W = 520;
  const r = rng(77);
  const caps = scatter ? r.shuffle(Array.from({length: 15}, (_, i) => i + 1)) : order;
  return (
    <svg viewBox={`0 0 ${W} ${scatter ? 150 : 110}`} width="100%" role="img" aria-label="Cap tray" style={{display: 'block'}}>
      <rect x={0} y={0} width={W} height={scatter ? 150 : 110} rx={14} fill="#121212" />
      {!scatter && (
        <g>
          <circle cx={22} cy={45} r={14} fill={capColor(0, desat)} stroke="#000" />
          <text x={22} y={80} textAnchor="middle" fontSize={10} fill="#ffffffaa">
            Ref
          </text>
        </g>
      )}
      {caps.map((c, i) => {
        const x = scatter ? 40 + (i % 8) * 60 + r.range(-12, 12) : 52 + i * 31;
        const y = scatter ? 45 + Math.floor(i / 8) * 60 + r.range(-10, 10) : 45;
        return (
          <g key={c}>
            <circle cx={x} cy={y} r={14} fill={capColor(c, desat)} stroke="#000" />
            {revealed && !scatter && (
              <text x={x} y={y + 35} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
                {c}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function makeView(desat: boolean, label: string) {
  return function D15View({ctx, sim, setSim}: {ctx: Ctx<CVPatient>; sim: D15Sim; setSim: (fn: (s: D15Sim) => D15Sim) => void}) {
    usePending(sim, setSim);
    const arrange = () =>
      setSim(s => {
        const order = finalOrder(ctx.patient, desat, {rushed: s.rushed, reviewed: false}, label);
        const n = talk({...s, phase: 'arranging' as Phase}, 'you', 'Hand the tray to the patient');
        return later(n, 2500, {say: 'Okay… I think that’s it.', set: {phase: 'arranged', order}}, false);
      });
    const review = () =>
      setSim(s => {
        const order = finalOrder(ctx.patient, desat, {rushed: s.rushed, reviewed: true}, label);
        const changed = order.join() !== s.order.join();
        return later(talk({...s, reviewed: true}, 'you', 'Have a final look — are you happy with the order?'), 1200, {say: changed ? 'Oh — I’ll swap these two.' : 'Yes, I’m happy with that.', set: {order}}, false);
      });
    return (
      <Grid columns={{minWidth: 320, max: 2}} gap={2}>
        <VStack gap={2}>
          <CapRow order={sim.order} revealed={sim.revealed} desat={desat} scatter={sim.phase !== 'arranged'} />
          <Text type="supporting">
            {sim.phase === 'tray' ? 'Caps in the tray lid.' : sim.phase === 'arranging' ? 'The patient is arranging the caps…' : sim.revealed ? 'Caps turned over: numbers read in the patient’s order.' : 'The patient’s arrangement (cap numbers face-down).'}
          </Text>
        </VStack>
        <VStack gap={2}>
          <Controls title={desat ? 'Lanthony desaturated D-15' : 'Farnsworth D-15'}>
            <HStack gap={1} wrap="wrap">
              <Button label="Shuffle caps" icon={<Icon icon={Shuffle} />} isDisabled={sim.phase !== 'tray'} onClick={() => setSim(s => talk({...s, shuffled: true}, 'you', 'Shuffle the caps in the lid'))} />
              <Button label="Give to patient" variant="primary" icon={<Icon icon={Hand} />} isDisabled={sim.phase !== 'tray'} onClick={arrange} />
              <Button label="Hurry the patient" variant="ghost" icon={<Icon icon={Timer} />} isDisabled={sim.phase === 'arranged'} onClick={() => setSim(s => talk({...s, rushed: true}, 'you', 'Quickly please, we’re short on time!'))} />
            </HStack>
            <HStack gap={1} wrap="wrap">
              <Button label="Ask to review order" icon={<Icon icon={Wand2} />} isDisabled={sim.phase !== 'arranged' || sim.revealed} onClick={review} />
              <Button
                label="Turn caps over"
                icon={<Icon icon={FlipVertical2} />}
                isDisabled={sim.revealed}
                onClick={() => setSim(s => talk({...s, revealed: s.phase === 'arranged', revealedEarly: s.phase !== 'arranged'}, 'you', s.phase === 'arranged' ? 'Turn the caps over and read the numbers' : 'Peek at the numbers under the caps'))}
              />
            </HStack>
            <Text type="supporting">Record the sequence on the score sheet below by clicking the caps in the patient’s order.</Text>
          </Controls>
          <ConversationLog log={sim.log} />
        </VStack>
      </Grid>
    );
  };
}

function makeRecord(desat: boolean) {
  return function D15Record({rec, setRec, isLocked}: {rec: D15Rec; setRec: (fn: (r: D15Rec) => D15Rec) => void; isLocked: boolean}) {
    return (
      <VStack gap={2}>
        <D15Diagram seq={rec.seq} desat={desat} isLocked={isLocked} onPick={c => setRec(r => ({...r, seq: [...r.seq, c]}))} />
        <HStack gap={1} hAlign="center" wrap="wrap">
          <Text type="supporting" hasTabularNumbers>
            Sequence: Ref–{rec.seq.join('–') || '…'}
          </Text>
          {!isLocked && (
            <>
              <Button label="Undo" size="sm" variant="ghost" icon={<Icon icon={Undo2} />} onClick={() => setRec(r => ({...r, seq: r.seq.slice(0, -1)}))} />
              <Button label="Clear" size="sm" variant="ghost" icon={<Icon icon={Eraser} />} onClick={() => setRec(r => ({...r, seq: []}))} />
            </>
          )}
        </HStack>
        <InterpPanel value={rec.interp} onChange={v => setRec(r => ({...r, interp: v}))} isLocked={isLocked} pfOptions={PF} typeOptions={TYPE_OPTIONS} sevOptions={desat ? SEV_DESAT : SEV_D15} />
      </VStack>
    );
  };
}

function makeTest(desat: boolean): TestDef<CVPatient, D15Sim, D15Rec> {
  const label = desat ? 'desat' : 'd15';
  const truthOrder = (p: CVPatient, sim: D15Sim) => (sim.order.length ? sim.order : finalOrder(p, desat, {rushed: false, reviewed: false}, label));
  return {
    id: desat ? 'lanthony' : 'd15',
    station: 'cv',
    category: 'cv',
    group: desat ? 'lanthony' : 'd15',
    groupName: desat ? 'L’Anthony desaturated D15' : 'Farnsworth D-15',
    name: desat ? 'L’Anthony desaturated D-15' : 'Farnsworth D-15',
    short: desat ? 'Desat D-15' : 'D-15',
    brief: desat
      ? 'Same procedure as the D-15 with paler caps — more sensitive, so it fails mild defects that pass the standard D-15. Plot the sequence and count major crossings.'
      : 'Hue arrangement: the patient orders 15 caps from the reference. Plot the sequence; ≥ 2 major crossings is a fail and their axis gives the type. Designed to pass mild defects.',
    instructions: [
      {id: 'ref', text: 'This first colour is fixed. Find the cap that looks most like it and put it next to it.', point: 'Start from the fixed reference cap'},
      {id: 'next', text: 'Then find the one most like that cap, and keep going until they’re all in a row.', point: 'Continue matching each cap to the last'},
      {id: 'time', text: 'Take your time — there’s no rush, it usually takes a couple of minutes.', point: 'No rush (about 2 minutes)'},
      {id: 'touch', text: 'Please hold the caps by their black sides and don’t turn them over.', point: 'Handle by the sides; don’t turn caps over'},
      {id: 'jargon', text: 'Arrange the caps in hue order along the colour circle.', bad: 'jargon.'},
      {id: 'bright', text: 'Sort them from lightest to darkest.', bad: 'wrong task — caps are matched by colour, not brightness.'},
    ],
    needPoints: 4,
    setup: [
      lightQ,
      distQ(50, [25, 75, 100]),
      eyesQ,
      rxQ,
      {
        id: 'care',
        label: 'Preserving the test',
        options: [
          {id: 'care', text: 'Caps handled by their black sides; numbers kept face-down; caps on a black background'},
          {id: 'tops', text: 'Patient may touch the coloured tops'},
          {id: 'white', text: 'Lay the caps on a white sheet'},
        ],
        correct: ['care'],
        why: 'Skin oils discolour the caps, visible numbers give the order away, and a white surround alters colour appearance.',
      },
    ],
    initSim: () => ({...initTalk(), phase: 'tray', shuffled: false, revealed: false, revealedEarly: false, reviewed: false, rushed: false, order: []}),
    Sim: makeView(desat, label),
    checks: sim => [
      {id: 'shuffle', label: 'Shuffled the caps before handing them over', ok: sim.shuffled, points: 1},
      {id: 'hidden', label: 'Kept the numbers hidden until the arrangement was finished', ok: sim.revealed && !sim.revealedEarly, points: 1},
      {id: 'review', label: 'Let the patient review their order before scoring', ok: sim.reviewed, points: 1},
      {id: 'time', label: 'Did not rush the patient', ok: !sim.rushed && sim.phase === 'arranged', points: 1},
    ],
    initRec: () => ({seq: [], interp: blankInterp()}),
    Record: makeRecord(desat),
    grade: (rec, sim, ctx) => {
      const truth = truthOrder(ctx.patient, sim);
      const diff = truth.filter((c, i) => rec.seq[i] !== c).length;
      const notes: string[] = [];
      if (rec.seq.length < 15) notes.push('The whole 15-cap sequence must be plotted.');
      else if (diff > 2) notes.push(`Plotted sequence doesn’t match the patient’s arrangement (Ref–${truth.join('–')}).`);
      return {interpret: markCV(rec.seq.length === 15 && diff <= 2, notes, rec.interp, d15Key(truth, desat), {pf: PF, type: TYPE_OPTIONS, sev: desat ? SEV_DESAT : SEV_D15})};
    },
    model: (sim, ctx) => {
      const t = truthOrder(ctx.patient, sim);
      const a = analyseD15(t);
      return `${desat ? 'Lanthony desat D-15' : 'Farnsworth D-15'} (50 cm, daylight, OU): Ref–${t.join('–')}; ${a.crossings} major crossing(s) — ${a.pass ? 'PASS' : `FAIL, ${a.type} axis`}`;
    },
    provided: {
      View: ({patient}) => <D15Diagram seq={finalOrder(patient, desat, {rushed: false, reviewed: false}, `${label}-provided`)} desat={desat} isLocked />,
      key: p => d15Key(finalOrder(p, desat, {rushed: false, reviewed: false}, `${label}-provided`), desat),
      pfOptions: PF,
      typeOptions: TYPE_OPTIONS,
      sevOptions: desat ? SEV_DESAT : SEV_D15,
    },
  };
}

export const d15Test = makeTest(false);
export const lanthonyTest = makeTest(true);
