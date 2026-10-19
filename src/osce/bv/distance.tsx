import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {ChevronDown, ChevronUp, EyeClosed, Eye as EyeIcon, MessageCircleQuestion, RotateCcw, Undo2} from 'lucide-react';
import {hasPrismUnit, mark, near, numbers, phoriaDir, rxBias, rxQuestion} from '../marking';
import {NORMS} from '../norms';
import {fmtPhoria, type BVPatient, type Eye, type Vergence} from '../patient';
import type {Ctx, SetupQuestion, TestDef} from '../types';
import {initBVRec, makeBVRecord, type BVRec} from '../ui/BVRecord';
import {ConversationLog, Controls, HoldButton, initTalk, later, now, SpeedPicker, talk, usePending, type Talkative} from '../ui/common';
import {EyesView, PatientView, PhoropterView} from '../ui/visuals';
import {PRISM_STEPS} from './cover';

/** Effective distance phoria: uncorrected hyperopes accommodate at distance → more eso. */
const distPhoria = (ctx: Ctx<BVPatient>) => ctx.patient.phoriaD + 4 * Math.max(0, rxBias(ctx));

const PHORIA_OPTIONS = [
  {id: 'normal', text: 'Within normal limits at distance (3Δ XP to 1Δ EP)'},
  {id: 'exo', text: 'Excessive exophoria at distance — e.g. divergence excess / basic exo'},
  {id: 'eso', text: 'Excessive esophoria at distance — e.g. divergence insufficiency / basic eso'},
];
const phoriaInterp = (p: BVPatient) => (p.phoriaD > NORMS.phoriaD.eso ? 'eso' : p.phoriaD < -NORMS.phoriaD.exo ? 'exo' : 'normal');

function gradePhoria(rec: BVRec, ctx: Ctx<BVPatient>, label: RegExp, labelName: string) {
  const p = ctx.patient;
  const truth = p.phoriaD;
  const dir = phoriaDir(rec.text);
  const val = numbers(rec.text).filter(n => n !== 6).find(n => Math.abs(n) <= 40);
  const ortho = Math.abs(truth) < 1;
  const accurate = ortho ? dir === 'ortho' || (val !== undefined && Math.abs(val) <= 1) : val !== undefined && near(Math.abs(val), Math.abs(truth), 2) && dir === (truth < 0 ? 'exo' : 'eso');
  const notes = accurate ? [] : [`True distance phoria: ${fmtPhoria(truth)} (±2Δ, correct direction).`];
  if (rxBias(ctx) > 0) notes.push('An uncorrected hyperope accommodates at distance, shifting the phoria towards eso.');
  const fmt: string[] = [];
  if (!ortho && !hasPrismUnit(rec.text)) fmt.push('Record the size in prism dioptres (Δ).');
  if (!dir) fmt.push('State the direction (XP / EP / ortho).');
  if (!label.test(rec.text)) fmt.push(`Name the technique (${labelName}).`);
  if (!/dist|6\s*m|\bd\b/i.test(rec.text)) fmt.push('State the test distance (6 m / distance).');
  const want = phoriaInterp(p);
  return {
    accurate: mark(accurate, 1, notes),
    record: mark(fmt.length === 0, 1, fmt),
    insight: {ok: rec.interp === want, notes: [`${PHORIA_OPTIONS.find(o => o.id === want)!.text}. Norm: ${NORMS.phoriaD.text}.`]},
  };
}

const distTargetQ = (what: string): SetupQuestion<BVPatient> => ({
  id: 'target',
  label: 'Target',
  options: [
    {id: 'good', text: what},
    {id: 'near', text: 'Near card at 40 cm'},
    {id: 'big', text: 'Largest letter on the chart (6/60)'},
  ],
  correct: ['good'],
  why: 'An accommodative target one line above best VA at 6 m controls accommodation at distance.',
});

// -----------------------------------------------------------------------------
// Von Graefe
// -----------------------------------------------------------------------------

interface VGSim extends Talkative {
  h: number; // OD signed (BO +)
  v: number; // OS signed (BU +)
  eyesClosed: boolean;
  setWhileOpen: boolean;
  rate: number;
  maxRate: number;
  alignedFrom: {bi: boolean; bo: boolean};
  lastR: number;
  asked: number;
}

function VGView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: VGSim; setSim: (fn: (s: VGSim) => VGSim) => void}) {
  usePending(sim, setSim);
  const P = distPhoria(ctx);
  const dissociated = Math.abs(sim.v) >= 4;
  const r = sim.h - P;
  const describe = (rr: number) => (Math.abs(rr) < 1 ? 'They’re lined up — the top one is right above the bottom one.' : `The top one is to the ${rr < 0 ? 'right' : 'left'}.`);
  const rotate = (dir: 1 | -1) => (dt: number) =>
    setSim(s => {
      if (s.eyesClosed) return s;
      const h = s.h + dir * s.rate * dt;
      const rr = h - distPhoria(ctx);
      let n: VGSim = {...s, h, maxRate: Math.max(s.maxRate, s.rate), lastR: rr};
      if (Math.abs(s.v) >= 4 && Math.sign(rr) !== Math.sign(s.lastR) && s.lastR !== 0) {
        n = {...n, alignedFrom: {...n.alignedFrom, [dir > 0 ? 'bi' : 'bo']: true}};
        if (ctx.instr.includes('aligned')) n = later(n, 500, {say: 'Now they’re lined up!'}, false);
      }
      return n;
    });
  const setPrism = (patch: Partial<Pick<VGSim, 'h' | 'v'>>) =>
    setSim(s => {
      const n = {...s, ...patch, setWhileOpen: s.setWhileOpen || !s.eyesClosed};
      return {...n, lastR: n.h - distPhoria(ctx)};
    });
  const ask = () =>
    setSim(s => {
      const rr = s.h - distPhoria(ctx);
      const say = s.eyesClosed ? 'My eyes are closed…' : Math.abs(s.v) < 4 ? 'I only see one letter.' : describe(rr);
      return later(talk({...s, asked: s.asked + 1}, 'you', 'Where is the top letter compared with the bottom one?'), 700, {say}, false);
    });
  const view = sim.eyesClosed ? {text: '', dim: true} : {text: 'E'};
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <PhoropterView
          ph={{sph: {od: 0, os: 0}, h: {od: sim.h, os: 0}, v: {od: 0, os: sim.v}, aux: {od: 'O', os: 'O'}, risley: {od: true, os: true}}}
          caption="Distance Rx in place · target at 6 m"
        />
        {dissociated && !sim.eyesClosed ? (
          <PatientView t={{text: 'E', double: {dx: -r * 5, dy: -60}}} title="Patient’s view: upper = OD image, lower = OS image" />
        ) : (
          <PatientView t={view} title={sim.eyesClosed ? 'Patient’s eyes are closed' : 'Patient’s view'} />
        )}
      </VStack>
      <VStack gap={2}>
        <Controls title="Risley prisms">
          <HStack gap={1} wrap="wrap">
            <Button
              label={sim.eyesClosed ? 'Ask patient to open eyes' : 'Ask patient to close eyes'}
              icon={<Icon icon={sim.eyesClosed ? EyeIcon : EyeClosed} />}
              onClick={() => setSim(s => talk({...s, eyesClosed: !s.eyesClosed}, 'you', s.eyesClosed ? 'Open your eyes and look at the letter.' : 'Close your eyes for a moment while I set this up.'))}
            />
          </HStack>
          <Selector
            label="OS — dissociating prism (vertical)"
            size="sm"
            value={String(sim.v)}
            options={[0, 2, 4, 6, 8, 10].map(v => ({value: String(v), label: v === 0 ? 'None' : `${v}Δ BU`}))}
            onChange={v => setPrism({v: Number(v)})}
          />
          <Selector
            label="OD — measuring prism start (horizontal)"
            size="sm"
            value={String(Math.round(sim.h))}
            options={[-16, -12, -8, 0, 8, 12].map(v => ({value: String(v), label: v === 0 ? '0' : `${Math.abs(v)}Δ ${v < 0 ? 'BI' : 'BO'}`}))}
            onChange={v => setPrism({h: Number(v)})}
          />
          <SpeedPicker value={sim.rate} onChange={v => setSim(s => ({...s, rate: v}))} options={[1, 2, 4]} unit="Δ/s" />
          <HStack gap={1} wrap="wrap">
            <HoldButton label="Rotate OD towards BO" onTick={rotate(1)} variant="primary" />
            <HoldButton label="Rotate OD towards BI" onTick={rotate(-1)} />
            <Button label="Ask where the top letter is" variant="ghost" icon={<Icon icon={MessageCircleQuestion} />} onClick={ask} />
          </HStack>
          <Text type="supporting" hasTabularNumbers>
            OD measuring Risley: {Math.abs(sim.h).toFixed(1)}Δ {sim.h < 0 ? 'BI' : sim.h > 0 ? 'BO' : ''} — the reading at alignment is the phoria (BI = exo, BO = eso).
          </Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const phoriaRecord = (placeholder: string) =>
  makeBVRecord<unknown>({
    placeholder,
    hint: 'Technique, distance, correction, size in Δ and direction.',
    question: 'How does the distance phoria compare with the norm?',
    options: PHORIA_OPTIONS,
  });

const phoriaInstr = [
  {id: 'look', text: 'Please look at the letter on the chart and keep it clear.', point: 'Keep the letter clear'},
  {id: 'two', text: 'You’ll see two letters, one above the other.', point: 'Explain they will see two letters'},
  {id: 'aligned', text: 'Tell me when the top letter is directly above the bottom one, like buttons on a shirt.', point: 'Report when they line up vertically'},
  {id: 'closed', text: 'Close your eyes for a moment while I set the lenses.', point: 'Eyes closed while prisms are set'},
  {id: 'jargon', text: 'Report when the dissociated images are aligned in the vertical meridian.', bad: 'jargon.'},
  {id: 'move', text: 'Move your head until the letters line up.', bad: 'the patient must keep still — you align them with the prism.'},
];

export const vonGraefeTest: TestDef<BVPatient, VGSim, BVRec> = {
  id: 'vg',
  station: 'bv',
  category: 'distVerg',
  group: 'phoria',
  groupName: 'Horizontal phoria assessment',
  name: 'Von Graefe (distance)',
  short: 'Von Graefe',
  brief: 'In the phoropter: 6Δ BU over OS to dissociate, 12Δ BI over OD to start. Rotate the OD Risley towards BO at ~2Δ/s until the letters align; bracket from both sides.',
  instructions: phoriaInstr,
  needPoints: 3,
  setup: [
    rxQuestion(),
    distTargetQ('Isolated letter one line above best VA at 6 m'),
    {
      id: 'pd',
      label: 'Phoropter PD',
      options: [
        {id: 'dist', text: 'Set to the patient’s distance PD'},
        {id: 'near', text: 'Set to the near PD'},
      ],
      correct: ['dist'],
      why: 'Lens centres must match the visual axes or the lenses induce prism.',
    },
    {
      id: 'room',
      label: 'Illumination',
      options: [
        {id: 'lights', text: 'Normal room lighting'},
        {id: 'dark', text: 'Complete darkness'},
      ],
      correct: ['lights'],
      why: 'Standard distance VG uses normal lighting and a lit chart.',
    },
  ],
  initSim: () => ({...initTalk(), h: 0, v: 0, eyesClosed: false, setWhileOpen: false, rate: 2, maxRate: 0, alignedFrom: {bi: false, bo: false}, lastR: 0, asked: 0}),
  Sim: VGView,
  checks: sim => [
    {id: 'closed', label: 'Had the patient close their eyes while the prisms were set', ok: !sim.setWhileOpen && sim.v !== 0, points: 1},
    {id: 'dissoc', label: 'Used adequate dissociating prism (≥ 6Δ BU or BD)', ok: Math.abs(sim.v) >= 6, points: 1},
    {id: 'rate', label: 'Rotated the measuring prism at ~2Δ/s or slower', ok: sim.maxRate > 0 && sim.maxRate <= 2, points: 1},
    {id: 'bracket', label: 'Bracketed — found alignment approaching from BI and from BO', ok: sim.alignedFrom.bi && sim.alignedFrom.bo, points: 1},
  ],
  initRec: initBVRec,
  Record: phoriaRecord('e.g. VG (6 m, cc): 2Δ XP'),
  grade: (rec, _s, ctx) => gradePhoria(rec, ctx, /vg|von\s*graef/i, 'VG'),
  model: (_s, ctx) => `VG (distance 6 m, cc): ${fmtPhoria(ctx.patient.phoriaD)}`,
};

// -----------------------------------------------------------------------------
// Maddox rod
// -----------------------------------------------------------------------------

interface MRSim extends Talkative {
  mrEye: Eye;
  line: 'vertical' | 'horizontal';
  base: 'BI' | 'BO';
  amount: number;
  asked: number;
  askedBeforePrism: boolean;
  firstBase: 'BI' | 'BO' | null;
  sawReversal: boolean;
  neutral: number[];
  coverChecks: number;
  wrongLineAsked: boolean;
}

function MRView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: MRSim; setSim: (fn: (s: MRSim) => MRSim) => void}) {
  usePending(sim, setSim);
  const P = distPhoria(ctx);
  const r = (sim.base === 'BO' ? sim.amount : -sim.amount) - P;
  // OD image (exo → crossed → left). Line is the image of the eye behind the rod.
  const dx = (sim.mrEye === 'od' ? -r : r) * 6;
  const ask = () =>
    setSim(s => {
      const rr = (s.base === 'BO' ? s.amount : -s.amount) - distPhoria(ctx);
      const side = (s.mrEye === 'od' ? -rr : rr) < 0 ? 'left' : 'right';
      let n: MRSim = talk({...s, asked: s.asked + 1, askedBeforePrism: s.askedBeforePrism || s.amount === 0}, 'you', 'Where is the red line compared with the light?');
      if (s.line === 'horizontal') return later({...n, wrongLineAsked: true}, 700, {say: 'It’s a flat line going across… through the light, I think?'}, false);
      if (s.amount > 0 && Math.abs(rr) >= 1.5 && Math.sign(rr) === Math.sign(distPhoria(ctx))) n = {...n, sawReversal: true};
      if (s.amount > 0 && Math.abs(rr) < 1.5) n = {...n, neutral: [...n.neutral, s.amount]};
      return later(n, 700, {say: Math.abs(rr) < 1.5 ? 'The line goes straight through the light.' : `The red line is to the ${side} of the light.`}, false);
    });
  const coverCheck = () =>
    setSim(s => {
      const rr = (s.base === 'BO' ? s.amount : -s.amount) - distPhoria(ctx);
      const side = (s.mrEye === 'od' ? -rr : rr) < 0 ? 'left' : 'right';
      return later(talk({...s, coverChecks: s.coverChecks + 1}, 'you', `Briefly cover and uncover the ${s.mrEye.toUpperCase()} — where does the line first appear?`), 700, {say: Math.abs(rr) < 1.5 ? 'Right through the light.' : `It appears on the ${side}.`}, false);
    });
  const setPrism = (patch: Partial<Pick<MRSim, 'base' | 'amount'>>) => setSim(s => {
    const n = {...s, ...patch};
    return {...n, firstBase: s.firstBase ?? (n.amount > 0 ? n.base : null)};
  });
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <EyesView pos={{od: 0, os: 0}} prism={sim.amount > 0 ? {eye: sim.mrEye === 'od' ? 'os' : 'od', base: sim.base, amount: sim.amount} : null} lensLabel={`Red Maddox rod over ${sim.mrEye.toUpperCase()} (${sim.line} streak)`} />
        {sim.line === 'vertical' ? (
          <PatientView t={{text: '', maddox: {dx}}} title="Patient’s view: spotlight at 6 m + red streak" />
        ) : (
          <PatientView t={{text: '—', dim: true}} title="Horizontal streak — gives no horizontal information" />
        )}
      </VStack>
      <VStack gap={2}>
        <Controls title="Maddox rod">
          <HStack gap={1} vAlign="center" wrap="wrap">
            <SegmentedControl label="Rod over" size="sm" value={sim.mrEye} onChange={v => setSim(s => ({...s, mrEye: v as Eye}))}>
              <SegmentedControlItem value="od" label="Rod OD" />
              <SegmentedControlItem value="os" label="Rod OS" />
            </SegmentedControl>
            <SegmentedControl label="Streak" size="sm" value={sim.line} onChange={v => setSim(s => ({...s, line: v as MRSim['line']}))}>
              <SegmentedControlItem value="vertical" label="Rods horizontal → vertical line" />
              <SegmentedControlItem value="horizontal" label="Rods vertical → horizontal line" />
            </SegmentedControl>
          </HStack>
          <HStack gap={1} wrap="wrap">
            <Button label="Ask where the line is" variant="primary" icon={<Icon icon={MessageCircleQuestion} />} onClick={ask} />
            <Button label="Cover–uncover rod eye" variant="ghost" onClick={coverCheck} />
          </HStack>
        </Controls>
        <Controls title={`Prism bar over the other eye (${sim.mrEye === 'od' ? 'OS' : 'OD'})`}>
          <SegmentedControl label="Base" size="sm" value={sim.base} onChange={v => setPrism({base: v as 'BI' | 'BO'})}>
            <SegmentedControlItem value="BI" label="Base in" />
            <SegmentedControlItem value="BO" label="Base out" />
          </SegmentedControl>
          <Selector label="Prism power" size="sm" value={String(sim.amount)} options={PRISM_STEPS.map(p => ({value: String(p), label: p === 0 ? 'No prism' : `${p}Δ`}))} onChange={v => setPrism({amount: Number(v)})} />
          <Text type="supporting">Uncrossed (line on the same side as the rod eye) = eso → BO. Crossed = exo → BI.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

export const maddoxTest: TestDef<BVPatient, MRSim, BVRec> = {
  id: 'mr',
  station: 'bv',
  category: 'distVerg',
  group: 'phoria',
  groupName: 'Horizontal phoria assessment',
  name: 'Maddox rod (distance)',
  short: 'Maddox rod',
  brief: 'Red Maddox rod (rods horizontal → vertical streak) over one eye, spotlight at 6 m. Ask where the line is relative to the light, then neutralise with prism and bracket.',
  instructions: [
    {id: 'look', text: 'Look at the light on the wall with both eyes open.', point: 'Look at the light, both eyes open'},
    {id: 'see', text: 'You’ll see a red line as well as the light.', point: 'Explain they’ll see a red line and a light'},
    {id: 'where', text: 'Tell me whether the red line goes through the light, or is to the left or right of it.', point: 'Report where the line is (left / right / through)'},
    {id: 'jargon', text: 'Report the position of the Maddox streak relative to the fixation source.', bad: 'jargon.'},
    {id: 'shut', text: 'Close the eye that sees the red line.', bad: 'both eyes must stay open.'},
  ],
  needPoints: 3,
  setup: [
    rxQuestion(),
    {
      id: 'target',
      label: 'Target',
      options: [
        {id: 'spot', text: 'Spotlight / penlight at 6 m'},
        {id: 'letter', text: 'Letter one line above best VA'},
        {id: 'near', text: 'Penlight at 40 cm'},
      ],
      correct: ['spot'],
      why: 'Distance Maddox rod uses a spot of light at 6 m.',
    },
    {
      id: 'room',
      label: 'Illumination',
      options: [
        {id: 'dim', text: 'Room lights dimmed'},
        {id: 'bright', text: 'Room lights fully on'},
      ],
      correct: ['dim'],
      why: 'Dimming the room makes the red streak visible and removes peripheral fusion cues.',
    },
    {
      id: 'prism',
      label: 'Prism',
      options: [
        {id: 'bar', text: 'Horizontal prism bar (or loose prisms) over the other eye'},
        {id: 'vbar', text: 'Vertical prism bar'},
      ],
      correct: ['bar'],
      why: 'A horizontal prism neutralises a horizontal phoria.',
    },
  ],
  initSim: () => ({...initTalk(), mrEye: 'od', line: 'horizontal', base: 'BI', amount: 0, asked: 0, askedBeforePrism: false, firstBase: null, sawReversal: false, neutral: [], coverChecks: 0, wrongLineAsked: false}),
  Sim: MRView,
  checks: (sim, ctx) => {
    const P = distPhoria(ctx);
    const ortho = Math.abs(P) < 1.5;
    return [
      {id: 'orient', label: 'Rod orientation gives a vertical streak (rods horizontal) for a horizontal phoria', ok: sim.line === 'vertical' && !sim.wrongLineAsked, points: 1},
      {id: 'base', label: 'Asked where the line was, then chose the correct base (crossed → BI, uncrossed → BO)', ok: sim.askedBeforePrism && (ortho || sim.firstBase === (P < 0 ? 'BI' : 'BO')), points: 1},
      {id: 'bracket', label: 'Bracketed to the neutral point (line through the light)', ok: ortho ? sim.asked > 0 : sim.neutral.length > 0 && sim.sawReversal, points: 1},
      {id: 'cover', label: 'Briefly covered/uncovered the rod eye to check the line’s first position', ok: sim.coverChecks > 0, points: 1},
    ];
  },
  initRec: initBVRec,
  Record: phoriaRecord('e.g. MR (6 m, cc, rod OD): 4Δ XP'),
  grade: (rec, _s, ctx) => gradePhoria(rec, ctx, /mr|maddox/i, 'MR'),
  model: (_s, ctx) => `Maddox rod (distance 6 m, cc, rod OD): ${fmtPhoria(ctx.patient.phoriaD)}`,
};

// -----------------------------------------------------------------------------
// Fusional vergence (shared)
// -----------------------------------------------------------------------------

export interface VergRun {
  blur: number | null;
  brk: number | null;
  rec: number | null;
}

/** Parse "BI x/7/4 BO 9/19/10" into values per base. */
export function parseVergence(text: string): Partial<Record<'bi' | 'bo', (number | 'x')[]>> {
  const out: Partial<Record<'bi' | 'bo', (number | 'x')[]>> = {};
  const s = text.replace(/[−–]/g, '-');
  const re = /\b(BI|BO|base\s*in|base\s*out|NFV|PFV)\b[^A-Za-z0-9x]*((?:(?:x|\d+(?:\.\d+)?)\s*(?:Δ|\^|pd)?\s*\/?\s*){1,3})/gi;
  for (const m of s.matchAll(re)) {
    const k = /bi|in|nfv/i.test(m[1]) ? 'bi' : 'bo';
    const vals = m[2]
      .split('/')
      .map(v => v.trim().replace(/Δ|\^|pd/gi, '').trim())
      .filter(Boolean)
      .map(v => (/^x$/i.test(v) ? 'x' : parseFloat(v))) as (number | 'x')[];
    out[k] = vals;
  }
  return out;
}

function gradeVergence(rec: BVRec, p: BVPatient, threeValues: boolean) {
  const parsed = parseVergence(rec.text);
  const notes: string[] = [];
  const check = (k: 'bi' | 'bo', truth: Vergence) => {
    const v = parsed[k];
    if (!v || v.length < 2) return false;
    const nums = v.length === 3 ? v : ['x' as const, ...v];
    const [b, br, rc] = nums;
    const blurOk = !threeValues || truth.blur === null ? b === 'x' || typeof b === 'number' : typeof b === 'number' && near(b, truth.blur, 3);
    return blurOk && typeof br === 'number' && near(br, truth.brk, 2) && typeof rc === 'number' && near(rc, truth.rec, 2);
  };
  const biOk = check('bi', p.bi);
  const boOk = check('bo', p.bo);
  const fmtV = (v: Vergence) => `${v.blur ?? 'x'} / ${v.brk} / ${v.rec}`;
  if (!biOk || !boOk) notes.push(`True values: BI ${fmtV(p.bi)}Δ, BO ${fmtV(p.bo)}Δ (±2Δ break/recovery, ±3Δ blur).`);
  const fmt: string[] = [];
  if (!parsed.bi || !parsed.bo) fmt.push('Label each range BI and BO, written blur / break / recovery.');
  if (!hasPrismUnit(rec.text)) fmt.push('Include units (Δ).');
  if (threeValues && parsed.bi && parsed.bi.length === 3 && parsed.bi[0] !== 'x' && p.bi.blur === null) fmt.push('Record “x” for no blur at distance BI.');
  return {accurate: mark(biOk && boOk, 1, notes), record: mark(fmt.length === 0, 1, fmt)};
}

const VERG_OPTIONS = [
  {id: 'normal', text: 'Both ranges within normal limits'},
  {id: 'lowBo', text: 'Reduced BO (positive fusional vergence) — compensating range for exo is low'},
  {id: 'lowBi', text: 'Reduced BI (negative fusional vergence) — compensating range for eso is low'},
  {id: 'both', text: 'Both reduced — e.g. fusional vergence dysfunction'},
];
const vergInterp = (p: BVPatient) => {
  const lowBi = p.bi.brk < 7 - 3;
  const lowBo = p.bo.brk < 19 - 6;
  return lowBi && lowBo ? 'both' : lowBi ? 'lowBi' : lowBo ? 'lowBo' : 'normal';
};

const vergInstr = [
  {id: 'look', text: 'Look at the column of letters and keep them clear and single.', point: 'Keep the letters clear and single'},
  {id: 'blur', text: 'Tell me if they go blurry.', point: 'Report blur'},
  {id: 'double', text: 'Tell me when they split into two.', point: 'Report doubling'},
  {id: 'single', text: 'Then tell me when they become one again.', point: 'Report when single again'},
  {id: 'jargon', text: 'Report diplopia and the loss of fusion.', bad: 'jargon.'},
  {id: 'move', text: 'If one column drifts, follow it with your eyes.', bad: 'the patient should keep fixating the target.'},
];

const vergSetup = (bar: boolean): SetupQuestion<BVPatient>[] => [
  rxQuestion(),
  distTargetQ('Vertical column of letters one line above best VA at 6 m'),
  {
    id: 'order',
    label: 'Order',
    options: [
      {id: 'bi', text: 'BI (NFV) first, then BO (PFV)'},
      {id: 'bo', text: 'BO (PFV) first, then BI (NFV)'},
    ],
    correct: ['bi'],
    why: 'BO first induces vergence adaptation that inflates the following BI range.',
  },
  bar
    ? {
        id: 'equip',
        label: 'Prism bar',
        options: [
          {id: 'h', text: 'Horizontal prism bar held over one eye, in free space'},
          {id: 'v', text: 'Vertical prism bar'},
        ],
        correct: ['h'],
        why: 'A horizontal bar provides BI/BO steps.',
      }
    : {
        id: 'equip',
        label: 'Phoropter',
        options: [
          {id: 'both', text: 'Risley prisms before both eyes, distance PD set'},
          {id: 'one', text: 'Risley prism before one eye only'},
        ],
        correct: ['both'],
        why: 'Splitting the prism equally between eyes keeps fixation centred.',
      },
];

// -----------------------------------------------------------------------------
// PFV/NFV — phoropter
// -----------------------------------------------------------------------------

interface VergSim extends Talkative {
  /** Prism per eye (signed: + BO, − BI). */
  od: number;
  os: number;
  linked: boolean;
  asym: boolean;
  rate: number;
  maxRate: number;
  state: Record<'bi' | 'bo', {blurred: boolean; broken: boolean; recovered: boolean}>;
  order: ('bi' | 'bo')[];
}

const total = (s: Pick<VergSim, 'od' | 'os'>) => s.od + s.os;

function updateVerg(ctx: Ctx<BVPatient>, s: VergSim, prev: number): VergSim {
  const p = ctx.patient;
  const T = total(s);
  let n = s;
  const k: 'bi' | 'bo' = T < 0 || (T === 0 && prev < 0) ? 'bi' : 'bo';
  const v = k === 'bi' ? p.bi : p.bo;
  const mag = Math.abs(T);
  const st = n.state[k];
  if (mag > 0.5 && !n.order.includes(k)) n = {...n, order: [...n.order, k]};
  if (v.blur !== null && !st.blurred && !st.broken && mag >= v.blur && Math.abs(prev) < v.blur) {
    n = {...n, state: {...n.state, [k]: {...st, blurred: true}}};
    if (ctx.instr.includes('blur')) n = later(n, 500, {say: 'It’s gone a bit blurry.'}, false);
  }
  if (!n.state[k].broken && mag >= v.brk) {
    n = talk({...n, state: {...n.state, [k]: {...n.state[k], broken: true}}}, 'note', `Eyes ${k === 'bo' ? 'diverge' : 'converge'} — fusion broken`);
    n = later(n, ctx.instr.includes('double') ? 500 : 1600, {say: ctx.instr.includes('double') ? 'It’s split into two!' : 'Hmm… there are two now.'}, false);
  }
  if (n.state[k].broken && !n.state[k].recovered && mag <= v.rec) {
    n = {...n, state: {...n.state, [k]: {...n.state[k], recovered: true}}};
    n = later(n, 500, {say: ctx.instr.includes('single') ? 'One again.' : 'Oh, it’s normal now.'}, false);
  }
  return n;
}

function seen(ctx: Ctx<BVPatient>, T: number, st: VergSim['state']) {
  const k: 'bi' | 'bo' = T < 0 ? 'bi' : 'bo';
  const v = k === 'bi' ? ctx.patient.bi : ctx.patient.bo;
  const mag = Math.abs(T);
  const broken = st[k].broken && !(st[k].recovered || mag <= v.rec);
  const isDouble = broken || mag >= v.brk;
  const blur = v.blur !== null && mag >= v.blur && !isDouble ? Math.min(3, 0.6 + (mag - v.blur) * 0.25) : 0;
  return {text: 'ZHK', column: true, blur, double: isDouble ? {dx: (k === 'bo' ? 1 : -1) * 34, dy: 0} : null};
}

function VergView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: VergSim; setSim: (fn: (s: VergSim) => VergSim) => void}) {
  usePending(sim, setSim);
  const rotate = (dir: 'bi' | 'bo' | 'zero') => (dt: number) =>
    setSim(s => {
      const step = s.rate * dt;
      const prev = total(s);
      const sgn = dir === 'bo' ? 1 : -1;
      const toward = (x: number) => (dir === 'zero' ? (Math.abs(x) <= step ? 0 : x - Math.sign(x) * step) : x + sgn * step);
      const n: VergSim = s.linked ? {...s, od: toward(s.od), os: toward(s.os)} : {...s, od: toward(s.od), asym: s.asym || dir !== 'zero'};
      return updateVerg(ctx, {...n, maxRate: dir === 'zero' ? n.maxRate : Math.max(n.maxRate, s.rate * (s.linked ? 2 : 1))}, prev);
    });
  const zero = () => setSim(s => talk({...s, od: 0, os: 0, state: {...s.state, bi: s.state.bi.broken ? s.state.bi : {blurred: false, broken: false, recovered: false}, bo: s.state.bo.broken ? s.state.bo : {blurred: false, broken: false, recovered: false}}}, 'you', 'Prisms back to zero'));
  const T = total(sim);
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <PhoropterView
          ph={{sph: {od: 0, os: 0}, h: {od: sim.od, os: sim.os}, v: {od: 0, os: 0}, aux: {od: 'O', os: 'O'}, risley: {od: true, os: true}}}
          caption={`Total: ${Math.abs(T).toFixed(1)}Δ ${T < 0 ? 'BI' : T > 0 ? 'BO' : ''}`}
        />
        <PatientView t={seen(ctx, T, sim.state)} title="Patient’s view of the letter column" />
      </VStack>
      <VStack gap={2}>
        <Controls title="Rotate Risleys">
          <HStack gap={1} vAlign="center">
            <SegmentedControl label="Linked" size="sm" value={sim.linked ? 'both' : 'od'} onChange={v => setSim(s => ({...s, linked: v === 'both'}))}>
              <SegmentedControlItem value="both" label="Both eyes together" />
              <SegmentedControlItem value="od" label="OD only" />
            </SegmentedControl>
          </HStack>
          <SpeedPicker value={sim.rate} onChange={v => setSim(s => ({...s, rate: v}))} options={[0.5, 1, 2, 4]} unit="Δ/s per eye" />
          <HStack gap={1} wrap="wrap">
            <HoldButton label="Increase BI" icon={ChevronDown} onTick={rotate('bi')} variant="primary" />
            <HoldButton label="Increase BO" icon={ChevronUp} onTick={rotate('bo')} variant="primary" />
            <HoldButton label="Reduce towards 0" icon={Undo2} onTick={rotate('zero')} />
            <Button label="Reset to 0" variant="ghost" icon={<Icon icon={RotateCcw} />} onClick={zero} />
          </HStack>
          <Text type="supporting">Typical rate ≈ 1Δ/s per eye (2Δ/s total). Record blur / break / recovery as the total prism.</Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

const vergRecord = (placeholder: string) =>
  makeBVRecord<unknown>({
    placeholder,
    hint: 'BI blur/break/recovery, BO blur/break/recovery, in Δ; “x” if no blur.',
    question: 'How do the fusional vergence ranges compare with norms?',
    options: VERG_OPTIONS,
  });

const vergInsight = (rec: BVRec, p: BVPatient) => {
  const want = vergInterp(p);
  return {ok: rec.interp === want, notes: [`${VERG_OPTIONS.find(o => o.id === want)!.text}. Norms: ${NORMS.bi.text}; ${NORMS.bo.text}. Sheard: the compensating range should be ≥ 2× the phoria.`]};
};

const freshVerg = () => ({bi: {blurred: false, broken: false, recovered: false}, bo: {blurred: false, broken: false, recovered: false}});

export const vergPhoropterTest: TestDef<BVPatient, VergSim, BVRec> = {
  id: 'vergPh',
  station: 'bv',
  category: 'distVerg',
  group: 'vergence',
  groupName: 'Horizontal PFV / NFV',
  name: 'Fusional vergence — phoropter (distance)',
  short: 'PFV/NFV (phoropter)',
  brief: 'Smooth vergences with Risley prisms before both eyes: increase BI at ~1Δ/s per eye to blur, break, then reduce to recovery; return to zero and repeat with BO.',
  instructions: vergInstr,
  needPoints: 3,
  setup: vergSetup(false),
  initSim: () => ({...initTalk(), od: 0, os: 0, linked: true, asym: false, rate: 1, maxRate: 0, state: freshVerg(), order: []}),
  Sim: VergView,
  checks: sim => [
    {id: 'order', label: 'Measured BI before BO', ok: sim.order[0] === 'bi' && sim.order.includes('bo'), points: 1},
    {id: 'sym', label: 'Rotated both Risleys together (prism split between the eyes)', ok: !sim.asym && sim.order.length > 0, points: 1},
    {id: 'rate', label: 'Rotated at ~2Δ/s total or slower', ok: sim.maxRate > 0 && sim.maxRate <= 2, points: 1, detail: sim.maxRate > 2 ? `max ${sim.maxRate}Δ/s total` : undefined},
    {id: 'rec', label: 'Measured recovery for both BI and BO', ok: sim.state.bi.recovered && sim.state.bo.recovered, points: 1},
  ],
  initRec: initBVRec,
  Record: vergRecord('e.g. Distance vergences (cc): BI x/7/4Δ, BO 9/19/10Δ'),
  grade: (rec, _s, ctx) => ({...gradeVergence(rec, ctx.patient, true), insight: vergInsight(rec, ctx.patient)}),
  model: (_s, ctx) => {
    const p = ctx.patient;
    return `Distance fusional vergence (phoropter, cc): BI ${p.bi.blur ?? 'x'}/${p.bi.brk}/${p.bi.rec}Δ, BO ${p.bo.blur ?? 'x'}/${p.bo.brk}/${p.bo.rec}Δ`;
  },
};

// -----------------------------------------------------------------------------
// PFV/NFV — prism bar (step vergence)
// -----------------------------------------------------------------------------

interface BarSim extends Talkative {
  base: 'BI' | 'BO';
  idx: number;
  lastStep: number;
  rushed: number;
  state: VergSim['state'];
  order: ('bi' | 'bo')[];
  breaks: Partial<Record<'bi' | 'bo', number>>;
}

const BAR = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40];

function BarView({ctx, sim, setSim}: {ctx: Ctx<BVPatient>; sim: BarSim; setSim: (fn: (s: BarSim) => BarSim) => void}) {
  usePending(sim, setSim);
  const step = (d: 1 | -1) =>
    setSim(s => {
      const idx = Math.max(0, Math.min(BAR.length - 1, s.idx + d));
      const t = now();
      const k: 'bi' | 'bo' = s.base === 'BI' ? 'bi' : 'bo';
      const v = k === 'bi' ? ctx.patient.bi : ctx.patient.bo;
      const mag = BAR[idx];
      let n: BarSim = {...s, idx, lastStep: t, rushed: s.rushed + (d > 0 && s.lastStep && t - s.lastStep < 1500 && !s.state[k].broken ? 1 : 0)};
      if (mag > 0 && !n.order.includes(k)) n = {...n, order: [...n.order, k]};
      const st = n.state[k];
      n = talk(n, 'you', `${mag}Δ ${s.base}`);
      if (!st.broken && mag >= v.brk) {
        n = talk({...n, state: {...n.state, [k]: {...st, broken: true}}, breaks: {...n.breaks, [k]: mag}}, 'note', 'Eye movement lost — fusion broken');
        n = later(n, ctx.instr.includes('double') ? 600 : 1600, {say: ctx.instr.includes('double') ? 'It’s double now.' : 'Um… two?'}, false);
      } else if (st.broken && !st.recovered && mag <= v.rec) {
        n = later({...n, state: {...n.state, [k]: {...st, recovered: true}}}, 600, {say: ctx.instr.includes('single') ? 'One again.' : 'Back to normal.'}, false);
      } else if (d > 0 && !st.broken) {
        n = talk(n, 'note', `Eyes make a ${k === 'bo' ? 'convergent' : 'divergent'} fusional movement`);
      }
      return n;
    });
  const k: 'bi' | 'bo' = sim.base === 'BI' ? 'bi' : 'bo';
  const v = k === 'bi' ? ctx.patient.bi : ctx.patient.bo;
  const mag = BAR[sim.idx];
  const broken = sim.state[k].broken && !sim.state[k].recovered;
  return (
    <Grid columns={{minWidth: 320, max: 2}} gap={2}>
      <VStack gap={2}>
        <EyesView pos={{od: broken ? 0 : (k === 'bo' ? 1 : -1) * mag * 0.25, os: 0}} prism={mag > 0 ? {eye: 'od', base: sim.base, amount: mag} : null} />
        <PatientView t={{text: 'ZHK', column: true, double: broken || mag >= v.brk ? {dx: (k === 'bo' ? 1 : -1) * 34, dy: 0} : null}} title="Patient’s view (6 m)" />
      </VStack>
      <VStack gap={2}>
        <Controls title="Horizontal prism bar over OD">
          <SegmentedControl
            label="Base"
            size="sm"
            value={sim.base}
            onChange={v => setSim(s => ({...s, base: v as 'BI' | 'BO', idx: 0}))}>
            <SegmentedControlItem value="BI" label="BI (NFV)" />
            <SegmentedControlItem value="BO" label="BO (PFV)" />
          </SegmentedControl>
          <HStack gap={1} wrap="wrap">
            <Button label="Next step up" variant="primary" icon={<Icon icon={ChevronUp} />} onClick={() => step(1)} />
            <Button label="Step down" icon={<Icon icon={ChevronDown} />} onClick={() => step(-1)} />
            <Button label="Remove bar" variant="ghost" icon={<Icon icon={RotateCcw} />} onClick={() => setSim(s => ({...s, idx: 0}))} />
          </HStack>
          <Text type="supporting" hasTabularNumbers>
            Current: {mag}Δ {sim.base}. Allow ~2 s per step and watch the eyes for the fusional movement.
          </Text>
        </Controls>
        <ConversationLog log={sim.log} />
      </VStack>
    </Grid>
  );
}

export const vergBarTest: TestDef<BVPatient, BarSim, BVRec> = {
  id: 'vergBar',
  station: 'bv',
  category: 'distVerg',
  group: 'vergence',
  groupName: 'Horizontal PFV / NFV',
  name: 'Fusional vergence — prism bar (distance)',
  short: 'PFV/NFV (prism bar)',
  brief: 'Step vergences in free space: increase BI one step every ~2 s until the patient reports double / the eyes lose fusion, step down to recovery; then BO.',
  instructions: vergInstr.filter(i => i.id !== 'blur'),
  needPoints: 3,
  setup: vergSetup(true),
  initSim: () => ({...initTalk(), base: 'BI', idx: 0, lastStep: 0, rushed: 0, state: freshVerg(), order: [], breaks: {}}),
  Sim: BarView,
  checks: sim => [
    {id: 'order', label: 'Measured BI before BO', ok: sim.order[0] === 'bi' && sim.order.includes('bo'), points: 1},
    {id: 'wait', label: 'Held each step ~2 s before increasing', ok: sim.order.length > 0 && sim.rushed === 0, points: 1, detail: sim.rushed ? `${sim.rushed} step(s) were rushed` : undefined},
    {id: 'brk', label: 'Found the break in both directions', ok: sim.breaks.bi !== undefined && sim.breaks.bo !== undefined, points: 1},
    {id: 'rec', label: 'Stepped down to find recovery in both directions', ok: sim.state.bi.recovered && sim.state.bo.recovered, points: 1},
  ],
  initRec: initBVRec,
  Record: vergRecord('e.g. Step vergences 6 m (prism bar, cc): BI x/8/4Δ, BO x/18/10Δ'),
  grade: (rec, _s, ctx) => ({...gradeVergence(rec, ctx.patient, false), insight: vergInsight(rec, ctx.patient)}),
  model: (_s, ctx) => {
    const p = ctx.patient;
    return `Distance step vergence (prism bar, cc): BI x/${p.bi.brk}/${p.bi.rec}Δ, BO x/${p.bo.brk}/${p.bo.rec}Δ`;
  },
};
