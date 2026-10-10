import {useEffect, useMemo, useState, type CSSProperties, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {HStack, Stack, VStack} from '@astryxdesign/core/Layout';
import {Section} from '@astryxdesign/core/Section';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {
  Activity,
  ArrowRight,
  ChevronRight,
  CircleGauge,
  Dna,
  Droplet,
  Focus,
  Hourglass,
  Layers,
  LayoutGrid,
  LogOut,
  Orbit,
  RotateCcw,
  ScanEye,
  Settings,
  Shuffle,
  Sparkles,
  Target,
  Waypoints,
  Zap,
} from 'lucide-react';
import {CASES} from '../data/cases';
import type {Case} from '../data/types';
import {bestByCase, clearAttempts, pct, type Attempt} from '../lib/progress';

// -----------------------------------------------------------------------------
// Static content
// -----------------------------------------------------------------------------

const WEEKS = [
  {week: 0, title: 'All cases', short: 'Eye', icon: Sparkles},
  {week: 1, title: 'Peripheral retina', short: 'Periphery', icon: Layers},
  {week: 2, title: 'Retinal vascular', short: 'Vascular', icon: Activity},
  {week: 3, title: 'Diabetic eye', short: 'Diabetes', icon: Droplet},
  {week: 4, title: 'AMD', short: 'AMD', icon: Focus},
  {week: 5, title: 'Maculopathies', short: 'Macula', icon: ScanEye},
  {week: 6, title: 'Retinal dystrophies', short: 'Dystrophy', icon: Dna},
  {week: 7, title: 'Optic neuropathies', short: 'Nerve', icon: Zap},
  {week: 8, title: 'Glaucoma', short: 'Glaucoma', icon: CircleGauge},
];

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const thumbFor = (c: Case) => (c.scans.find(s => /fundus|disc/i.test(s.modality)) ?? c.scans[0]).src;
const questionCount = (c: Case) => c.annotate.length + 6;
const initials = (name: string) => name.split(' ').map(p => p[0]).join('');

function useWide(min: number) {
  const q = `(min-width: ${min}px)`;
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia(q).matches));
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [q]);
  return wide;
}

// -----------------------------------------------------------------------------
// Small pieces
// -----------------------------------------------------------------------------

const tint = (name: 'graphite' | 'plum' | 'navy' | 'umber'): CSSProperties => ({
  background: `var(--cl-tint-${name})`,
  borderColor: 'transparent',
});

function StatTile({icon, label, value, tone}: {icon: typeof Activity; label: string; value: string; tone: 'graphite' | 'plum' | 'navy' | 'umber'}) {
  return (
    <Card padding={3} style={{...tint(tone), borderRadius: 'var(--radius-page, 28px)'}}>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Card padding={1.5} variant="transparent" style={{background: '#FFFFFF10', borderRadius: 'var(--radius-container)'}}>
            <Icon icon={icon} size="md" />
          </Card>
          <Text color="secondary">{label}</Text>
        </HStack>
        <Text size="3xl" weight="semibold" hasTabularNumbers justify="center">
          {value}
        </Text>
      </VStack>
    </Card>
  );
}

function Ring({value, label, caption, stroke}: {value: number; label: string; caption: string; stroke: string}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" width={112} height={112} role="img" aria-label={`${caption}: ${label}`}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--cl-grid-line)" strokeWidth={6} />
      <circle
        cx={50}
        cy={50}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0.001, Math.min(1, value)) * c} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x={50} y={50} textAnchor="middle" fontSize={17} fontWeight={600} fill="var(--color-text-primary)" style={{fontFamily: 'var(--font-family-body)'}}>
        {label}
      </text>
      <text x={50} y={66} textAnchor="middle" fontSize={8.5} fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
        {caption}
      </text>
    </svg>
  );
}

/** Best score per case as a smooth plum area, with the featured case called out. */
function ScoreArea({cases, best, featuredId, onPick}: {cases: Case[]; best: Record<string, number>; featuredId: string; onPick: (id: string) => void}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 210;
  const top = 46;
  const n = cases.length;
  const x = (i: number) => 14 + (i * (W - 28)) / Math.max(1, n - 1);
  const y = (v: number) => top + (1 - v) * (H - top - 14);
  const pts = cases.map((c, i) => ({x: x(i), y: y(best[c.id] ?? 0)}));
  const path = pts
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const q = pts[i - 1];
      const mx = (q.x + p.x) / 2;
      return `C${mx},${q.y} ${mx},${p.y} ${p.x},${p.y}`;
    })
    .join(' ');
  const any = Object.keys(best).length > 0;
  const fi = cases.findIndex(c => c.id === featuredId);
  const callout = any ? hover ?? (fi >= 0 ? fi : null) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Best score for each case" onMouseLeave={() => setHover(null)} style={{display: 'block', overflow: 'visible'}}>
      <defs>
        <linearGradient id="cl-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cl-area)" stopOpacity={0.95} />
          <stop offset="100%" stopColor="var(--cl-area)" stopOpacity={0.08} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(v => (
        <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="var(--cl-grid-line)" strokeDasharray={v === 0.75 ? '4 4' : undefined} />
      ))}
      <text x={W} y={y(0.75) - 5} textAnchor="end" fontSize={10} fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
        mastery 75%
      </text>
      <path d={`${path} L${pts[n - 1].x},${H} L${pts[0].x},${H} Z`} fill="url(#cl-area)" />
      <path d={path} fill="none" stroke="#C25AA8" strokeWidth={2} />
      {!any && (
        <text x={W / 2} y={y(0.45)} textAnchor="middle" fontSize={14} fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
          Finish a case to chart your scores
        </text>
      )}
      {callout !== null && (
        <g pointerEvents="none">
          <circle cx={pts[callout].x} cy={pts[callout].y} r={5} fill="#F4F2F0" stroke="#06070B" strokeWidth={2} />
          <g transform={`translate(${Math.min(W - 70, Math.max(70, pts[callout].x))} ${Math.max(18, pts[callout].y - 30)})`}>
            <rect x={-68} y={-17} width={136} height={30} rx={12} fill="#1E2029" stroke="#FFFFFF1A" />
            <text x={0} y={3} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="#F4F2F0" style={{fontFamily: 'var(--font-family-body)'}}>
              {initials(cases[callout].patient.name)} = {best[cases[callout].id] !== undefined ? pct(best[cases[callout].id]) : '—'}
            </text>
          </g>
        </g>
      )}
      {cases.map((c, i) => (
        <rect
          key={c.id}
          x={x(i) - (W - 28) / Math.max(1, n - 1) / 2}
          y={0}
          width={(W - 28) / Math.max(1, n - 1)}
          height={H}
          fill="transparent"
          style={{cursor: 'pointer'}}
          onMouseEnter={() => setHover(i)}
          onClick={() => onPick(c.id)}
        >
          <title>{`${c.patient.name}: ${best[c.id] !== undefined ? pct(best[c.id]) : 'not attempted'}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/** Scores of the featured case's recent runs as thin bars. */
function RunBars({scores}: {scores: number[]}) {
  const W = 300;
  const H = 130;
  const runs = scores.slice(-8);
  const step = W / 8;
  return (
    <svg viewBox={`0 0 ${W + 44} ${H}`} width="100%" role="img" aria-label="Scores of recent runs for this case" style={{display: 'block'}}>
      {[0, 0.25, 0.5, 0.75, 1].map(v => (
        <g key={v}>
          <line x1={0} x2={W} y1={H - 8 - v * (H - 16)} y2={H - 8 - v * (H - 16)} stroke="var(--cl-grid-line)" />
          {v > 0 && (
            <text x={W + 40} y={H - 8 - v * (H - 16) + 4} textAnchor="end" fontSize={11} fill="var(--color-text-primary)" style={{fontFamily: 'var(--font-family-body)'}}>
              {v * 100}%
            </text>
          )}
        </g>
      ))}
      {Array.from({length: 9}).map((_, i) => (
        <line key={i} x1={i * step} x2={i * step} y1={8} y2={H - 8} stroke="var(--cl-grid-line)" />
      ))}
      {runs.length === 0 ? (
        <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={12} fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
          No runs yet
        </text>
      ) : (
        runs.map((s, i) => (
          <rect key={i} x={i * step + step / 2 - 2} width={4} rx={2} y={H - 8 - Math.max(0.03, s) * (H - 16)} height={Math.max(0.03, s) * (H - 16)} fill="#F4F2F0">
            <title>{`Run ${scores.length - runs.length + i + 1}: ${pct(s)}`}</title>
          </rect>
        ))
      )}
    </svg>
  );
}

function Barcode({seed}: {seed: string}) {
  const bars: Array<{x: number; w: number}> = [];
  let x = 0;
  let h = 0;
  for (const ch of seed.repeat(6)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  while (x < 330) {
    h = (h * 1103515245 + 12345) >>> 0;
    const w = 1 + (h % 4);
    bars.push({x, w});
    x += w + 1 + ((h >> 8) % 3);
  }
  return (
    <svg viewBox="0 0 330 56" width="100%" height={56} aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={56} fill="#E9E7E3" />
      ))}
    </svg>
  );
}

function RailButton({label, icon, isActive, onClick, children}: {label: string; icon: typeof Activity; isActive?: boolean; onClick?: () => void; children?: ReactNode}) {
  return (
    <Button
      label={label}
      variant="ghost"
      size="lg"
      icon={<Icon icon={icon} size="md" />}
      onClick={onClick}
      width="100%"
      style={
        isActive
          ? {background: 'linear-gradient(90deg, var(--cl-plum-strong), var(--cl-plum))', borderRadius: '0 999px 999px 0', justifyContent: 'flex-start'}
          : {justifyContent: 'flex-start', color: 'var(--color-text-secondary)'}
      }>
      {children}
    </Button>
  );
}

// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------

interface Props {
  attempts: Attempt[];
  onStart: (caseId: string) => void;
  onAttemptsChange: (a: Attempt[]) => void;
}

export function Dashboard({attempts, onStart, onAttemptsChange}: Props) {
  const wide = useWide(1180);
  const medium = useWide(760);
  const [week, setWeek] = useState(0);
  const [featuredId, setFeaturedId] = useState(CASES[4].id);
  const best = useMemo(() => bestByCase(attempts), [attempts]);
  const featured = CASES.find(c => c.id === featuredId) ?? CASES[0];
  const list = CASES.filter(c => week === 0 || c.week === week);
  const runs = attempts.filter(a => a.caseId === featured.id).map(a => a.score);

  const attempted = Object.keys(best).length;
  const avg = attempts.length ? attempts.reduce((s, a) => s + a.score, 0) / attempts.length : 0;
  const mastered = CASES.filter(c => (best[c.id] ?? 0) >= 0.75).length;
  const scanCount = CASES.reduce((s, c) => s + c.scans.length, 0);

  const pickWeek = (w: number) => {
    setWeek(w);
    const inWeek = CASES.filter(c => w === 0 || c.week === w);
    if (!inWeek.some(c => c.id === featuredId)) setFeaturedId(inWeek[0].id);
  };
  const random = () => {
    const pool = list.length ? list : CASES;
    onStart(pool[Math.floor(Math.random() * pool.length)].id);
  };
  const weekInfo = WEEKS[featured.week];

  // ---- Left rail ------------------------------------------------------------
  const leftRail = (
    <VStack gap={1} width={220} paddingBlock={4} style={{flexShrink: 0, position: 'sticky', top: 0, height: '100dvh'}}>
      <HStack gap={1} paddingInline={4} paddingBlockEnd={6} vAlign="center">
        <Text size="2xl" weight="medium">
          CaseLab
        </Text>
        <Icon icon={Sparkles} size="sm" />
      </HStack>
      <RailButton label="Overview" icon={LayoutGrid} onClick={() => pickWeek(0)} />
      <RailButton label="Cases" icon={ScanEye} isActive />
      <RailButton label="Random case" icon={Shuffle} onClick={random} />
      <RailButton label="Orbit weeks" icon={Orbit} onClick={() => pickWeek((week % 8) + 1)} />
      <VStack gap={1} style={{marginTop: 'auto'}}>
        {attempts.length > 0 && (
          <RailButton
            label="Reset progress"
            icon={Settings}
            onClick={() => {
              clearAttempts();
              onAttemptsChange([]);
            }}
          />
        )}
        <RailButton label="Exit" icon={LogOut} onClick={() => pickWeek(0)} />
      </VStack>
    </VStack>
  );

  // ---- Right rail: week selector ("planets") --------------------------------
  const weekRail = (
    <Stack gap={2} hAlign="center" vAlign="center" paddingBlock={4} width={medium ? 96 : '100%'} direction={medium ? 'vertical' : 'horizontal'} style={medium ? {flexShrink: 0, position: 'sticky', top: 0, height: '100dvh'} : {flexShrink: 0}} wrap="wrap">
      {WEEKS.map(w => {
        const active = w.week === week;
        return (
          <Tooltip key={w.week} content={w.week ? `Week ${w.week} · ${w.title}` : 'All cases'} placement={medium ? 'start' : 'above'}>
            <IconButton
              label={w.week ? `Week ${w.week}: ${w.title}` : 'All cases'}
              variant="ghost"
              size="lg"
              icon={<Icon icon={w.icon} size="md" />}
              onClick={() => pickWeek(w.week)}
              style={
                active
                  ? {width: 72, height: 72, borderRadius: 999, background: 'radial-gradient(circle at 35% 30%, var(--cl-plum-strong), var(--cl-plum))', boxShadow: '0 0 40px #8A2B7366'}
                  : {width: 48, height: 48, borderRadius: 999, color: 'var(--color-text-secondary)'}
              }
            />
          </Tooltip>
        );
      })}
    </Stack>
  );

  // ---- Hero -----------------------------------------------------------------
  const hero = (
    <Grid columns={wide ? 2 : 1} gap={3} align="end">
      <VStack gap={0} style={{position: 'relative', minHeight: wide ? 600 : 420}}>
        <VStack style={{position: 'absolute', inset: '-4% -6% 18% -6%', background: 'var(--cl-hero-glow)', pointerEvents: 'none'}} />
        <img
          src="art/eye-section.webp"
          alt="Cross-section of the human eye"
          style={{position: 'relative', width: '100%', maxWidth: 640, marginInline: 'auto', display: 'block', filter: 'drop-shadow(0 30px 60px #E8461E33)'}}
        />
        <VStack gap={1} style={{position: 'relative', marginTop: wide ? -120 : -60}} paddingInline={2}>
          <Text weight="bold" style={{fontSize: 'var(--cl-display-size)', lineHeight: 0.9, letterSpacing: '-0.04em'}}>
            {weekInfo.short}
          </Text>
          <Text size="xl" color="secondary">
            The {ORDINAL[featured.week]} week of the OPTO3011 course · {weekInfo.title}
          </Text>
          <Button
            label={`Open ${featured.patient.name}'s case`}
            variant="ghost"
            size="lg"
            icon={<Icon icon={ScanEye} />}
            endContent={<Icon icon={ChevronRight} />}
            onClick={() => onStart(featured.id)}
            style={{alignSelf: 'flex-start', paddingInline: 0}}
          />
        </VStack>
      </VStack>

      <VStack gap={2}>
        <VStack gap={0}>
          <HStack hAlign="between" vAlign="end">
            <Text type="label" color="secondary">
              Best score by case
            </Text>
            <Text type="supporting">{attempted ? `${attempted} of ${CASES.length} attempted` : 'hover a point · click to feature'}</Text>
          </HStack>
          <ScoreArea cases={CASES} best={best} featuredId={featured.id} onPick={setFeaturedId} />
        </VStack>
        <HStack gap={2} vAlign="center">
          <VStack gap={0.5} style={{flex: 1}}>
            <Text type="label" color="secondary">
              Your runs · {featured.patient.name}
            </Text>
            <RunBars scores={runs} />
          </VStack>
        </HStack>

        <Card padding={1.5} style={{background: 'var(--cl-glass)', borderRadius: 999}}>
          <HStack gap={3} vAlign="center">
            <Card padding={3} style={{background: 'var(--cl-amber)', borderRadius: 999, border: 'none', boxShadow: '0 10px 30px #F59A4C55'}}>
              <Text weight="semibold" style={{color: 'var(--cl-amber-ink)'}}>
                {featured.patient.name}
              </Text>
            </Card>
            <Text size="3xl" weight="semibold" hasTabularNumbers>
              {featured.patient.age}
              {featured.patient.sex}
            </Text>
            <Text color="secondary">{featured.patient.id}</Text>
          </HStack>
        </Card>

        <Card padding={2} style={{background: 'var(--cl-glass)', borderRadius: 32}}>
          <HStack gap={2} hAlign="around" wrap="wrap">
            <Ring value={best[featured.id] ?? 0} label={best[featured.id] !== undefined ? pct(best[featured.id]) : '—'} caption="BEST" stroke="#C25AA8" />
            <Ring value={featured.scans.length / 5} label={String(featured.scans.length)} caption="SCANS" stroke="var(--cl-navy-ring)" />
            <Ring value={featured.difficulty / 3} label={'●'.repeat(featured.difficulty)} caption="DIFFICULTY" stroke="#9C9FAB" />
          </HStack>
        </Card>
      </VStack>
    </Grid>
  );

  // ---- Destinations ---------------------------------------------------------
  const destinations = (
    <VStack gap={2} style={{minWidth: 0}}>
      <HStack hAlign="between" vAlign="center">
        <Heading level={2}>
          <Text size="xl" weight="semibold">
            Choose destination
          </Text>
        </Heading>
        <Text type="supporting">{week ? `Week ${week} · ${WEEKS[week].title}` : `All ${CASES.length} cases`}</Text>
      </HStack>
      {list.map(c => {
        const isFeatured = c.id === featured.id;
        return (
          <Card
            key={c.id}
            padding={2}
            style={{
              background: isFeatured ? 'var(--cl-tint-plum)' : 'var(--cl-glass)',
              borderRadius: 24,
              borderColor: isFeatured ? '#C25AA855' : undefined,
              cursor: 'pointer',
            }}
            onClick={() => setFeaturedId(c.id)}>
            <HStack gap={2} vAlign="center">
              <img src={thumbFor(c)} alt="" width={60} height={60} style={{borderRadius: 999, objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 2px #FFFFFF14, 0 8px 24px #E8461E33'}} />
              <VStack gap={0.5} style={{flex: 1, minWidth: 0}}>
                <Text weight="semibold">{c.patient.name}</Text>
                <Text type="supporting" maxLines={1}>
                  {c.patient.complaint}
                </Text>
              </VStack>
              {medium && (
                <HStack gap={0.5} vAlign="center">
                  <Icon icon={Hourglass} size="sm" color="secondary" />
                  <Text type="supporting" hasTabularNumbers>
                    {questionCount(c)} Qs
                  </Text>
                </HStack>
              )}
              <IconButton label={`Start ${c.patient.name}`} variant="ghost" icon={<Icon icon={ArrowRight} color="accent" />} onClick={() => onStart(c.id)} />
            </HStack>
          </Card>
        );
      })}
    </VStack>
  );

  // ---- Ticket ---------------------------------------------------------------
  const ticket = (
    <Card padding={4} style={{background: 'var(--cl-glass)', borderRadius: 32}}>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="start">
          <VStack gap={0.5}>
            <Text type="label" weight="semibold" style={{color: 'var(--cl-rust)', letterSpacing: '0.08em'}}>
              CASE FILE
            </Text>
            <Text hasTabularNumbers>
              {featured.patient.id} · Week {featured.week}
            </Text>
          </VStack>
          <img src={thumbFor(featured)} alt="" width={64} height={64} style={{borderRadius: 999, objectFit: 'cover', boxShadow: '0 0 30px #E8461E55'}} />
        </HStack>
        <HStack hAlign="between" vAlign="center" gap={2}>
          <Text size="2xl" weight="semibold">
            Complaint
          </Text>
          <Divider variant="strong" style={{flex: 1, borderStyle: 'dotted'}} />
          <Text size="2xl" weight="semibold">
            Diagnosis
          </Text>
        </HStack>
        <HStack hAlign="between" gap={3}>
          <Text color="secondary" maxLines={3}>
            {featured.patient.complaint}
          </Text>
          <Text color="secondary" justify="end">
            ? hidden
          </Text>
        </HStack>
        <Divider style={{borderStyle: 'dashed'}} />
        <Card padding={2} variant="muted" style={{borderRadius: 20}}>
          <Barcode seed={featured.patient.id} />
        </Card>
        <Button label="Start case" variant="primary" size="lg" width="100%" onClick={() => onStart(featured.id)} style={{borderRadius: 999, height: 64, fontSize: 18}} />
      </VStack>
    </Card>
  );

  // ---- Seat grid ------------------------------------------------------------
  const seats = (
    <Card padding={4} style={{background: 'var(--cl-glass)', borderRadius: 32, borderColor: '#E8461E44'}}>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center">
          <Text weight="semibold" style={{color: 'var(--cl-rust)', letterSpacing: '0.06em'}}>
            CHOOSE THE CASE
          </Text>
          <IconButton label="Random case" variant="secondary" size="sm" icon={<Icon icon={Shuffle} />} onClick={random} />
        </HStack>
        <Divider style={{borderColor: '#E8461E55'}} />
        <Grid columns={5} gap={1.5}>
          {CASES.map(c => {
            const b = best[c.id];
            const state = b === undefined ? 'open' : b >= 0.75 ? 'done' : 'busy';
            const isFeatured = c.id === featured.id;
            const bg = state === 'done' ? '#1F6B45' : state === 'busy' ? 'var(--cl-rust)' : '#2A2C35';
            return (
              <Tooltip key={c.id} content={`${c.patient.name} · Week ${c.week}${b !== undefined ? ` · best ${pct(b)}` : ''}`}>
                <Button
                  label={`${initials(c.patient.name)}${c.week}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFeaturedId(c.id);
                    setWeek(0);
                  }}
                  style={{
                    background: bg,
                    color: '#F4F2F0',
                    borderRadius: '999px 999px 10px 10px',
                    height: 44,
                    width: '100%',
                    boxShadow: isFeatured ? '0 0 0 2px #F4F2F0' : 'inset 0 -3px 0 #00000055',
                  }}
                />
              </Tooltip>
            );
          })}
        </Grid>
        <HStack gap={3} wrap="wrap">
          <Text type="supporting">● Not attempted</Text>
          <Text type="supporting" style={{color: 'var(--cl-rust)'}}>
            ● Needs work
          </Text>
          <Text type="supporting" style={{color: '#3FBF7F'}}>
            ● Mastered ≥75%
          </Text>
        </HStack>
      </VStack>
    </Card>
  );

  // ---- Inspired card (exploded eye) ----------------------------------------
  const inspired = (
    <Card
      padding={4}
      style={{
        borderRadius: 32,
        minHeight: 260,
        background: 'linear-gradient(90deg, #06070BF2 0%, #06070BAA 45%, #06070B00 75%), url(art/eye-exploded.webp) right center / auto 130% no-repeat, #0B0E16',
        cursor: 'pointer',
      }}
      onClick={random}>
      <VStack gap={1} height="100%">
        <Text size="2xl" weight="semibold">
          Get inspired
        </Text>
        <Text color="secondary">Random patient · {CASES.length} cases</Text>
        <HStack hAlign="between" vAlign="center" style={{marginTop: 'auto', paddingTop: 80}}>
          <Text size="3xl" weight="semibold">
            Surprise me
          </Text>
          <Icon icon={ArrowRight} size="lg" />
        </HStack>
      </VStack>
    </Card>
  );

  const stats = (
    <Grid columns={medium ? 4 : 2} gap={2}>
      <StatTile icon={Hourglass} label="Cases attempted" value={`${attempted}/${CASES.length}`} tone="graphite" />
      <StatTile icon={Target} label="Average score" value={attempts.length ? pct(avg) : '—'} tone="plum" />
      <StatTile icon={Waypoints} label="Cases mastered" value={String(mastered)} tone="navy" />
      <StatTile icon={ScanEye} label="Patient scans" value={String(scanCount)} tone="umber" />
    </Grid>
  );

  return (
    <Section variant="transparent" padding={0} minHeight="100dvh" style={{background: 'var(--cl-space)', backgroundAttachment: 'fixed', overflowX: 'clip'}}>
      <HStack gap={0} vAlign="stretch" minHeight="100dvh">
        {wide && leftRail}
        <VStack gap={5} padding={medium ? 4 : 2} style={{flex: 1, minWidth: 0}}>
          {!wide && (
            <HStack hAlign="between" vAlign="center">
              <HStack gap={1} vAlign="center">
                <Text size="2xl" weight="medium">
                  CaseLab
                </Text>
                <Icon icon={Sparkles} size="sm" />
              </HStack>
              <Button label="Random" variant="primary" icon={<Icon icon={Shuffle} />} onClick={random} />
            </HStack>
          )}
          {stats}
          {!medium && weekRail}
          {hero}
          <Grid columns={wide ? 2 : 1} gap={4} align="start">
            {destinations}
            <VStack gap={3} style={{minWidth: 0}}>
              {ticket}
              {seats}
              {inspired}
            </VStack>
          </Grid>
          <HStack hAlign="between" wrap="wrap" gap={2}>
            <Text type="supporting">Version 2.0 · OPTO3011 Weeks 1–8</Text>
            {attempts.length > 0 && !wide && (
              <Button
                label="Reset progress"
                variant="ghost"
                size="sm"
                icon={<Icon icon={RotateCcw} />}
                onClick={() => {
                  clearAttempts();
                  onAttemptsChange([]);
                }}
              />
            )}
          </HStack>
        </VStack>
        {medium && weekRail}
      </HStack>
    </Section>
  );
}
