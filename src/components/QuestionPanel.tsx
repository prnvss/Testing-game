import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Item} from '@astryxdesign/core/Item';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {List} from '@astryxdesign/core/List';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {
  ArrowRight,
  Check,
  Circle as CircleIcon,
  CircleDashed,
  Crosshair,
  Flag,
  MoveUpRight,
  PenLine,
  RectangleHorizontal,
  Ruler,
  Trash2,
  X,
} from 'lucide-react';
import type {Step} from '../data/types';
import type {AnnotateResult, Annotation, TextResult, Tool} from '../lib/marking';
import {pct} from '../lib/progress';

export type StepResult =
  | {kind: 'text'; score: number; r: TextResult}
  | {kind: 'mcq'; score: number; choice: number | null}
  | {kind: 'annotate'; score: number; r: AnnotateResult};

export interface StepAnswer {
  text: string;
  choice: number | null;
  annotations: Annotation[];
  result?: StepResult;
}

const STEP_TITLE: Record<Step['kind'], string> = {
  ddx: 'Provisional differentials',
  pool: 'Clinical reasoning',
  annotate: 'Identify the findings',
  finalDx: 'Final diagnosis',
  pathophysiology: 'Pathophysiology',
};

const TOOL_ICON: Record<Tool, typeof Ruler> = {
  arrow: MoveUpRight,
  line: Ruler,
  rect: RectangleHorizontal,
  ellipse: CircleIcon,
  pen: PenLine,
  point: Crosshair,
};

const status = (score: number): 'success' | 'warning' | 'error' => (score >= 0.75 ? 'success' : score >= 0.4 ? 'warning' : 'error');

interface Props {
  step: Step;
  index: number;
  total: number;
  answer: StepAnswer;
  selectedId: string | null;
  onChange: (patch: Partial<StepAnswer>) => void;
  onSelect: (id: string | null) => void;
  onSubmit: (skip?: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

export function QuestionPanel({step, index, total, answer, selectedId, onChange, onSelect, onSubmit, onNext, isLast}: Props) {
  const q = step.question;
  const done = Boolean(answer.result);
  const canSubmit =
    q.type === 'text' ? answer.text.trim().length > 0 : q.type === 'mcq' ? answer.choice !== null : answer.annotations.length > 0;

  const setLabel = (id: string, label: string) =>
    onChange({annotations: answer.annotations.map(a => (a.id === id ? {...a, label} : a))});

  return (
    <VStack gap={3}>
      <VStack gap={1}>
        <HStack hAlign="between" vAlign="center">
          <Text type="label" color="accent" weight="semibold">
            Question {index + 1} of {total} · {STEP_TITLE[step.kind]}
          </Text>
          {answer.result && <Badge variant={status(answer.result.score)} label={pct(answer.result.score)} />}
        </HStack>
        <Heading level={2}>
          <Text type="large" weight="semibold">{q.prompt}</Text>
        </Heading>
        {q.hint && <Text type="supporting">{q.hint}</Text>}
      </VStack>

      {q.type === 'text' && (
        <TextArea
          label="Your answer"
          isLabelHidden
          rows={7}
          value={answer.text}
          isReadOnly={done}
          placeholder="Write as you would in the exam — key terms, mechanisms, numbered points…"
          onChange={v => onChange({text: v})}
        />
      )}

      {q.type === 'mcq' && (
        <RadioList
          label="Choose one"
          isLabelHidden
          value={answer.choice === null ? '' : String(answer.choice)}
          isDisabled={done}
          onChange={v => onChange({choice: Number(v)})}>
          {q.options.map((o, i) => (
            <RadioListItem
              key={o}
              value={String(i)}
              label={o}
              endContent={
                done && i === q.answer ? (
                  <Icon icon={Check} color="success" label="Correct answer" />
                ) : done && i === answer.choice ? (
                  <Icon icon={X} color="error" label="Your answer" />
                ) : undefined
              }
            />
          ))}
        </RadioList>
      )}

      {q.type === 'annotate' && (
        <VStack gap={1}>
          <Text type="label" weight="semibold">
            Your marks ({answer.annotations.length})
          </Text>
          {answer.annotations.length === 0 ? (
            <Card variant="muted" padding={2}>
              <Text type="supporting">
                Pick a tool (arrow, line, box, ellipse, freehand, point), draw on the scan, then type a label here for
                each mark. Labels and positions are both marked.
              </Text>
            </Card>
          ) : (
            <List hasDividers density="compact">
              {answer.annotations.map((a, i) => {
                const res = answer.result?.kind === 'annotate' ? answer.result.r : undefined;
                const hit = res?.targets.find(t => t.annotationId === a.id);
                const mark = !res ? null : hit?.status === 'found' ? (
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
                    onClick={() => onSelect(a.id)}
                    startContent={<Icon icon={TOOL_ICON[a.tool]} size="sm" color={a.id === selectedId ? 'accent' : 'secondary'} />}
                    label={
                      done ? (
                        <Text>{a.label || <Text color="secondary">Unlabelled</Text>}</Text>
                      ) : (
                        <TextInput
                          label={`Label for mark ${i + 1}`}
                          isLabelHidden
                          size="sm"
                          value={a.label}
                          placeholder={`Label mark ${i + 1} (e.g. microaneurysm)`}
                          hasAutoFocus={a.id === selectedId && !a.label}
                          onChange={v => setLabel(a.id, v)}
                        />
                      )
                    }
                    endContent={
                      done ? (
                        mark
                      ) : (
                        <IconButton
                          label={`Delete mark ${i + 1}`}
                          size="sm"
                          variant="ghost"
                          icon={<Icon icon={Trash2} />}
                          onClick={() => onChange({annotations: answer.annotations.filter(x => x.id !== a.id)})}
                        />
                      )
                    }
                  />
                );
              })}
            </List>
          )}
        </VStack>
      )}

      {!done ? (
        <HStack gap={1} hAlign="end" wrap="wrap">
          <Button label="I don’t know — show answer" variant="ghost" onClick={() => onSubmit(true)} />
          <Button label="Submit for marking" variant="primary" isDisabled={!canSubmit} onClick={() => onSubmit(false)} />
        </HStack>
      ) : (
        <Feedback step={step} answer={answer} />
      )}

      {done && (
        <Button
          label={isLast ? 'Finish case' : 'Next question'}
          variant="primary"
          icon={<Icon icon={isLast ? Flag : ArrowRight} />}
          width="100%"
          onClick={onNext}
        />
      )}
    </VStack>
  );
}

function Feedback({step, answer}: {step: Step; answer: StepAnswer}) {
  const r = answer.result!;
  const q = step.question;

  let title = '';
  let body: React.ReactNode = null;

  if (r.kind === 'text') {
    title = `${r.r.earned} / ${r.r.outOf} marking points (${pct(r.score)})`;
    body = (
      <List density="compact">
        {r.r.items.map(i => (
          <Item
            key={i.item.label}
            density="compact"
            startContent={<Icon icon={i.hit ? Check : X} size="sm" color={i.hit ? 'success' : 'error'} label={i.hit ? 'Hit' : 'Missed'} />}
            label={<Text color={i.hit ? 'primary' : 'secondary'}>{i.item.label}</Text>}
            description={i.hit && i.matched ? <Text type="supporting">matched “{i.matched}”</Text> : undefined}
            endContent={(i.item.points ?? 1) > 1 ? <Badge label={`×${i.item.points}`} /> : undefined}
          />
        ))}
      </List>
    );
  } else if (r.kind === 'mcq') {
    title = r.score ? 'Correct' : 'Not quite';
  } else {
    title = `${Math.round(r.r.earned * 100) / 100} / ${r.r.outOf} findings (${pct(r.score)})`;
    body = (
      <List density="compact">
        {r.r.targets.map(t => {
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
    );
  }

  return (
    <VStack gap={2}>
      <Banner status={status(r.score)} title={title} description={q.type === 'annotate' ? 'Dashed outlines on the scan show where each finding is.' : undefined} collapsible={false} />
      {body}
      <Divider />
      <Collapsible defaultIsOpen trigger={<Text weight="semibold">Model answer</Text>}>
        <Card variant="muted" padding={2}>
          <Text>{q.model}</Text>
        </Card>
      </Collapsible>
    </VStack>
  );
}
