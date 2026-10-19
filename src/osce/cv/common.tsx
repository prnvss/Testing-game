import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {VStack} from '@astryxdesign/core/Layout';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import type {CVPatient} from '../patient';
import type {CVKey, Opt, RowMark, SetupQuestion} from '../types';

export interface Interp {
  pf: string;
  type: string;
  sev: string;
}
export const blankInterp = (): Interp => ({pf: '', type: '', sev: ''});

export const PF_OPTIONS: Opt[] = [
  {id: 'pass', text: 'Pass — normal result'},
  {id: 'fail', text: 'Fail — colour vision defect'},
  {id: 'borderline', text: 'Borderline / inconclusive — further testing'},
];
export const TYPE_OPTIONS: Opt[] = [
  {id: 'normal', text: 'No defect shown'},
  {id: 'protan', text: 'Protan'},
  {id: 'deutan', text: 'Deutan'},
  {id: 'tritan', text: 'Tritan'},
  {id: 'unclassified', text: 'Red-green, unclassified'},
];

export function InterpPanel({value, onChange, isLocked, pfOptions = PF_OPTIONS, typeOptions = TYPE_OPTIONS, sevOptions, title = 'Interpretation'}: {
  value: Interp;
  onChange: (v: Interp) => void;
  isLocked: boolean;
  pfOptions?: Opt[];
  typeOptions?: Opt[];
  sevOptions: Opt[];
  title?: string;
}) {
  return (
    <Card variant="muted" padding={2}>
      <VStack gap={1.5}>
        <Text type="label" weight="semibold">
          {title}
        </Text>
        <RadioList label="Result" orientation="horizontal" value={value.pf} isDisabled={isLocked} onChange={v => onChange({...value, pf: v})}>
          {pfOptions.map(o => (
            <RadioListItem key={o.id} value={o.id} label={o.text} />
          ))}
        </RadioList>
        <Grid columns={{minWidth: 220, max: 2}} gap={1.5}>
          <Selector label="Type of defect" size="sm" value={value.type} isReadOnly={isLocked} options={typeOptions.map(o => ({value: o.id, label: o.text}))} onChange={v => onChange({...value, type: v})} />
          <Selector label="Severity" size="sm" value={value.sev} isReadOnly={isLocked} options={sevOptions.map(o => ({value: o.id, label: o.text}))} onChange={v => onChange({...value, sev: v})} />
        </Grid>
      </VStack>
    </Card>
  );
}

/** "Interpret and record patient findings appropriately" (/2): 1 for the record, 1 for the interpretation. */
export function markCV(recordOk: boolean, recordNotes: string[], interp: Interp, key: CVKey, opts: {pf: Opt[]; type: Opt[]; sev: Opt[]}): RowMark {
  const pfOk = key.pf.includes(interp.pf);
  const typeOk = key.type.includes(interp.type);
  const sevOk = key.sev.includes(interp.sev);
  const label = (list: Opt[], ids: string[]) => ids.map(id => list.find(o => o.id === id)?.text ?? id).join(' or ');
  const notes = [...recordNotes];
  if (!pfOk) notes.push(`Result should be: ${label(opts.pf, key.pf)} — ${key.pfWhy}`);
  if (!typeOk || !sevOk) notes.push(`Type/severity should be: ${label(opts.type, key.type)}, ${label(opts.sev, key.sev)} — ${key.typeWhy}`);
  const earned = (recordOk ? 1 : 0) + (pfOk ? 0.5 : 0) + (typeOk && sevOk ? 0.5 : 0);
  return {earned, max: 2, notes};
}

// -----------------------------------------------------------------------------
// Setup questions shared by the colour vision tests
// -----------------------------------------------------------------------------

export const lightQ: SetupQuestion<CVPatient> = {
  id: 'light',
  label: 'Illumination',
  options: [
    {id: 'day', text: 'Daylight-equivalent illumination (~6500 K daylight lamp / Macbeth easel, ≥ 200 lux), no direct sunlight'},
    {id: 'room', text: 'Ordinary room fluorescent lighting'},
    {id: 'tung', text: 'Incandescent (tungsten) desk lamp'},
    {id: 'dim', text: 'Dimmed room lights'},
  ],
  correct: ['day'],
  why: 'Colour vision tests are calibrated for daylight (CIE C/D65). Tungsten light is yellow and makes red-green tests easier to pass.',
};

export const eyesQ: SetupQuestion<CVPatient> = {
  id: 'eyes',
  label: 'Eyes tested',
  options: [
    {id: 'bino', text: 'Binocularly — screening for a congenital defect'},
    {id: 'mono', text: 'Each eye separately'},
  ],
  correct: ['bino'],
  why: 'Congenital defects are bilateral and symmetrical, so binocular testing is appropriate; monocular testing is for suspected acquired defects.',
};

export const rxQ: SetupQuestion<CVPatient> = {
  id: 'rx',
  label: 'Correction',
  options: [
    {id: 'near', text: 'Habitual near correction worn; no tinted lenses'},
    {id: 'tint', text: 'Patient may keep their tinted / sunglasses on'},
    {id: 'none', text: 'Always remove spectacles'},
  ],
  correct: ['near'],
  why: 'The patient needs clear vision at the test distance; tints (or X-Chrom style lenses) alter the colours seen.',
};

export const distQ = (cm: number, alts: number[]): SetupQuestion<CVPatient> => ({
  id: 'dist',
  label: 'Working distance',
  options: [cm, ...alts].sort((a, b) => a - b).map(d => ({id: String(d), text: `${d} cm${d === cm ? '' : ''}`})),
  correct: [String(cm)],
  why: `The test is designed to be viewed at about ${cm} cm (sets the visual angle of the targets).`,
});
