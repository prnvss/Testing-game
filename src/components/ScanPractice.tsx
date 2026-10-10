import {useCallback, useMemo, useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {CheckboxList, CheckboxListItem} from '@astryxdesign/core/CheckboxList';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Divider} from '@astryxdesign/core/Divider';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Item} from '@astryxdesign/core/Item';
import {HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack} from '@astryxdesign/core/Layout';
import {List} from '@astryxdesign/core/List';
import {Section} from '@astryxdesign/core/Section';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle as CircleIcon,
  CircleDashed,
  Crosshair,
  Flame,
  MoveUpRight,
  PenLine,
  RectangleHorizontal,
  Ruler,
  ScanSearch,
  Shuffle,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import {caseById} from '../data/cases';
import {DRILLS, DRILL_WEEKS, type Drill} from '../data/drills';
import type {Scan} from '../data/types';
import {markAnnotations, markDiagnosis, type Annotation, type AnnotateResult, type DiagnosisResult, type Tool} from '../lib/marking';
import {loadDrillAttempts, loadDrillWeeks, saveDrillAttempt, saveDrillWeeks, type DrillAttempt} from '../lib/drillProgress';
import {pct} from '../lib/progress';
import {ScanViewer} from './ScanViewer';

const WEEK_TITLES = ['', 'Peripheral retina', 'Retinal vascular', 'Diabetic eye', 'AMD', 'Maculopathies', 'Retinal dystrophies', 'Optic neuropathies', 'Glaucoma'];

const TOOL_ICON: Record<Tool, typeof Ruler> = {
  arrow: MoveUpRight,
  line: Ruler,
  rect: RectangleHorizontal,
  ellipse: CircleIcon,
  pen: PenLine,
  point: Crosshair,
};

/** Findings count for 60% of a round, the diagnosis for 40%. */
const FINDINGS_WEIGHT = 0.6;

interface Result {
  findings: AnnotateResult;
  dx: DiagnosisResult;
  score: number;
}

function pickDrill(weeks: number[], recent: string[]): Drill | null {
  const pool = DRILLS.filter(d => weeks.includes(d.week));
  if (pool.length === 0) return null;
  const fresh = pool.filter(d => !recent.includes(d.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}

const tone = (s: number) => (s >= 0.75 ? 'success' : s >= 0.4 ? 'warning' : 'error');

export function ScanPractice({onExit}: {onExit: () => void}) {
  const [weeks, setWeeks] = useState<number[]>(() => loadDrillWeeks());
  const [history, setHistory] = useState<DrillAttempt[]>(() => loadDrillAttempts());
  const [recent, setRecent] = useState<string[]>([]);
  const [drill, setDrill] = useState<Drill | null>(() => pickDrill(loadDrillWeeks(), []));
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [session, setSession] = useState<number[]>([]);

  const c = drill ? caseById(drill.caseId) : undefined;
  // Captions can give the answer away ("Reference DR fundus…"), so drills show modality and eye only.
  const scans: Scan[] = useMemo(
    () =>
      drill && c
        ? drill.question.scanIds
            .map(id => c.scans.find(s => s.id === id))
            .filter((s): s is Scan => Boolean(s))
            .map(s => ({...s, caption: undefined, eye: s.eye === 'Comparison' ? undefined : s.eye}))
        : [],
    [drill, c],
  );
  const requiredFindings = drill ? drill.question.targets.filter(t => !t.isBonus).length : 0;

  const next = useCallback(
    (forWeeks = weeks) => {
      const d = pickDrill(forWeeks, recent);
      setDrill(d);
      if (d) setRecent(r => [...r, d.id].slice(-Math.max(3, Math.floor(DRILLS.length / 2))));
      setAnnotations([]);
      setSelectedId(null);
      setDiagnosis('');
      setResult(null);
    },
    [weeks, recent],
  );

  const changeWeeks = (values: string[]) => {
    const w = values.map(Number).sort();
    setWeeks(w);
    saveDrillWeeks(w);
    if (!result && annotations.length === 0 && (!drill || !w.includes(drill.week))) next(w);
  };

  const submit = (skip = false) => {
    if (!drill) return;
    const findings = markAnnotations(drill.question, skip ? [] : annotations);
    const dx = markDiagnosis(drill.dx, skip ? '' : diagnosis);
    const score = FINDINGS_WEIGHT * findings.score + (1 - FINDINGS_WEIGHT) * dx.score;
    setResult({findings, dx, score});
    setSelectedId(null);
    setSession(s => [...s, score]);
    setHistory(saveDrillAttempt({drillId: drill.id, score, findings: findings.score, dx: dx.score, date: new Date().toISOString()}));
  };

  const streak = (() => {
    let n = 0;
    for (let i = session.length - 1; i >= 0 && session[i] >= 0.75; i--) n++;
    return n;
  })();
  const sessionAvg = session.length ? session.reduce((a, b) => a + b, 0) / session.length : 0;
  const poolSize = DRILLS.filter(d => weeks.includes(d.week)).length;

  const overlay = result && drill ? {targets: drill.question.targets, results: result.findings.targets, stray: result.findings.stray} : undefined;

  // ---- Left: week filter + session ----------------------------------------
  const left = (
    <VStack gap={4}>
      <VStack gap={1}>
        <Text type="label" weight="semibold" color="accent">
          Weeks to draw from
        </Text>
        <CheckboxList label="Weeks to include" isLabelHidden value={weeks.map(String)} onChange={changeWeeks} density="compact">
          {DRILL_WEEKS.map(w => (
            <CheckboxListItem
              key={w.week}
              value={String(w.week)}
              label={`Week ${w.week} · ${WEEK_TITLES[w.week]}`}
              endContent={<Badge label={String(w.count)} />}
            />
          ))}
        </CheckboxList>
        <HStack gap={1}>
          <Button label="All" size="sm" variant="secondary" onClick={() => changeWeeks(['1', '2', '3', '4', '5', '6', '7', '8'])} />
          <Button label="None" size="sm" variant="ghost" onClick={() => changeWeeks([])} />
        </HStack>
        <Text type="supporting">
          {poolSize} scan{poolSize === 1 ? '' : 's'} in the pool
        </Text>
      </VStack>

      <Divider />
      <CheckboxInput
        label="Show clinical context"
        description="Age, sex and presenting complaint. Harder without it."
        value={showContext}
        onChange={v => setShowContext(v)}
      />
      <Divider />

      <VStack gap={1}>
        <Text type="label" weight="semibold" color="accent">
          This session
        </Text>
        <HStack gap={2}>
          <Card padding={2} style={{flex: 1, background: 'var(--cl-tint-plum)', borderColor: 'transparent'}}>
            <VStack gap={0}>
              <Text type="supporting">Average</Text>
              <Text size="xl" weight="semibold" hasTabularNumbers>
                {session.length ? pct(sessionAvg) : '—'}
              </Text>
            </VStack>
          </Card>
          <Card padding={2} style={{flex: 1, background: 'var(--cl-tint-umber)', borderColor: 'transparent'}}>
            <VStack gap={0}>
              <HStack gap={0.5} vAlign="center">
                <Icon icon={Flame} size="sm" color="warning" />
                <Text type="supporting">Streak</Text>
              </HStack>
              <Text size="xl" weight="semibold" hasTabularNumbers>
                {streak}
              </Text>
            </VStack>
          </Card>
        </HStack>
        <Text type="supporting">
          {session.length} scan{session.length === 1 ? '' : 's'} this session · {history.length} all time
        </Text>
      </VStack>

      {history.length > 0 && (
        <VStack gap={1}>
          <Text type="label" weight="semibold" color="secondary">
            Recent
          </Text>
          <List density="compact" hasDividers>
            {history
              .slice(-6)
              .reverse()
              .map((h, i) => {
                const d = DRILLS.find(x => x.id === h.drillId);
                return (
                  <Item
                    key={`${h.date}-${i}`}
                    density="compact"
                    label={<Text maxLines={1}>{d ? d.dx.label : h.drillId}</Text>}
                    description={<Text type="supporting">{d ? `Week ${d.week}` : ''}</Text>}
                    endContent={<Badge variant={tone(h.score)} label={pct(h.score)} />}
                  />
                );
              })}
          </List>
        </VStack>
      )}
    </VStack>
  );

  // ---- Right: marks, diagnosis, feedback ------------------------------------
  const right = !drill ? (
    <EmptyState title="No weeks selected" description="Tick at least one week to get a random scan." icon={<Icon icon={ScanSearch} />} />
  ) : (
    <VStack gap={3}>
      <VStack gap={1}>
        <HStack hAlign="between" vAlign="center">
          <Text type="label" color="accent" weight="semibold">
            Scan interpretation · Week {drill.week}
          </Text>
          {result && <Badge variant={tone(result.score)} label={pct(result.score)} />}
        </HStack>
        <Heading level={2}>
          <Text type="large" weight="semibold">
            Mark and label the key findings, then give your diagnosis.
          </Text>
        </Heading>
        <Text type="supporting">
          {requiredFindings} key finding{requiredFindings === 1 ? '' : 's'} to find · findings 60% · diagnosis 40%
        </Text>
        {showContext && c && (
          <Card variant="muted" padding={2}>
            <HStack gap={1} vAlign="start">
              <Icon icon={Stethoscope} size="sm" color="accent" />
              <Text>{drill.context}</Text>
            </HStack>
          </Card>
        )}
      </VStack>

      <VStack gap={1}>
        <Text type="label" weight="semibold">
          Your marks ({annotations.length})
        </Text>
        {annotations.length === 0 ? (
          <Card variant="muted" padding={2}>
            <Text type="supporting">Pick a tool, draw on the scan, then label each mark here.</Text>
          </Card>
        ) : (
          <List hasDividers density="compact">
            {annotations.map((a, i) => {
              const hit = result?.findings.targets.find(t => t.annotationId === a.id);
              const mark = !result ? null : hit?.status === 'found' ? (
                <Icon icon={Check} color="success" label="Correct" />
              ) : hit ? (
                <Icon icon={CircleDashed} color="warning" label="Partly correct" />
              ) : (
                <Icon icon={X} color="error" label="Not a key finding" />
              );
              return (
                <Item
                  key={a.id}
                  density="compact"
                  isSelected={a.id === selectedId}
                  onClick={() => setSelectedId(a.id)}
                  startContent={<Icon icon={TOOL_ICON[a.tool]} size="sm" color={a.id === selectedId ? 'accent' : 'secondary'} />}
                  label={
                    result ? (
                      <Text>{a.label || 'Unlabelled'}</Text>
                    ) : (
                      <TextInput
                        label={`Label for mark ${i + 1}`}
                        isLabelHidden
                        size="sm"
                        value={a.label}
                        placeholder={`Label mark ${i + 1}`}
                        hasAutoFocus={a.id === selectedId && !a.label}
                        onChange={v => setAnnotations(list => list.map(x => (x.id === a.id ? {...x, label: v} : x)))}
                      />
                    )
                  }
                  endContent={
                    result ? (
                      mark
                    ) : (
                      <IconButton
                        label={`Delete mark ${i + 1}`}
                        size="sm"
                        variant="ghost"
                        icon={<Icon icon={Trash2} />}
                        onClick={() => setAnnotations(list => list.filter(x => x.id !== a.id))}
                      />
                    )
                  }
                />
              );
            })}
          </List>
        )}
      </VStack>

      <TextInput
        label="What disease does this patient have?"
        value={diagnosis}
        isReadOnly={Boolean(result)}
        placeholder="e.g. branch retinal artery occlusion"
        onChange={setDiagnosis}
        onEnter={() => !result && (annotations.length || diagnosis.trim()) && submit(false)}
        status={result ? {type: result.dx.score === 1 ? 'success' : result.dx.score > 0 ? 'warning' : 'error'} : undefined}
      />

      {!result ? (
        <HStack gap={1} hAlign="end" wrap="wrap">
          <Button label="Reveal answer" variant="ghost" onClick={() => submit(true)} />
          <Button label="Submit" variant="primary" isDisabled={annotations.length === 0 && !diagnosis.trim()} onClick={() => submit(false)} />
        </HStack>
      ) : (
        <VStack gap={2}>
          <Banner
            status={tone(result.score)}
            title={`${pct(result.score)} — findings ${pct(result.findings.score)}, diagnosis ${result.dx.score === 1 ? 'correct' : result.dx.score > 0 ? 'half marks' : 'incorrect'}`}
            description={`Diagnosis: ${drill.dx.label}`}
            collapsible={false}
          />
          <List density="compact">
            {result.findings.targets.map(t => {
              const label =
                t.status === 'found'
                  ? 'Correct label and location'
                  : t.status === 'wrong-place'
                    ? 'Right label, wrong place'
                    : t.status === 'unlabelled'
                      ? 'Right place, label not recognised'
                      : t.target.isBonus
                        ? 'Bonus — not required'
                        : 'Missed';
              return (
                <Item
                  key={t.target.id}
                  density="compact"
                  startContent={
                    <Icon
                      icon={t.status === 'found' ? Check : t.status === 'missed' ? X : CircleDashed}
                      size="sm"
                      color={t.status === 'found' ? 'success' : t.status === 'missed' ? (t.target.isBonus ? 'secondary' : 'error') : 'warning'}
                      label={label}
                    />
                  }
                  label={<Text>{t.target.label}</Text>}
                  description={<Text type="supporting">{label}</Text>}
                />
              );
            })}
          </List>
          {result.dx.score < 1 && (
            <Text type="supporting">
              {result.dx.score > 0 ? `“${result.dx.matched}” is the right family — be more specific.` : 'Your diagnosis didn’t match.'} Accepted:{' '}
              {drill.dx.accept.slice(0, 3).join(' / ')}
            </Text>
          )}
          <Divider />
          <Collapsible defaultIsOpen trigger={<Text weight="semibold">What you should see</Text>}>
            <Card variant="muted" padding={2}>
              <VStack gap={1}>
                <Text>{drill.question.model}</Text>
                {c && <Text type="supporting">Patient: {drill.context}</Text>}
              </VStack>
            </Card>
          </Collapsible>
        </VStack>
      )}

      {result && <Button label="Next scan" variant="primary" icon={<Icon icon={ArrowRight} />} width="100%" onClick={() => next()} />}
    </VStack>
  );

  return (
    <Section variant="transparent" padding={0} height="100dvh" style={{background: 'var(--cl-space)'}}>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={2}>
            <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
              <HStack gap={2} vAlign="center">
                <Button label="Dashboard" variant="ghost" size="sm" icon={<Icon icon={ArrowLeft} />} onClick={onExit} />
                <Icon icon={ScanSearch} color="accent" />
                <VStack gap={0}>
                  <Text weight="semibold">Scan practice</Text>
                  <Text type="supporting">Random scan from your chosen weeks · interpret, then diagnose</Text>
                </VStack>
              </HStack>
              <Button label="Skip to another scan" variant="secondary" size="sm" icon={<Icon icon={Shuffle} />} isDisabled={poolSize === 0} onClick={() => next()} />
            </HStack>
          </LayoutHeader>
        }
        start={
          <LayoutPanel hasDivider padding={3} isScrollable width={300} label="Practice settings">
            {left}
          </LayoutPanel>
        }
        content={
          <LayoutContent padding={2}>
            <ScanViewer
              key={drill?.id ?? 'none'}
              scans={scans}
              focusScanIds={drill ? drill.question.scanIds : []}
              canDraw={Boolean(drill) && !result}
              annotations={annotations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={a => setAnnotations(list => [...list, a])}
              onDelete={id => {
                setAnnotations(list => list.filter(a => a.id !== id));
                setSelectedId(null);
              }}
              onUndo={() => setAnnotations(list => list.slice(0, -1))}
              onClear={() => setAnnotations([])}
              overlay={overlay}
            />
          </LayoutContent>
        }
        end={
          <LayoutPanel hasDivider padding={3} isScrollable width={400} label="Answer">
            {right}
          </LayoutPanel>
        }
      />
    </Section>
  );
}
