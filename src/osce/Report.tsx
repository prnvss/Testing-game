import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {Item} from '@astryxdesign/core/Item';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {List} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Heading, Text} from '@astryxdesign/core/Text';
import {ArrowLeft, Check, Printer, RotateCcw, X} from 'lucide-react';
import {BV_CONDITION_LABEL, defectName, fmtPhoria, fmtSigned, type BVPatient, type CVPatient} from './patient';
import type {Row} from './score';
import type {FinishedRun} from './StationRunner';
import {STATION_NAME} from './StationRunner';
import type {Patient, StationId} from './types';

const tone = (earned: number, max: number) => (earned >= max ? 'success' : earned >= max / 2 ? 'warning' : 'error');
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function Rows({rows}: {rows: Row[]}) {
  return (
    <List hasDividers>
      {rows.map(r => (
        <Item
          key={r.label}
          align="start"
          label={<Text weight="semibold">{r.label}</Text>}
          description={
            <VStack gap={0.5}>
              {r.sub && <Text type="supporting">{r.sub}</Text>}
              {r.notes.map(n => (
                <Text key={n} type="supporting" color="secondary">
                  • {n}
                </Text>
              ))}
            </VStack>
          }
          endContent={<Badge variant={tone(r.earned, r.max)} label={`${fmt(r.earned)} / ${r.max}`} />}
        />
      ))}
    </List>
  );
}

function BVProfile({p}: {p: BVPatient}) {
  const v = (x: {blur: number | null; brk: number; rec: number}) => `${x.blur ?? 'x'} / ${x.brk} / ${x.rec}Δ`;
  const items: [string, string][] = [
    ['Condition', BV_CONDITION_LABEL[p.condition]],
    ['Distance phoria', fmtPhoria(p.phoriaD)],
    ['Near phoria (40 cm)', fmtPhoria(p.phoriaN)],
    ['Amplitude', `OD ${p.amp.od.toFixed(2)} D · OS ${p.amp.os.toFixed(2)} D`],
    ['Lag (MEM / NOTT)', `OD ${fmtSigned(p.lag.od)} · OS ${fmtSigned(p.lag.os)} D`],
    ['NRA / PRA', `${fmtSigned(p.nra)} / ${fmtSigned(p.pra)} D`],
    ['BAF / MAF', `${p.baf.cpm} cpm${p.baf.hard ? ` (slow ${p.baf.hard})` : ''} / ${p.maf.cpm} cpm${p.maf.hard ? ` (slow ${p.maf.hard})` : ''}`],
    ['NPC', `${p.npc.brk} / ${p.npc.rec} cm${p.npc.suppresses ? ' (suppresses — no diplopia)' : ''}`],
    ['Distance BI', v(p.bi)],
    ['Distance BO', v(p.bo)],
  ];
  return (
    <List density="compact">
      {items.map(([k, val]) => (
        <Item key={k} density="compact" label={k} endContent={<Text weight="semibold">{val}</Text>} />
      ))}
    </List>
  );
}

export function Report({station, patient, run, onExit, onAgain}: {station: StationId; patient: Patient; run: FinishedRun; onExit: () => void; onAgain: () => void}) {
  const total = run.results.reduce((s, r) => s + r.earned, 0) + run.provided.reduce((s, p) => s + p.rows.reduce((a, b) => a + b.earned, 0), 0);
  const max = run.results.reduce((s, r) => s + r.max, 0) + run.provided.reduce((s, p) => s + p.rows.reduce((a, b) => a + b.max, 0), 0);
  return (
    <VStack gap={3} padding={3} maxWidth={1080} width="100%" style={{margin: '0 auto'}}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={1}>
        <Heading level={1}>
          <Text size="2xl" weight="semibold">
            {STATION_NAME[station]} — results
          </Text>
        </Heading>
        <HStack gap={1}>
          <Button label="Print" variant="ghost" icon={<Icon icon={Printer} />} onClick={() => window.print()} />
          <Button label="Home" variant="secondary" icon={<Icon icon={ArrowLeft} />} onClick={onExit} />
          <Button label="New patient" variant="primary" icon={<Icon icon={RotateCcw} />} onClick={onAgain} />
        </HStack>
      </HStack>

      <Card padding={3}>
        <VStack gap={2}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text size="4xl" weight="semibold" hasTabularNumbers>
              {fmt(total)} / {max}
            </Text>
            <Badge variant={total / max >= 0.75 ? 'success' : total / max >= 0.5 ? 'warning' : 'error'} label={`${Math.round((total / Math.max(1, max)) * 100)}%`} />
            <Text type="supporting">
              Time used {Math.floor(run.seconds / 60)}:{String(run.seconds % 60).padStart(2, '0')}
            </Text>
          </HStack>
          <ProgressBar label="Score" isLabelHidden value={total} max={max} variant={total / max >= 0.75 ? 'success' : total / max >= 0.5 ? 'warning' : 'error'} />
          {run.overtime && <Banner status="warning" title="Over time" description="You went past 8 minutes. In the exam, work after time is called would not be marked." collapsible={false} />}
          {run.flags.length > 0 ? (
            <Banner status="error" title={`Potential red flags (${run.flags.length})`} collapsible={{defaultIsOpen: true}}>
              <VStack gap={0.5}>
                {run.flags.map(f => (
                  <Text key={f}>• {f}</Text>
                ))}
              </VStack>
            </Banner>
          ) : (
            <Banner status="success" title="No red flags" collapsible={false} />
          )}
        </VStack>
      </Card>

      {run.results.map((r, i) => (
        <Card key={r.test.id} padding={3}>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center" wrap="wrap">
              <VStack gap={0.5}>
                <Text type="label" color="accent" weight="semibold">
                  {station === 'cv' ? `Colour Vision Technique ${i + 1}` : r.test.groupName}
                </Text>
                <Text size="lg" weight="semibold">
                  {r.test.name}
                </Text>
              </VStack>
              <Badge variant={tone(r.earned, r.max)} label={`${fmt(r.earned)} / ${r.max}`} />
            </HStack>
            <Rows rows={r.rows} />
            <Collapsible defaultIsOpen={false} trigger={<Text weight="semibold">Technique checklist</Text>}>
              <List density="compact">
                {r.checks.map(c => (
                  <Item
                    key={c.id}
                    density="compact"
                    startContent={<Icon icon={c.ok ? Check : X} size="sm" color={c.ok ? 'success' : 'error'} label={c.ok ? 'Done' : 'Missed'} />}
                    label={<Text color={c.ok ? 'primary' : 'secondary'}>{c.label}</Text>}
                    description={c.detail ? <Text type="supporting">{c.detail}</Text> : undefined}
                  />
                ))}
              </List>
            </Collapsible>
            <Card variant="muted" padding={2}>
              <VStack gap={0.5}>
                <Text type="label" weight="semibold">
                  Model record
                </Text>
                <Text>{r.model}</Text>
              </VStack>
            </Card>
            {r.insight && (
              <HStack gap={1} vAlign="start">
                <Icon icon={r.insight.ok ? Check : X} size="sm" color={r.insight.ok ? 'success' : 'error'} label={r.insight.ok ? 'Correct' : 'Incorrect'} />
                <VStack gap={0.5}>
                  <Text weight="semibold">Interpretation {r.insight.ok ? '— correct' : '— check this'} (practice, not part of the /30)</Text>
                  {r.insight.notes.map(n => (
                    <Text key={n} type="supporting">
                      {n}
                    </Text>
                  ))}
                </VStack>
              </HStack>
            )}
          </VStack>
        </Card>
      ))}

      {run.provided.length > 0 && (
        <Card padding={3}>
          <VStack gap={2}>
            <Text size="lg" weight="semibold">
              Interpretation of provided results
            </Text>
            {run.provided.map(p => (
              <VStack key={p.test.id} gap={1}>
                <Text type="label" color="accent" weight="semibold">
                  {p.test.name}
                </Text>
                <Rows rows={p.rows} />
                <Text type="supporting">Key: {p.model}</Text>
              </VStack>
            ))}
          </VStack>
        </Card>
      )}

      <Card padding={3}>
        <VStack gap={1.5}>
          <Text size="lg" weight="semibold">
            The simulated patient — {patient.name}, {patient.age}
          </Text>
          <Divider />
          {patient.kind === 'bv' ? <BVProfile p={patient} /> : <Text>{defectName((patient as CVPatient).defect, (patient as CVPatient).severity)}</Text>}
          <Text type="supporting">
            Rx OD {fmtSigned(patient.rx.od)} · OS {fmtSigned(patient.rx.os)} D{patient.wearsSpecs ? ' (spectacles worn)' : ''}
          </Text>
        </VStack>
      </Card>
    </VStack>
  );
}
