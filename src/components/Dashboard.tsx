import {useMemo, useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, Layout, LayoutContent, LayoutHeader, VStack} from '@astryxdesign/core/Layout';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Section} from '@astryxdesign/core/Section';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow} from '@astryxdesign/core/Table';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Activity, Eye, Play, ScanEye, Shuffle, Target, Trophy} from 'lucide-react';
import {CASES} from '../data/cases';
import {bestByCase, clearAttempts, pct, type Attempt} from '../lib/progress';

const WEEKS: Array<{value: string; label: string}> = [
  {value: 'all', label: 'All cases'},
  {value: '1', label: 'W1 Peripheral retina'},
  {value: '2', label: 'W2 Vascular'},
  {value: '3', label: 'W3 Diabetes'},
  {value: '4', label: 'W4 AMD'},
  {value: '5', label: 'W5 Macula'},
  {value: '6', label: 'W6 Dystrophies'},
  {value: '7', label: 'W7 Optic nerve'},
  {value: '8', label: 'W8 Glaucoma'},
];

interface Props {
  attempts: Attempt[];
  onStart: (caseId: string) => void;
  onAttemptsChange: (a: Attempt[]) => void;
}

function StatTile({icon, label, value, detail}: {icon: typeof Eye; label: string; value: string; detail: string}) {
  return (
    <Card padding={3}>
      <VStack gap={1}>
        <HStack gap={1} vAlign="center">
          <Icon icon={icon} size="sm" color="accent" />
          <Text type="supporting">{label}</Text>
        </HStack>
        <Text size="2xl" weight="semibold" hasTabularNumbers>
          {value}
        </Text>
        <Text type="supporting">{detail}</Text>
      </VStack>
    </Card>
  );
}

export function Dashboard({attempts, onStart, onAttemptsChange}: Props) {
  const [week, setWeek] = useState('all');
  const best = useMemo(() => bestByCase(attempts), [attempts]);
  const visible = CASES.filter(c => week === 'all' || String(c.week) === week);
  const attempted = Object.keys(best).length;
  const avg = attempts.length ? attempts.reduce((s, a) => s + a.score, 0) / attempts.length : 0;
  const scanCount = CASES.reduce((s, c) => s + c.scans.length, 0);
  const weakest = CASES.filter(c => best[c.id] !== undefined).sort((a, b) => best[a.id] - best[b.id])[0];

  const startRandom = () => {
    const pool = visible.length ? visible : CASES;
    onStart(pool[Math.floor(Math.random() * pool.length)].id);
  };

  return (
    <Section variant="section" padding={0} height="100dvh">
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={3}>
            <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
              <HStack gap={2} vAlign="center">
                <Icon icon={ScanEye} size="lg" color="accent" />
                <VStack gap={0}>
                  <Heading level={1}>
                    Ocular Disease Case Lab
                  </Heading>
                  <Text type="supporting">OPTO3011 Disease of the Eye 2 · exam practice, Weeks 1–8</Text>
                </VStack>
              </HStack>
              <HStack gap={1}>
                {attempts.length > 0 && (
                  <Button
                    label="Reset progress"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearAttempts();
                      onAttemptsChange([]);
                    }}
                  />
                )}
                <Button label="Random case" variant="primary" icon={<Icon icon={Shuffle} />} onClick={startRandom} />
              </HStack>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent padding={4} isScrollable>
            <VStack gap={4}>
              <Grid columns={{minWidth: 200}} gap={2}>
                <StatTile icon={Activity} label="Cases attempted" value={`${attempted}/${CASES.length}`} detail={`${attempts.length} run${attempts.length === 1 ? '' : 's'} logged`} />
                <StatTile icon={Target} label="Average score" value={attempts.length ? pct(avg) : '—'} detail="Across every run" />
                <StatTile icon={Trophy} label="Needs work" value={weakest ? pct(best[weakest.id]) : '—'} detail={weakest ? weakest.topic : 'Attempt a case to see'} />
                <StatTile icon={Eye} label="Patient scans" value={String(scanCount)} detail="Fundus · OCT · FFA · FAF · VF" />
              </Grid>

              <Card padding={0}>
                <VStack gap={0}>
                  <Section variant="transparent" padding={3} dividers={['bottom']}>
                    <VStack gap={2}>
                      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
                        <VStack gap={0.5}>
                          <Heading level={2}>
                            Patient worklist
                          </Heading>
                          <Text type="supporting">
                            Each run draws a different mix of history, grading and management questions.
                          </Text>
                        </VStack>
                      </HStack>
                      <TabList value={week} onChange={setWeek} size="sm" overflow="scroll" aria-label="Filter by week">
                        {WEEKS.map(w => (
                          <Tab key={w.value} value={w.value} label={w.label} />
                        ))}
                      </TabList>
                    </VStack>
                  </Section>
                  <Table density="balanced" hasHover verticalAlign="middle">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Patient</TableHeaderCell>
                        <TableHeaderCell>Presenting complaint</TableHeaderCell>
                        <TableHeaderCell>Week</TableHeaderCell>
                        <TableHeaderCell>Imaging</TableHeaderCell>
                        <TableHeaderCell>Best</TableHeaderCell>
                        <TableHeaderCell> </TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <VStack gap={0}>
                              <Text weight="semibold">{c.patient.name}</Text>
                              <Text type="supporting" hasTabularNumbers>
                                {c.patient.id} · {c.patient.age}
                                {c.patient.sex}
                              </Text>
                            </VStack>
                          </TableCell>
                          <TableCell>
                            <Text maxLines={2}>{c.patient.complaint}</Text>
                          </TableCell>
                          <TableCell>
                            <VStack gap={0}>
                              <Text hasTabularNumbers>Week {c.week}</Text>
                              <Text type="supporting">{c.topic}</Text>
                            </VStack>
                          </TableCell>
                          <TableCell>
                            <Badge variant="cyan" label={`${c.scans.length} scans`} />
                          </TableCell>
                          <TableCell>
                            {best[c.id] !== undefined ? (
                              <ProgressBar
                                label={`Best score for ${c.patient.name}`}
                                isLabelHidden
                                hasValueLabel
                                value={Math.round(best[c.id] * 100)}
                                variant={best[c.id] >= 0.75 ? 'success' : best[c.id] >= 0.5 ? 'warning' : 'error'}
                              />
                            ) : (
                              <Text type="supporting">Not attempted</Text>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              label={best[c.id] !== undefined ? 'Retry' : 'Start'}
                              size="sm"
                              variant={best[c.id] !== undefined ? 'secondary' : 'primary'}
                              icon={<Icon icon={Play} />}
                              onClick={() => onStart(c.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </VStack>
              </Card>

              <Card padding={3} variant="muted">
                <VStack gap={1}>
                  <Heading level={2}>
                    How a case runs
                  </Heading>
                  <Text type="supporting">
                    Read the presenting complaint → list your differentials → answer a history/tests question → exam
                    findings and scans unlock → mark findings on the scans with arrows, lines, boxes or freehand and
                    label them → give the final diagnosis and pathophysiology → finish with randomly drawn grading,
                    management or MCQ questions. Every answer is auto-marked against key words, phrases and lesion
                    locations from the course content.
                  </Text>
                </VStack>
              </Card>
            </VStack>
          </LayoutContent>
        }
      />
    </Section>
  );
}
