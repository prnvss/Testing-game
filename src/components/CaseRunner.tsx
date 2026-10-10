import {useCallback, useMemo, useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Icon} from '@astryxdesign/core/Icon';
import {Item} from '@astryxdesign/core/Item';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
  VStack,
} from '@astryxdesign/core/Layout';
import {List} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Section} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import {ArrowLeft, RotateCcw, ScanEye} from 'lucide-react';
import {buildSteps} from '../data/cases';
import type {Case} from '../data/types';
import {markAnnotations, markMcq, markText} from '../lib/marking';
import {pct} from '../lib/progress';
import {PatientChart} from './PatientChart';
import {QuestionPanel, type StepAnswer, type StepResult} from './QuestionPanel';
import {ScanViewer} from './ScanViewer';

interface Props {
  clinicalCase: Case;
  seed: number;
  onExit: () => void;
  onRetry: () => void;
  onComplete: (score: number) => void;
}

const EMPTY: StepAnswer = {text: '', choice: null, annotations: []};

export function CaseRunner({clinicalCase: c, seed, onExit, onRetry, onComplete}: Props) {
  const steps = useMemo(() => buildSteps(c, seed), [c, seed]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StepAnswer>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const step = steps[index];
  const answer = answers[step.key] ?? EMPTY;
  const scored = steps.filter(s => answers[s.key]?.result);
  const running = scored.length ? scored.reduce((s, x) => s + answers[x.key].result!.score, 0) / scored.length : 0;

  const visibleScans = c.scans.filter(s => step.revealScans.includes(s.id));
  const focusScanIds = step.question.type === 'annotate' ? step.question.scanIds : [];
  const canDraw = step.question.type === 'annotate' && !answer.result;

  const patch = useCallback(
    (p: Partial<StepAnswer>) => setAnswers(prev => ({...prev, [step.key]: {...(prev[step.key] ?? EMPTY), ...p}})),
    [step.key],
  );

  const submit = (skip = false) => {
    const q = step.question;
    let result: StepResult;
    if (q.type === 'text') result = {kind: 'text', ...(() => {
      const r = markText(q, skip ? '' : answer.text);
      return {score: r.score, r};
    })()};
    else if (q.type === 'mcq') {
      const choice = skip ? null : answer.choice;
      result = {kind: 'mcq', score: markMcq(q, choice).score, choice};
    } else {
      const r = markAnnotations(q, skip ? [] : answer.annotations);
      result = {kind: 'annotate', score: r.score, r};
    }
    patch({result});
    setSelectedId(null);
  };

  const next = () => {
    if (index < steps.length - 1) {
      setIndex(i => i + 1);
      setSelectedId(null);
      return;
    }
    const total = steps.reduce((s, x) => s + (answers[x.key]?.result?.score ?? 0), 0) / steps.length;
    onComplete(total);
    setFinished(true);
  };

  const overlay =
    step.question.type === 'annotate' && answer.result?.kind === 'annotate'
      ? {targets: step.question.targets, results: answer.result.r.targets, stray: answer.result.r.stray}
      : undefined;

  const header = (
    <LayoutHeader hasDivider padding={2}>
      <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
        <HStack gap={2} vAlign="center">
          <Button label="Worklist" variant="ghost" size="sm" icon={<Icon icon={ArrowLeft} />} onClick={onExit} />
          <Icon icon={ScanEye} color="accent" />
          <VStack gap={0}>
            <Text weight="semibold">
              {c.patient.name} · {c.patient.age}
              {c.patient.sex}
            </Text>
            <Text type="supporting" hasTabularNumbers>
              {c.patient.id} · Week {c.week} · {c.topic}
            </Text>
          </VStack>
        </HStack>
        <HStack gap={2} vAlign="center">
          <VStack width={180}>
            <ProgressBar
              label="Case progress"
              isLabelHidden
              value={finished ? steps.length : index}
              max={steps.length}
              hasValueLabel
              formatValueLabel={(v, m) => `Q${Math.min(v + 1, m)} of ${m}`}
            />
          </VStack>
          <Badge variant={scored.length ? (running >= 0.75 ? 'success' : running >= 0.4 ? 'warning' : 'error') : 'neutral'} label={scored.length ? `Running ${pct(running)}` : 'Not yet marked'} />
        </HStack>
      </HStack>
    </LayoutHeader>
  );

  if (finished) {
    const total = steps.reduce((s, x) => s + (answers[x.key]?.result?.score ?? 0), 0) / steps.length;
    return (
      <Section variant="transparent" padding={0} height="100dvh" style={{background: 'var(--cl-space)'}}>
        <Layout
          height="fill"
          header={header}
          content={
            <LayoutContent padding={4} isScrollable>
              <VStack gap={3} maxWidth={860}>
                <Banner
                  status={total >= 0.75 ? 'success' : total >= 0.5 ? 'warning' : 'error'}
                  title={`Case complete — ${pct(total)}`}
                  description={`Diagnosis: ${c.diagnosis}`}
                  collapsible={false}
                />
                <Card padding={0}>
                  <List hasDividers>
                    {steps.map((s, i) => {
                      const r = answers[s.key]?.result;
                      return (
                        <Item
                          key={s.key}
                          label={<Text weight="semibold">{`Q${i + 1}. ${s.question.prompt}`}</Text>}
                          description={<Text type="supporting">{s.question.model}</Text>}
                          endContent={<Badge variant={r ? (r.score >= 0.75 ? 'success' : r.score >= 0.4 ? 'warning' : 'error') : 'neutral'} label={r ? pct(r.score) : '—'} />}
                        />
                      );
                    })}
                  </List>
                </Card>
                <HStack gap={1}>
                  <Button label="Back to worklist" variant="secondary" icon={<Icon icon={ArrowLeft} />} onClick={onExit} />
                  <Button label="Retry with new questions" variant="primary" icon={<Icon icon={RotateCcw} />} onClick={onRetry} />
                </HStack>
                <Text type="supporting">Source: {c.source}</Text>
              </VStack>
            </LayoutContent>
          }
        />
      </Section>
    );
  }

  return (
    <Section variant="transparent" padding={0} height="100dvh" style={{background: 'var(--cl-space)'}}>
      <Layout
        height="fill"
        header={header}
        start={
          <LayoutPanel hasDivider padding={3} isScrollable width={300} label="Patient chart">
            <PatientChart c={c} showExam={step.revealExam} />
          </LayoutPanel>
        }
        content={
          <LayoutContent padding={2}>
            <ScanViewer
              scans={visibleScans}
              focusScanIds={focusScanIds}
              canDraw={canDraw}
              annotations={answer.annotations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={a => patch({annotations: [...answer.annotations, a]})}
              onDelete={id => {
                patch({annotations: answer.annotations.filter(a => a.id !== id)});
                setSelectedId(null);
              }}
              onUndo={() => patch({annotations: answer.annotations.slice(0, -1)})}
              onClear={() => patch({annotations: []})}
              overlay={overlay}
            />
          </LayoutContent>
        }
        end={
          <LayoutPanel hasDivider padding={3} isScrollable width={400} label="Question">
            <VStack gap={2}>
              <QuestionPanel
                key={step.key}
                step={step}
                index={index}
                total={steps.length}
                answer={answer}
                selectedId={selectedId}
                onChange={patch}
                onSelect={setSelectedId}
                onSubmit={submit}
                onNext={next}
                isLast={index === steps.length - 1}
              />
            </VStack>
          </LayoutPanel>
        }
      />
    </Section>
  );
}
