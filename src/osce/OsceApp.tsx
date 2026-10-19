import {useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
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
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Heading, Text} from '@astryxdesign/core/Text';
import {ArrowLeft, Dices, Eye, Glasses, Palette, Play, Trash2} from 'lucide-react';
import {NORMS} from './norms';
import {assessorPicks, BV_CATEGORIES, clearOsceAttempts, GROUPS, loadOsceAttempts, type OsceAttempt} from './registry';
import {newSeed} from './rng';
import {STATION_NAME, StationRunner, type RunConfig} from './StationRunner';
import type {StationId} from './types';

type Mode = 'assessor' | 'chosen';
interface Route {
  config: RunConfig;
  mode: Mode;
}

const BRIEF: Record<StationId, string> = {
  bv: 'Three tests, one from each category, chosen by the assessor. Identify whether spectacle correction is needed and test accordingly. 8 minutes including recording.',
  cv: 'Two colour vision screening techniques chosen by the assessor (congenital screening), recorded and interpreted — then interpret a different patient’s results for the same two tests. 8 minutes.',
};

function StationCard({station, onStart}: {station: StationId; onStart: (r: Route) => void}) {
  const [timed, setTimed] = useState(true);
  const groups = GROUPS.filter(g => g.station === station);
  const [chosen, setChosen] = useState<string[]>(() => (station === 'bv' ? BV_CATEGORIES.map(c => groups.find(g => g.category === c.id)!.id) : [groups[0].id, groups[1].id]));
  const launch = (mode: Mode) => {
    const seed = newSeed();
    onStart({mode, config: {station, timed, seed, groups: mode === 'assessor' ? assessorPicks(station, seed) : chosen}});
  };
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <HStack gap={1} vAlign="center">
          <Icon icon={station === 'bv' ? Glasses : Palette} size="md" color="accent" />
          <Heading level={2}>
            <Text size="xl" weight="semibold">
              {STATION_NAME[station]}
            </Text>
          </Heading>
          <Badge label="/30" />
        </HStack>
        <Text type="supporting">{BRIEF[station]}</Text>
        <HStack gap={1} vAlign="center" wrap="wrap">
          <SegmentedControl label="Timing" size="sm" value={timed ? 'timed' : 'free'} onChange={v => setTimed(v === 'timed')}>
            <SegmentedControlItem value="timed" label="8-minute exam" />
            <SegmentedControlItem value="free" label="Untimed practice" />
          </SegmentedControl>
        </HStack>
        <Button label="Assessor’s choice — random tests" variant="primary" icon={<Icon icon={Dices} />} onClick={() => launch('assessor')} />
        <Collapsible defaultIsOpen={false} trigger={<Text weight="semibold">Or choose the tests</Text>}>
          <VStack gap={1.5}>
            {station === 'bv' ? (
              BV_CATEGORIES.map((c, i) => (
                <Selector
                  key={c.id}
                  label={c.title}
                  size="sm"
                  value={chosen[i]}
                  options={groups.filter(g => g.category === c.id).map(g => ({value: g.id, label: g.name}))}
                  onChange={v => setChosen(s => s.map((x, j) => (j === i ? v : x)))}
                />
              ))
            ) : (
              <CheckboxList label="Pick two techniques" value={chosen} onChange={v => setChosen(v.slice(-2))} density="compact">
                {groups.map(g => (
                  <CheckboxListItem key={g.id} value={g.id} label={g.name} />
                ))}
              </CheckboxList>
            )}
            <Button label="Start with these tests" icon={<Icon icon={Play} />} isDisabled={station === 'cv' && chosen.length !== 2} onClick={() => launch('chosen')} />
          </VStack>
        </Collapsible>
      </VStack>
    </Card>
  );
}

function SinglePractice({onStart}: {onStart: (r: Route) => void}) {
  const [gid, setGid] = useState(GROUPS[0].id);
  const g = GROUPS.find(x => x.id === gid)!;
  return (
    <Card padding={3}>
      <VStack gap={1.5}>
        <HStack gap={1} vAlign="center">
          <Icon icon={Eye} size="md" color="accent" />
          <Text size="lg" weight="semibold">
            Practise one test
          </Text>
        </HStack>
        <Text type="supporting">Untimed, one technique, marked out of 10 with full feedback.</Text>
        <Selector
          label="Test"
          value={gid}
          hasSearch
          options={[
            {type: 'section', title: 'Binocular vision', options: GROUPS.filter(x => x.station === 'bv').map(x => ({value: x.id, label: x.name}))},
            {type: 'section', title: 'Colour vision', options: GROUPS.filter(x => x.station === 'cv').map(x => ({value: x.id, label: x.name}))},
          ]}
          onChange={setGid}
        />
        <Button label={`Practise ${g.name}`} icon={<Icon icon={Play} />} onClick={() => onStart({mode: 'chosen', config: {station: g.station, timed: false, seed: newSeed(), groups: [gid], single: true}})} />
      </VStack>
    </Card>
  );
}

function History({attempts, onClear}: {attempts: OsceAttempt[]; onClear: () => void}) {
  if (!attempts.length) return null;
  const recent = attempts.slice(-8).reverse();
  return (
    <Card padding={3}>
      <VStack gap={1}>
        <HStack hAlign="between" vAlign="center">
          <Text size="lg" weight="semibold">
            Recent attempts
          </Text>
          <Button label="Clear" size="sm" variant="ghost" icon={<Icon icon={Trash2} />} onClick={onClear} />
        </HStack>
        <List hasDividers density="compact">
          {recent.map(a => (
            <Item
              key={a.date}
              density="compact"
              label={`${STATION_NAME[a.station]} · ${a.tests.map(id => GROUPS.find(g => g.variants.some(v => v.id === id))?.variants.find(v => v.id === id)?.short ?? id).join(', ')}`}
              description={new Date(a.date).toLocaleString()}
              endContent={
                <HStack gap={1}>
                  {a.flags > 0 && <Badge variant="error" label={`${a.flags} flag${a.flags === 1 ? '' : 's'}`} />}
                  <Badge variant={a.score / a.max >= 0.75 ? 'success' : a.score / a.max >= 0.5 ? 'warning' : 'error'} label={`${a.score % 1 ? a.score.toFixed(1) : a.score} / ${a.max}`} />
                </HStack>
              }
            />
          ))}
        </List>
      </VStack>
    </Card>
  );
}

function Reference() {
  return (
    <Card padding={3}>
      <Collapsible defaultIsOpen={false} trigger={<Text size="lg" weight="semibold">Quick reference — norms &amp; criteria</Text>}>
        <VStack gap={1}>
          <Text weight="semibold">Binocular vision</Text>
          <List density="compact">
            {[NORMS.mem.text, 'Amplitude: Hofstetter min 15 − 0.25×age, mean 18.5 − 0.3×age, max 25 − 0.4×age', NORMS.nra.text, NORMS.pra.text, NORMS.baf.text, NORMS.maf.text, NORMS.npc.text, NORMS.phoriaD.text, NORMS.phoriaN.text, NORMS.bi.text, NORMS.bo.text].map(t => (
              <Item key={t} density="compact" label={t} />
            ))}
          </List>
          <Divider />
          <Text weight="semibold">Colour vision</Text>
          <List density="compact">
            {[
              'Ishihara 24-plate: plates 1–15; ≥ 13 correct = normal, ≤ 9 = deficient. Plates 16–17: protan reads 6 / 2, deutan 2 / 4. 75 cm, ~3 s per plate.',
              'HRR: demo 1–4, screening 5–10 (B-Y 5–6, R-G 7–10); diagnostic R-G 11–15 mild, 16–18 medium, 19–20 strong; B-Y 21–22 medium, 23–24 strong.',
              'D-15 / Lanthony desat: ≥ 2 major (diametrical) crossings = fail; axis gives the type. D-15 passes mild defects; desat fails them.',
              'City University: part 1 — 10 spots; part 2 — majority column of choices gives the type.',
              'Medmont C-100: mean of ~5 readings; negative (red end) = protan, positive (green end) = deutan; ≈ −2…+2 normal. No severity grading.',
            ].map(t => (
              <Item key={t} density="compact" label={t} />
            ))}
          </List>
          <Text type="supporting">
            Norms from Morgan / Haynes (via the WheezyE/optometry norms sheet), Hofstetter, Scheiman et al. 2003 and Zellers et al. Check them against your clinic’s protocol.
          </Text>
        </VStack>
      </Collapsible>
    </Card>
  );
}

export function OsceApp({onBack}: {onBack?: () => void}) {
  const [route, setRoute] = useState<Route | null>(null);
  const [attempts, setAttempts] = useState<OsceAttempt[]>(() => loadOsceAttempts());

  if (route) {
    const again = () => {
      const seed = newSeed();
      setRoute({...route, config: {...route.config, seed, groups: route.mode === 'assessor' ? assessorPicks(route.config.station, seed) : route.config.groups}});
    };
    return (
      <StationRunner
        key={route.config.seed}
        config={route.config}
        onExit={() => {
          setAttempts(loadOsceAttempts());
          setRoute(null);
        }}
        onAgain={again}
      />
    );
  }

  return (
    <VStack gap={3} padding={3} maxWidth={1180} width="100%" style={{margin: '0 auto'}}>
      <HStack gap={1} vAlign="center" wrap="wrap">
        {onBack && <Button label="CaseLab" variant="ghost" icon={<Icon icon={ArrowLeft} />} onClick={onBack} />}
        <VStack gap={0.5}>
          <Heading level={1}>
            <Text size="3xl" weight="semibold">
              OSCE Clinic
            </Text>
          </Heading>
          <Text type="supporting">OPTO3009 Clinical Skills 3 — simulated binocular vision and colour vision OSCEs with patients who respond to what you do.</Text>
        </VStack>
      </HStack>
      <Grid columns={{minWidth: 340, max: 2}} gap={3}>
        <StationCard station="bv" onStart={setRoute} />
        <StationCard station="cv" onStart={setRoute} />
      </Grid>
      <Grid columns={{minWidth: 340, max: 2}} gap={3}>
        <SinglePractice onStart={setRoute} />
        <Card padding={3}>
          <VStack gap={1}>
            <Text size="lg" weight="semibold">
              How it works
            </Text>
            <List density="compact">
              <Item density="compact" descriptionLines={4} label="1 · Instructions" description="Pick what you’d say. The patient does exactly what you tell them — skip “first sustained blur” and they report late." />
              <Item density="compact" descriptionLines={4} label="2 · Set up" description="Correction, target, distance, lighting, occlusion, test care." />
              <Item density="compact" descriptionLines={4} label="3 · Perform & record" description="Run the instrument, watch and listen to the patient, record on the sheet and interpret." />
              <Item density="compact" descriptionLines={4} label="Marks" description="Rubric rows from the official sheet, red flags, model records and the patient’s hidden findings." />
            </List>
          </VStack>
        </Card>
      </Grid>
      <History
        attempts={attempts}
        onClear={() => {
          clearOsceAttempts();
          setAttempts([]);
        }}
      />
      <Reference />
    </VStack>
  );
}
