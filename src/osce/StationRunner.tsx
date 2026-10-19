import {useCallback, useEffect, useMemo, useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {CheckboxList, CheckboxListItem} from '@astryxdesign/core/CheckboxList';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {Item} from '@astryxdesign/core/Item';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {List} from '@astryxdesign/core/List';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {ArrowLeft, ClipboardList, Flag, Glasses, Play, Timer, User} from 'lucide-react';
import {makeBVPatient, makeCVPatient} from './patient';
import {GROUPS, saveOsceAttempt, testById} from './registry';
import {rng, subSeed} from './rng';
import {blankProvided, justifications, providedPatient, scoreProvided, scoreTest, type ProvidedAnswer, type Row, type TestResult, type TestState} from './score';
import type {AnyTest, Patient, StationId} from './types';
import {Report} from './Report';

export interface RunConfig {
  station: StationId;
  groups: string[];
  timed: boolean;
  seed: number;
  /** Single-test practice: no provided-results section. */
  single?: boolean;
}

export const STATION_NAME: Record<StationId, string> = {bv: 'Binocular Vision Assessment', cv: 'Colour Vision Assessment'};
const LIMIT = 8 * 60;

export interface FinishedRun {
  results: TestResult[];
  provided: {test: AnyTest; rows: Row[]; model: string}[];
  flags: string[];
  overtime: boolean;
  seconds: number;
}

// -----------------------------------------------------------------------------
// Pieces
// -----------------------------------------------------------------------------

function Clock({startAt, timed}: {startAt: number; timed: boolean}) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setT(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const elapsed = Math.floor((t - startAt) / 1000);
  const left = LIMIT - elapsed;
  const mmss = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`;
  return (
    <VStack gap={1}>
      <HStack gap={1} vAlign="center">
        <Icon icon={Timer} size="sm" color={timed && left <= 60 ? 'accent' : 'secondary'} />
        <Text size="xl" weight="semibold" hasTabularNumbers color={timed && left <= 60 ? 'accent' : 'primary'}>
          {timed ? (left >= 0 ? mmss(left) : `+${mmss(left)}`) : mmss(elapsed)}
        </Text>
        <Text type="supporting">{timed ? 'remaining' : 'elapsed (untimed)'}</Text>
      </HStack>
      {timed && left <= 60 && left > 0 && <Banner status="warning" title="One minute remaining" collapsible={false} />}
      {timed && left <= 0 && <Banner status="error" title="Time is up" description="In the exam you would stop now. Finish to see your marks — work after 8:00 is flagged." collapsible={false} />}
    </VStack>
  );
}

function PatientCard({patient, asked, onAsk}: {patient: Patient; asked: boolean; onAsk: () => void}) {
  const rx = (v: number) => (v === 0 ? 'plano' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(2)} DS`);
  return (
    <Card padding={2}>
      <VStack gap={1.5}>
        <HStack gap={1} vAlign="center">
          <Icon icon={User} size="sm" color="accent" />
          <Text weight="semibold">{patient.name}</Text>
          <Badge label={`${patient.age} y · ${patient.sex}`} />
          {patient.wearsSpecs && <Badge variant="info" icon={<Icon icon={Glasses} size="sm" />} label="Wearing spectacles" />}
        </HStack>
        {!asked ? (
          <Button label="Ask the assessor for VAs and PDs" size="sm" variant="secondary" onClick={onAsk} />
        ) : (
          <List density="compact">
            <Item density="compact" label="Habitual Rx" description={`OD ${rx(patient.rx.od)} · OS ${rx(patient.rx.os)}${patient.wearsSpecs ? ' (worn)' : ' — no spectacles'}`} />
            <Item density="compact" label="Distance VA (cc)" description={`OD ${patient.va.od} · OS ${patient.va.os} · OU ${patient.va.ou}${patient.wearsSpecs ? ` · uncorrected ${patient.va.uncorrected}` : ''}`} />
            <Item density="compact" label="Near VA (OU)" description={`${patient.va.near} at 40 cm`} />
            <Item density="compact" label="PD" description={`${patient.pd.dist} / ${patient.pd.near} mm (distance / near)`} />
          </List>
        )}
      </VStack>
    </Card>
  );
}

function TestPanel({test, ts, patient, seed, setState, setSim, setRec}: {
  test: AnyTest;
  ts: TestState;
  patient: Patient;
  seed: number;
  setState: (patch: Partial<TestState>) => void;
  setSim: (fn: (s: unknown) => unknown) => void;
  setRec: (fn: (r: unknown) => unknown) => void;
}) {
  const [stage, setStage] = useState('instr');
  const ctx = useMemo(() => ({patient, setup: ts.setup, instr: ts.instr}), [patient, ts.setup, ts.instr]);
  const r = useMemo(() => rng(subSeed(seed, test.id)), [seed, test.id]);
  const lines = useMemo(() => r.shuffle(test.instructions), [r, test.instructions]);
  const setupQs = useMemo(() => test.setup.map(q => ({...q, options: r.shuffle(q.options)})), [r, test.setup]);
  const Sim = test.Sim;
  const Rec = test.Record;
  const doneSetup = test.setup.filter(q => ts.setup[q.id]).length;
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={1}>
        <Heading level={2}>
          <Text type="large" weight="semibold">
            {test.name}
          </Text>
        </Heading>
        <Badge variant="purple" label={test.groupName} />
      </HStack>
      <Collapsible defaultIsOpen={false} trigger={<Text type="supporting">Procedure reminder</Text>}>
        <Text type="supporting">{test.brief}</Text>
      </Collapsible>
      <TabList value={stage} onChange={setStage} hasDivider size="sm">
        <Tab value="instr" label="1 · Instructions" endContent={<Badge label={String(ts.instr.length)} />} />
        <Tab value="setup" label="2 · Set up" endContent={<Badge label={`${doneSetup}/${test.setup.length}`} />} />
        <Tab value="perform" label="3 · Perform & record" />
      </TabList>
      {stage === 'instr' && (
        <VStack gap={1}>
          <Text type="supporting">Choose what you would say to the patient. Use clear lay language — the patient follows exactly what you tell them.</Text>
          <CheckboxList label="Instructions to the patient" isLabelHidden value={ts.instr} onChange={v => setState({instr: v})} hasDividers>
            {lines.map(l => (
              <CheckboxListItem key={l.id} value={l.id} label={`“${l.text}”`} />
            ))}
          </CheckboxList>
          <HStack hAlign="end">
            <Button label="Next: set up" variant="primary" onClick={() => setStage('setup')} />
          </HStack>
        </VStack>
      )}
      {stage === 'setup' && (
        <VStack gap={1.5}>
          {setupQs.map(q => (
            <Selector key={q.id} label={q.label} value={ts.setup[q.id] ?? ''} options={q.options.map(o => ({value: o.id, label: o.text}))} onChange={v => setState({setup: {...ts.setup, [q.id]: v}})} />
          ))}
          <HStack hAlign="end">
            <Button label="Next: perform" variant="primary" onClick={() => setStage('perform')} />
          </HStack>
        </VStack>
      )}
      {stage === 'perform' && (
        <VStack gap={2}>
          <Sim ctx={ctx} sim={ts.sim} setSim={setSim} />
          <Divider />
          <HStack gap={1} vAlign="center">
            <Icon icon={ClipboardList} size="sm" color="accent" />
            <Text weight="semibold">Recording sheet</Text>
          </HStack>
          <Rec ctx={ctx} sim={ts.sim} rec={ts.rec} setRec={setRec} isLocked={false} />
        </VStack>
      )}
    </VStack>
  );
}

function ProvidedPanel({tests, seed, answers, setAnswer}: {tests: AnyTest[]; seed: number; answers: Record<string, ProvidedAnswer>; setAnswer: (id: string, a: ProvidedAnswer) => void}) {
  return (
    <VStack gap={3}>
      <Text type="supporting">
        The examiner hands you the records of a <Text weight="semibold">different patient</Text> for the same two techniques. Interpret each: pass or fail, type and severity — and justify.
      </Text>
      {tests.map((t, i) => {
        const p = providedPatient(seed, t.id);
        const J = justifications(t, p, seed);
        const a = answers[t.id] ?? blankProvided();
        const View = t.provided!.View;
        const set = (patch: Partial<ProvidedAnswer>) => setAnswer(t.id, {...a, ...patch});
        return (
          <Card key={t.id} padding={2}>
            <VStack gap={2}>
              <HStack gap={1} vAlign="center">
                <Badge label={`Technique ${i + 1}`} />
                <Text weight="semibold">{t.name}</Text>
                <Text type="supporting">
                  — {p.name}, {p.age} y
                </Text>
              </HStack>
              <View patient={p} />
              <Grid columns={{minWidth: 300, max: 2}} gap={2}>
                <VStack gap={1}>
                  <RadioList label="Pass or fail?" value={a.pf} onChange={v => set({pf: v})}>
                    {t.provided!.pfOptions.map(o => (
                      <RadioListItem key={o.id} value={o.id} label={o.text} />
                    ))}
                  </RadioList>
                  <RadioList label="Justification" value={a.pfWhy} onChange={v => set({pfWhy: v})}>
                    {J.pf.map(o => (
                      <RadioListItem key={o.id} value={o.id} label={o.text} />
                    ))}
                  </RadioList>
                </VStack>
                <VStack gap={1}>
                  <Selector label="Type" value={a.type} options={t.provided!.typeOptions.map(o => ({value: o.id, label: o.text}))} onChange={v => set({type: v})} />
                  <Selector label="Severity" value={a.sev} options={t.provided!.sevOptions.map(o => ({value: o.id, label: o.text}))} onChange={v => set({sev: v})} />
                  <RadioList label="Justification" value={a.typeWhy} onChange={v => set({typeWhy: v})}>
                    {J.type.map(o => (
                      <RadioListItem key={o.id} value={o.id} label={o.text} />
                    ))}
                  </RadioList>
                </VStack>
              </Grid>
              <TextArea label="Document the outcome as on a clinical record card" rows={2} value={a.note} onChange={v => set({note: v})} placeholder="e.g. Ishihara 24 pl: 6/15, FAIL — deutan (strong) on plates 16/17" />
            </VStack>
          </Card>
        );
      })}
    </VStack>
  );
}

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export function StationRunner({config, onExit, onAgain}: {config: RunConfig; onExit: () => void; onAgain: () => void}) {
  const patient: Patient = useMemo(() => (config.station === 'bv' ? makeBVPatient(config.seed) : makeCVPatient(config.seed)), [config.station, config.seed]);
  const [phase, setPhase] = useState<'prep' | 'run' | 'report'>('prep');
  const [variant, setVariant] = useState<Record<string, string>>(() => Object.fromEntries(config.groups.map(g => [g, GROUPS.find(x => x.id === g)!.variants[0].id])));
  const tests = useMemo(() => config.groups.map(g => testById(variant[g])!), [config.groups, variant]);
  const [hyg, setHyg] = useState<string[]>([]);
  const [states, setStates] = useState<Record<string, TestState>>({});
  const [startAt, setStartAt] = useState(0);
  const [asked, setAsked] = useState(false);
  const [tab, setTab] = useState('');
  const [provided, setProvided] = useState<Record<string, ProvidedAnswer>>({});
  const [finished, setFinished] = useState<FinishedRun | null>(null);
  const withProvided = config.station === 'cv' && !config.single;

  const start = () => {
    const init: Record<string, TestState> = {};
    for (const t of tests) init[t.id] = {instr: [], setup: {}, sim: t.initSim({patient, setup: {}, instr: []}), rec: t.initRec()};
    setStates(init);
    setTab(tests[0].id);
    setStartAt(Date.now());
    setPhase('run');
  };

  const testKey = tests.map(t => t.id).join(',');
  const setters = useMemo(() => {
    const out: Record<string, {state: (p: Partial<TestState>) => void; sim: (fn: (s: unknown) => unknown) => void; rec: (fn: (r: unknown) => unknown) => void}> = {};
    for (const id of testKey.split(',')) {
      out[id] = {
        state: p => setStates(s => ({...s, [id]: {...s[id], ...p}})),
        sim: fn => setStates(s => ({...s, [id]: {...s[id], sim: fn(s[id].sim)}})),
        rec: fn => setStates(s => ({...s, [id]: {...s[id], rec: fn(s[id].rec)}})),
      };
    }
    return out;
  }, [testKey]);

  const finish = useCallback(() => {
    const seconds = Math.round((Date.now() - startAt) / 1000);
    const results = tests.map(t => scoreTest(t, states[t.id], patient));
    const prov = withProvided
      ? tests.map((t, i) => {
          const p = providedPatient(config.seed, t.id);
          const J = justifications(t, p, config.seed);
          return {test: t, rows: scoreProvided(i + 1, J.key, provided[t.id] ?? blankProvided()), model: `${J.key.pfWhy} ${J.key.typeWhy}`};
        })
      : [];
    const flags: string[] = [];
    if (!hyg.includes('hands')) flags.push('Unsafe practices / hygiene: hands were not sanitised before patient contact.');
    if (config.station === 'bv' && !hyg.includes('equip')) flags.push('Unsafe practices / hygiene: occluder, flippers, prism bar and near rod were not sanitised.');
    if (hyg.includes('wipe')) flags.push('Inappropriate method: alcohol wipes damage pseudoisochromatic plates and D-15 caps — clean hands instead.');
    for (const r of results) {
      const tech = r.rows[2];
      if (tech.earned <= tech.max * 0.25) flags.push(`Inappropriate method / failure to demonstrate understanding: ${r.test.name} (technique ${tech.earned}/${tech.max}).`);
      const sim = states[r.test.id].sim as {rushed?: boolean};
      if (sim?.rushed) flags.push(`Lapse in professionalism: the patient was hurried during the ${r.test.short}.`);
    }
    const total = results.reduce((s, r) => s + r.earned, 0) + prov.reduce((s, p) => s + p.rows.reduce((a, b) => a + b.earned, 0), 0);
    const max = results.reduce((s, r) => s + r.max, 0) + prov.reduce((s, p) => s + p.rows.reduce((a, b) => a + b.max, 0), 0);
    saveOsceAttempt({station: config.station, tests: tests.map(t => t.id), score: total, max, date: new Date().toISOString(), flags: flags.length});
    setFinished({results, provided: prov, flags, overtime: config.timed && seconds > LIMIT, seconds});
    setPhase('report');
  }, [startAt, tests, states, patient, withProvided, config, provided, hyg]);

  // ---- Prep ------------------------------------------------------------------
  if (phase === 'prep') {
    return (
      <VStack gap={3} padding={3} maxWidth={980} width="100%" style={{margin: '0 auto'}}>
        <HStack gap={1} vAlign="center">
          <Button label="Back" variant="ghost" icon={<Icon icon={ArrowLeft} />} onClick={onExit} />
          <Heading level={1}>
            <Text size="2xl" weight="semibold">
              {STATION_NAME[config.station]}
            </Text>
          </Heading>
        </HStack>
        <Card padding={3}>
          <VStack gap={2}>
            <Text weight="semibold">Before the assessment time starts</Text>
            <Text type="supporting">
              {config.station === 'bv'
                ? 'You may ask the assessor which techniques you will be assessed on and sanitise your equipment. You may not commence the tests in any way until the time starts. VAs and PDs are given on request.'
                : 'You may ask the assessor which techniques you will be assessed on. You may not set up the equipment or commence the tests until the time starts. Assume you are screening for an inherited (congenital) defect.'}
            </Text>
            <Divider />
            <Text weight="semibold">The assessor has chosen</Text>
            <List hasDividers>
              {config.groups.map(gid => {
                const g = GROUPS.find(x => x.id === gid)!;
                return (
                  <Item
                    key={gid}
                    label={g.name}
                    description={config.station === 'bv' ? ({acc: 'Near accommodation', nearVerg: 'Near vergence & facility', distVerg: 'Distance vergence'} as const)[g.category as 'acc'] : 'Colour vision technique'}
                    endContent={
                      g.variants.length > 1 ? (
                        <SegmentedControl label={`Technique for ${g.name}`} size="sm" value={variant[gid]} onChange={v => setVariant(s => ({...s, [gid]: v}))}>
                          {g.variants.map(v => (
                            <SegmentedControlItem key={v.id} value={v.id} label={v.short} />
                          ))}
                        </SegmentedControl>
                      ) : undefined
                    }
                  />
                );
              })}
            </List>
            <Divider />
            <CheckboxList label="Preparation" value={hyg} onChange={setHyg}>
              <CheckboxListItem value="hands" label="Sanitise hands" />
              {config.station === 'bv' ? (
                <CheckboxListItem value="equip" label="Sanitise equipment (occluder, flippers, prism bar, fixation stick, near rod, phoropter face shields)" />
              ) : (
                <CheckboxListItem value="wipe" label="Wipe the plate books and D-15 caps with alcohol wipes" />
              )}
            </CheckboxList>
            <Text type="supporting">
              {config.timed ? '8 minutes including recording, with a one-minute warning. ' : 'Untimed practice. '}You don’t need to narrate — instruct the simulated patient as you would a real one. Marks appear at the end, against the official rubric.
            </Text>
            <HStack hAlign="end">
              <Button label={config.timed ? 'Start (8:00)' : 'Start'} variant="primary" icon={<Icon icon={Play} />} onClick={start} />
            </HStack>
          </VStack>
        </Card>
      </VStack>
    );
  }

  // ---- Report ----------------------------------------------------------------
  if (phase === 'report' && finished) {
    return <Report station={config.station} patient={patient} run={finished} onExit={onExit} onAgain={onAgain} />;
  }

  // ---- Running ---------------------------------------------------------------
  const current = tests.find(t => t.id === tab);
  return (
    <VStack gap={2} padding={2} maxWidth={1320} width="100%" style={{margin: '0 auto'}}>
      <Card padding={2}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
          <HStack gap={1} vAlign="center">
            <Button label="Quit" variant="ghost" icon={<Icon icon={ArrowLeft} />} onClick={onExit} />
            <Text size="lg" weight="semibold">
              {STATION_NAME[config.station]}
            </Text>
          </HStack>
          <Clock startAt={startAt} timed={config.timed} />
          <Button label="Finish & mark" variant="primary" icon={<Icon icon={Flag} />} onClick={finish} />
        </HStack>
      </Card>
      <Grid columns={{minWidth: 280, max: 1}} gap={2}>
        <PatientCard patient={patient} asked={asked} onAsk={() => setAsked(true)} />
      </Grid>
      <TabList value={tab} onChange={setTab} hasDivider>
        {tests.map((t, i) => (
          <Tab key={t.id} value={t.id} label={`${config.station === 'cv' ? `Technique ${i + 1}: ` : ''}${t.short}`} />
        ))}
        {withProvided && <Tab value="provided" label="Provided results" />}
      </TabList>
      <Card padding={3}>
        {current && states[current.id] ? (
          <TestPanel
            key={current.id}
            test={current}
            ts={states[current.id]}
            patient={patient}
            seed={config.seed}
            setState={setters[current.id].state}
            setSim={setters[current.id].sim}
            setRec={setters[current.id].rec}
          />
        ) : (
          <ProvidedPanel tests={tests} seed={config.seed} answers={provided} setAnswer={(id, a) => setProvided(s => ({...s, [id]: a}))} />
        )}
      </Card>
    </VStack>
  );
}
