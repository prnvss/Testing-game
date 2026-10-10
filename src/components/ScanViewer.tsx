import {useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Popover} from '@astryxdesign/core/Popover';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Slider} from '@astryxdesign/core/Slider';
import {Text} from '@astryxdesign/core/Text';
import {Thumbnail} from '@astryxdesign/core/Thumbnail';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {
  Circle,
  Contrast,
  Crosshair,
  Eye,
  EyeOff,
  Hand,
  ImageOff,
  Maximize,
  Minus,
  MoveUpRight,
  PenLine,
  Plus,
  RectangleHorizontal,
  Ruler,
  ScanSearch,
  SlidersHorizontal,
  SunMedium,
  Trash2,
  Undo2,
} from 'lucide-react';
import type {Region, Scan, Target} from '../data/types';
import type {Annotation, TargetResult, Tool} from '../lib/marking';

export type ViewerTool = Tool | 'pan';

/** Annotation palette — fixed clinical-overlay colours, legible on fundus and OCT alike. */
const INK = {
  draft: '#4FD1E8',
  selected: '#FFD166',
  found: '#7FD6A4',
  partial: '#E9C46A',
  stray: '#F08A7E',
  answer: '#F4F7FA',
  halo: '#05090C',
};

const TOOLS: Array<{tool: ViewerTool; label: string; key: string; icon: typeof Hand}> = [
  {tool: 'pan', label: 'Pan / select', key: 'V', icon: Hand},
  {tool: 'arrow', label: 'Arrow', key: 'A', icon: MoveUpRight},
  {tool: 'line', label: 'Line / measure', key: 'L', icon: Ruler},
  {tool: 'rect', label: 'Box', key: 'R', icon: RectangleHorizontal},
  {tool: 'ellipse', label: 'Ellipse', key: 'E', icon: Circle},
  {tool: 'pen', label: 'Freehand outline', key: 'P', icon: PenLine},
  {tool: 'point', label: 'Point marker', key: 'D', icon: Crosshair},
];

interface Adjust {
  brightness: number; // 0.4..2
  contrast: number; // 0.4..2.5
  invert: boolean;
  redFree: boolean;
}
const DEFAULT_ADJUST: Adjust = {brightness: 1, contrast: 1, invert: false, redFree: false};

export interface Overlay {
  targets: Target[];
  results: TargetResult[];
  stray: Record<string, string>;
}

interface Props {
  scans: Scan[];
  /** Scans the current question asks about (opened in the viewports). */
  focusScanIds: string[];
  /** When false the canvas is read-only (text question or already marked). */
  canDraw: boolean;
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (a: Annotation) => void;
  onDelete: (id: string) => void;
  onUndo: () => void;
  onClear: () => void;
  overlay?: Overlay;
}

// -----------------------------------------------------------------------------
// Geometry helpers
// -----------------------------------------------------------------------------

type Pt = {x: number; y: number};
let idCounter = 0;
const newId = () => `a${Date.now().toString(36)}${(idCounter++).toString(36)}`;

function regionCentre(r: Region): Pt {
  return r.kind === 'circle' ? {x: r.cx, y: r.cy} : {x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2};
}

// -----------------------------------------------------------------------------
// One viewport
// -----------------------------------------------------------------------------

interface ViewportProps {
  scan: Scan;
  tool: ViewerTool;
  canDraw: boolean;
  adjust: Adjust;
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (a: Annotation) => void;
  overlay?: Overlay;
  showAnswers: boolean;
  fitSignal: number;
  zoomSignal: {n: number; factor: number};
  isActive: boolean;
  onActivate: () => void;
}

function Viewport({
  scan,
  tool,
  canDraw,
  adjust,
  annotations,
  selectedId,
  onSelect,
  onAdd,
  overlay,
  showAnswers,
  fitSignal,
  zoomSignal,
  isActive,
  onActivate,
}: ViewportProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({w: 0, h: 0});
  const [nat, setNat] = useState<{w: number; h: number} | null>(null);
  const [view, setView] = useState({s: 1, tx: 0, ty: 0});
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [failed, setFailed] = useState(false);
  const panRef = useRef<{x: number; y: number; tx: number; ty: number} | null>(null);
  const filterId = `f-${scan.id}`;

  // Natural image size.
  useEffect(() => {
    setNat(null);
    setFailed(false);
    const img = new Image();
    img.onload = () => setNat({w: img.naturalWidth, h: img.naturalHeight});
    img.onerror = () => setFailed(true);
    img.src = scan.src;
  }, [scan.src]);

  // Track viewport size.
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBox({w: entry.contentRect.width, h: entry.contentRect.height}));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!nat || !box.w || !box.h) return;
    const s = Math.min(box.w / nat.w, box.h / nat.h) * 0.96;
    setView({s, tx: (box.w - nat.w * s) / 2, ty: (box.h - nat.h * s) / 2});
  }, [nat, box.w, box.h]);

  useEffect(fit, [fit, fitSignal]);

  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    setView(v => {
      const s = Math.min(40, Math.max(0.05, v.s * factor));
      const k = s / v.s;
      return {s, tx: sx - (sx - v.tx) * k, ty: sy - (sy - v.ty) * k};
    });
  }, []);

  useEffect(() => {
    if (zoomSignal.n && isActive) zoomAt(zoomSignal.factor, box.w / 2, box.h / 2);
    // Only respond to new zoom requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomSignal.n]);

  // Wheel zoom (non-passive so the page doesn't scroll).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, {passive: false});
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const toImage = (e: RPointerEvent): Pt | null => {
    const el = svgRef.current;
    if (!el || !nat) return null;
    const r = el.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - view.tx) / view.s / nat.w,
      y: (e.clientY - r.top - view.ty) / view.s / nat.h,
    };
  };

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    onActivate();
    const drawing = canDraw && tool !== 'pan' && e.button === 0 && !e.altKey;
    if (!drawing) {
      if (e.target === svgRef.current || (e.target as Element).getAttribute('data-bg')) onSelect(null);
      panRef.current = {x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty};
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    const p = toImage(e);
    if (!p) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    if (tool === 'point') {
      const a: Annotation = {id: newId(), scanId: scan.id, tool: 'point', points: [p], label: ''};
      onAdd(a);
      return;
    }
    setDraft({id: newId(), scanId: scan.id, tool: tool as Tool, points: [p, p], label: ''});
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const p = toImage(e);
    setCursor(p);
    if (panRef.current) {
      const st = panRef.current;
      setView(v => ({...v, tx: st.tx + e.clientX - st.x, ty: st.ty + e.clientY - st.y}));
      return;
    }
    if (!draft || !p) return;
    setDraft(d => {
      if (!d) return d;
      if (d.tool === 'pen') {
        const last = d.points[d.points.length - 1];
        if (Math.hypot(last.x - p.x, last.y - p.y) < 0.003) return d;
        return {...d, points: [...d.points, p]};
      }
      return {...d, points: [d.points[0], p]};
    });
  };

  const onPointerUp = () => {
    panRef.current = null;
    if (!draft) return;
    const [a, b] = [draft.points[0], draft.points[draft.points.length - 1]];
    const size = draft.tool === 'pen' ? draft.points.length : Math.hypot(a.x - b.x, a.y - b.y);
    if ((draft.tool === 'pen' && size > 4) || (draft.tool !== 'pen' && size > 0.008)) onAdd(draft);
    setDraft(null);
  };

  const filter = (() => {
    const {brightness: b, contrast: c, invert, redFree} = adjust;
    const slope = b * c;
    const intercept = (-(0.5 * c) + 0.5) * b;
    return (
      <filter id={filterId} colorInterpolationFilters="sRGB">
        {redFree ? (
          <feColorMatrix type="matrix" values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 1 0" />
        ) : (
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        )}
        <feComponentTransfer>
          <feFuncR type="linear" slope={slope} intercept={intercept} />
          <feFuncG type="linear" slope={slope} intercept={intercept} />
          <feFuncB type="linear" slope={slope} intercept={intercept} />
        </feComponentTransfer>
        {invert && (
          <feComponentTransfer>
            <feFuncR type="table" tableValues="1 0" />
            <feFuncG type="table" tableValues="1 0" />
            <feFuncB type="table" tableValues="1 0" />
          </feComponentTransfer>
        )}
      </filter>
    );
  })();

  const W = nat?.w ?? 1;
  const H = nat?.h ?? 1;
  const px = (n: number) => n / view.s; // screen px → image px
  const statusFor = (a: Annotation): keyof typeof INK => {
    if (!overlay) return a.id === selectedId ? 'selected' : 'draft';
    const hit = overlay.results.find(r => r.annotationId === a.id);
    if (!hit) return 'stray';
    return hit.status === 'found' ? 'found' : 'partial';
  };

  const renderShape = (a: Annotation, colour: string, isDraft = false) => {
    const pts = a.points.map(p => ({x: p.x * W, y: p.y * H}));
    const sw = px(2.25);
    const common = {
      stroke: colour,
      strokeWidth: sw,
      fill: 'none',
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
    };
    const halo = {...common, stroke: INK.halo, strokeWidth: sw * 2.6, opacity: 0.55};
    const [p, q] = [pts[0], pts[pts.length - 1]];
    let shape: React.ReactNode = null;
    let labelAt = q;
    switch (a.tool) {
      case 'arrow': {
        const ang = Math.atan2(q.y - p.y, q.x - p.x);
        const h = px(13);
        const head = [
          `${q.x},${q.y}`,
          `${q.x - h * Math.cos(ang - 0.42)},${q.y - h * Math.sin(ang - 0.42)}`,
          `${q.x - h * Math.cos(ang + 0.42)},${q.y - h * Math.sin(ang + 0.42)}`,
        ].join(' ');
        shape = (
          <>
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...halo} />
            <polygon points={head} fill={INK.halo} opacity={0.55} stroke={INK.halo} strokeWidth={sw * 1.6} />
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...common} />
            <polygon points={head} fill={colour} stroke={colour} strokeWidth={sw * 0.5} strokeLinejoin="round" />
          </>
        );
        labelAt = p;
        break;
      }
      case 'line': {
        const t = px(6);
        const ang = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
        const tick = (c: Pt) => (
          <line x1={c.x - t * Math.cos(ang)} y1={c.y - t * Math.sin(ang)} x2={c.x + t * Math.cos(ang)} y2={c.y + t * Math.sin(ang)} {...common} />
        );
        shape = (
          <>
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...halo} />
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...common} />
            {tick(p)}
            {tick(q)}
          </>
        );
        labelAt = {x: (p.x + q.x) / 2, y: (p.y + q.y) / 2};
        break;
      }
      case 'rect': {
        const x = Math.min(p.x, q.x);
        const y = Math.min(p.y, q.y);
        const w = Math.abs(q.x - p.x);
        const h = Math.abs(q.y - p.y);
        shape = (
          <>
            <rect x={x} y={y} width={w} height={h} {...halo} />
            <rect x={x} y={y} width={w} height={h} {...common} />
          </>
        );
        labelAt = {x, y};
        break;
      }
      case 'ellipse': {
        const cx = (p.x + q.x) / 2;
        const cy = (p.y + q.y) / 2;
        const rx = Math.abs(q.x - p.x) / 2;
        const ry = Math.abs(q.y - p.y) / 2;
        shape = (
          <>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...halo} />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common} />
          </>
        );
        labelAt = {x: cx - rx, y: cy - ry};
        break;
      }
      case 'pen': {
        const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt.x},${pt.y}`).join(' ');
        shape = (
          <>
            <path d={d} {...halo} />
            <path d={d} {...common} />
          </>
        );
        labelAt = pts.reduce((m, pt) => (pt.y < m.y ? pt : m), pts[0]);
        break;
      }
      case 'point': {
        const r = px(5);
        shape = (
          <>
            <circle cx={p.x} cy={p.y} r={r * 1.8} fill="none" stroke={INK.halo} strokeWidth={sw * 2} opacity={0.55} />
            <circle cx={p.x} cy={p.y} r={r * 1.8} fill="none" stroke={colour} strokeWidth={sw} />
            <circle cx={p.x} cy={p.y} r={r * 0.45} fill={colour} />
          </>
        );
        labelAt = {x: p.x + r * 2.2, y: p.y - r * 2.2};
        break;
      }
    }
    const lengthLabel =
      a.tool === 'line' && nat ? `${Math.round(Math.hypot((q.x - p.x), (q.y - p.y)))} px` : '';
    const text = [a.label, lengthLabel].filter(Boolean).join(' · ');
    return (
      <g
        key={a.id}
        onPointerDown={e => {
          if (isDraft || (tool !== 'pan' && canDraw)) return;
          e.stopPropagation();
          onSelect(a.id);
        }}
        style={{cursor: tool === 'pan' ? 'pointer' : undefined}}>
        {shape}
        {text && (
          <text
            x={labelAt.x}
            y={labelAt.y - px(7)}
            fontSize={px(13)}
            fontWeight={600}
            fill={colour}
            stroke={INK.halo}
            strokeWidth={px(3.5)}
            paintOrder="stroke"
            style={{fontFamily: 'var(--font-family-body)', userSelect: 'none'}}>
            {text}
          </text>
        )}
      </g>
    );
  };

  const renderAnswer = (t: Target) => {
    const r = t.region;
    const res = overlay?.results.find(x => x.target.id === t.id);
    const colour = res?.status === 'found' ? INK.found : res?.status === 'missed' ? INK.stray : INK.partial;
    const dash = `${px(7)} ${px(5)}`;
    const c = regionCentre(r);
    const shape =
      r.kind === 'circle' ? (
        <ellipse cx={r.cx * W} cy={r.cy * H} rx={r.r * W} ry={r.r * W} fill={colour} fillOpacity={0.08} stroke={colour} strokeWidth={px(2)} strokeDasharray={dash} />
      ) : (
        <rect x={r.x0 * W} y={r.y0 * H} width={(r.x1 - r.x0) * W} height={(r.y1 - r.y0) * H} fill={colour} fillOpacity={0.08} stroke={colour} strokeWidth={px(2)} strokeDasharray={dash} />
      );
    const top = r.kind === 'circle' ? (r.cy * H - r.r * W) : r.y0 * H;
    return (
      <g key={`ans-${t.id}`} pointerEvents="none">
        {shape}
        <text
          x={c.x * W}
          y={top - px(6)}
          textAnchor="middle"
          fontSize={px(12)}
          fontWeight={700}
          fill={colour}
          stroke={INK.halo}
          strokeWidth={px(3.5)}
          paintOrder="stroke"
          style={{fontFamily: 'var(--font-family-body)'}}>
          {t.label}
        </text>
      </g>
    );
  };

  const mine = annotations.filter(a => a.scanId === scan.id);
  const answers = overlay?.targets.filter(t => t.scanId === scan.id) ?? [];
  const cursorText = cursor && cursor.x >= 0 && cursor.x <= 1 && cursor.y >= 0 && cursor.y <= 1
    ? `x ${Math.round(cursor.x * W)}  y ${Math.round(cursor.y * H)}`
    : '';

  return (
    <Card padding={0} height="100%" variant={isActive ? 'default' : 'muted'} elevation={isActive ? 'low' : 'none'}>
      <VStack gap={0} height="100%">
        <HStack hAlign="between" vAlign="center" paddingInline={2} paddingBlock={1} gap={1}>
          <HStack gap={1} vAlign="center">
            <Badge variant={isActive ? 'cyan' : 'neutral'} label={scan.eye ?? '—'} />
            <Text type="label" weight="semibold" maxLines={1}>
              {scan.modality}
            </Text>
          </HStack>
          <Text type="supporting" maxLines={1} hasTabularNumbers>
            {scan.caption ?? ''}
          </Text>
        </HStack>
        <Divider />
        <svg
          ref={svgRef}
          role="img"
          aria-label={`${scan.modality} ${scan.eye ?? ''}${scan.caption ? ` — ${scan.caption}` : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setCursor(null)}
          style={{
            display: 'block',
            flex: 1,
            minHeight: 0,
            width: '100%',
            background: '#020507',
            touchAction: 'none',
            cursor: canDraw && tool !== 'pan' ? 'crosshair' : panRef.current ? 'grabbing' : 'grab',
          }}>
          <defs>{filter}</defs>
          {failed ? null : nat && (
            <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
              <image href={scan.src} width={W} height={H} filter={`url(#${filterId})`} data-bg="1" style={{imageRendering: view.s > 2 ? 'pixelated' : 'auto'}} />
              {showAnswers && answers.map(renderAnswer)}
              {mine.map(a => renderShape(a, INK[statusFor(a)]))}
              {draft && draft.scanId === scan.id && renderShape(draft, INK.draft, true)}
            </g>
          )}
        </svg>
        {failed && (
          <EmptyState
            isCompact
            title="Scan not found"
            description={`Couldn’t load ${scan.src}. Check the scans/ folder was uploaded.`}
            icon={<Icon icon={ImageOff} />}
          />
        )}
        <Divider />
        <HStack hAlign="between" paddingInline={2} paddingBlock={0.5}>
          <Text type="supporting" hasTabularNumbers>
            {nat ? `${nat.w}×${nat.h}` : 'Loading…'}
          </Text>
          <Text type="supporting" hasTabularNumbers>
            {cursorText}
          </Text>
          <Text type="supporting" hasTabularNumbers>
            {Math.round(view.s * 100)}%
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Workstation: toolbar + viewports + scan strip
// -----------------------------------------------------------------------------

export function ScanViewer({
  scans,
  focusScanIds,
  canDraw,
  annotations,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onUndo,
  onClear,
  overlay,
}: Props) {
  const [tool, setTool] = useState<ViewerTool>('arrow');
  const [adjust, setAdjust] = useState<Adjust>(DEFAULT_ADJUST);
  const [showAnswers, setShowAnswers] = useState(true);
  const [fitSignal, setFitSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState({n: 0, factor: 1});
  const initial = focusScanIds.length ? focusScanIds : scans.slice(0, 1).map(s => s.id);
  const [open, setOpen] = useState<string[]>(initial);
  const [active, setActive] = useState(0);
  const [layout, setLayout] = useState(String(Math.min(3, Math.max(1, initial.length))));
  const focusKey = focusScanIds.join('|');

  // A new question re-opens the scans it is about.
  useEffect(() => {
    const ids = focusScanIds.length ? focusScanIds : scans.slice(0, 1).map(s => s.id);
    setOpen(ids);
    setActive(0);
    setLayout(String(Math.min(3, Math.max(1, ids.length))));
    setTool(focusScanIds.length ? 'arrow' : 'pan');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && canDraw) {
        onDelete(selectedId);
        return;
      }
      const hit = TOOLS.find(x => x.key.toLowerCase() === e.key.toLowerCase());
      if (hit && (canDraw || hit.tool === 'pan')) setTool(hit.tool);
      if (e.key.toLowerCase() === 'f') setFitSignal(n => n + 1);
      if (e.key === '+' || e.key === '=') setZoomSignal(z => ({n: z.n + 1, factor: 1.25}));
      if (e.key === '-') setZoomSignal(z => ({n: z.n + 1, factor: 0.8}));
      if (e.key.toLowerCase() === 'i') setAdjust(a => ({...a, invert: !a.invert}));
      if (e.key.toLowerCase() === 'g') setAdjust(a => ({...a, redFree: !a.redFree}));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canDraw, onDelete, onUndo, selectedId]);

  const n = Number(layout);
  const shown = open.slice(0, n);
  while (shown.length < n && scans.length > shown.length) {
    const next = scans.find(s => !shown.includes(s.id));
    if (!next) break;
    shown.push(next.id);
  }

  const openInActive = (id: string) => {
    setOpen(prev => {
      const next = [...prev];
      while (next.length < n) next.push(shown[next.length] ?? id);
      const existing = next.indexOf(id);
      if (existing >= 0 && existing < n) {
        setActive(existing);
        return next;
      }
      next[Math.min(active, n - 1)] = id;
      return next;
    });
  };

  if (scans.length === 0) {
    return (
      <Card padding={6} height="100%" variant="muted">
        <EmptyState
          title="No imaging acquired yet"
          description="Work through the history first — scans unlock as the examination progresses."
          icon={<Icon icon={ScanSearch} />}
        />
      </Card>
    );
  }

  const scanById = (id: string) => scans.find(s => s.id === id);
  const adjusted = adjust.brightness !== 1 || adjust.contrast !== 1;

  return (
    <VStack gap={2} height="100%">
      <Card padding={1}>
        <Toolbar
          label="Image tools"
          size="sm"
          startContent={
            <>
              {TOOLS.map(t => (
                <IconButton
                  key={t.tool}
                  label={`${t.label} (${t.key})`}
                  tooltip={`${t.label}  ·  ${t.key}`}
                  size="sm"
                  variant={tool === t.tool ? 'primary' : 'ghost'}
                  isDisabled={!canDraw && t.tool !== 'pan'}
                  icon={<Icon icon={t.icon} />}
                  onClick={() => setTool(t.tool)}
                />
              ))}
              <Divider orientation="vertical" />
              <IconButton label="Undo (Ctrl+Z)" tooltip="Undo · Ctrl+Z" size="sm" variant="ghost" isDisabled={!canDraw || annotations.length === 0} icon={<Icon icon={Undo2} />} onClick={onUndo} />
              <IconButton
                label="Delete selected (Del)"
                tooltip="Delete selected · Del"
                size="sm"
                variant="ghost"
                isDisabled={!canDraw || !selectedId}
                icon={<Icon icon={Trash2} />}
                onClick={() => selectedId && onDelete(selectedId)}
              />
              <IconButton label="Clear all marks" tooltip="Clear all" size="sm" variant="ghost" isDisabled={!canDraw || annotations.length === 0} icon={<Icon icon={Minus} />} onClick={onClear} />
            </>
          }
          endContent={
            <>
              <IconButton label="Zoom out (−)" tooltip="Zoom out · −" size="sm" variant="ghost" icon={<Icon icon={Minus} />} onClick={() => setZoomSignal(z => ({n: z.n + 1, factor: 0.8}))} />
              <IconButton label="Zoom in (+)" tooltip="Zoom in · +" size="sm" variant="ghost" icon={<Icon icon={Plus} />} onClick={() => setZoomSignal(z => ({n: z.n + 1, factor: 1.25}))} />
              <IconButton label="Fit to window (F)" tooltip="Fit · F" size="sm" variant="ghost" icon={<Icon icon={Maximize} />} onClick={() => setFitSignal(x => x + 1)} />
              <Divider orientation="vertical" />
              <IconButton
                label="Invert (I)"
                tooltip="Invert · I"
                size="sm"
                variant={adjust.invert ? 'primary' : 'ghost'}
                icon={<Icon icon={Contrast} />}
                onClick={() => setAdjust(a => ({...a, invert: !a.invert}))}
              />
              <IconButton
                label="Red-free (G)"
                tooltip="Red-free (green channel) · G"
                size="sm"
                variant={adjust.redFree ? 'primary' : 'ghost'}
                icon={<Icon icon={SunMedium} />}
                onClick={() => setAdjust(a => ({...a, redFree: !a.redFree}))}
              />
              <Popover
                label="Window / level"
                placement="below"
                alignment="end"
                width={260}
                content={
                  <VStack gap={3}>
                    <Text type="label" weight="semibold">
                      Window / level
                    </Text>
                    <Slider label="Brightness" min={0.4} max={2} step={0.05} value={adjust.brightness} valueDisplay="text" formatValue={v => `${Math.round(v * 100)}%`} onChange={(v: number) => setAdjust(a => ({...a, brightness: v}))} />
                    <Slider label="Contrast" min={0.4} max={2.5} step={0.05} value={adjust.contrast} valueDisplay="text" formatValue={v => `${Math.round(v * 100)}%`} onChange={(v: number) => setAdjust(a => ({...a, contrast: v}))} />
                    <IconButton label="Reset adjustments" tooltip="Reset" size="sm" variant="secondary" icon={<Icon icon={Undo2} />} onClick={() => setAdjust(DEFAULT_ADJUST)} />
                  </VStack>
                }>
                <IconButton label="Window / level" tooltip="Brightness & contrast" size="sm" variant={adjusted ? 'primary' : 'ghost'} icon={<Icon icon={SlidersHorizontal} />} />
              </Popover>
              {overlay && (
                <IconButton
                  label={showAnswers ? 'Hide answer key' : 'Show answer key'}
                  tooltip={showAnswers ? 'Hide answer key' : 'Show answer key'}
                  size="sm"
                  variant={showAnswers ? 'primary' : 'ghost'}
                  icon={<Icon icon={showAnswers ? Eye : EyeOff} />}
                  onClick={() => setShowAnswers(s => !s)}
                />
              )}
              <Divider orientation="vertical" />
              <SegmentedControl label="Viewport layout" size="sm" value={layout} onChange={setLayout}>
                <SegmentedControlItem label="1" value="1" />
                <SegmentedControlItem label="2" value="2" />
                <SegmentedControlItem label="3" value="3" />
              </SegmentedControl>
            </>
          }
        />
      </Card>

      <Grid columns={shown.length} gap={2} height="100%" minHeight={0}>
        {shown.map((id, i) => {
          const s = scanById(id);
          if (!s) return null;
          return (
            <Viewport
              key={`${id}-${i}`}
              scan={s}
              tool={tool}
              canDraw={canDraw && focusScanIds.includes(id)}
              adjust={adjust}
              annotations={annotations}
              selectedId={selectedId}
              onSelect={onSelect}
              onAdd={a => {
                onAdd(a);
                onSelect(a.id);
              }}
              overlay={overlay}
              showAnswers={showAnswers}
              fitSignal={fitSignal}
              zoomSignal={zoomSignal}
              isActive={i === active}
              onActivate={() => setActive(i)}
            />
          );
        })}
      </Grid>

      {scans.length > 1 && (
        <Card padding={1}>
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text type="supporting">Series</Text>
            {scans.map(s => (
              <Thumbnail
                key={s.id}
                src={s.src}
                alt={`${s.modality} ${s.eye ?? ''}`}
                label={`${s.modality} · ${s.eye ?? ''}${focusScanIds.includes(s.id) ? ' (this question)' : ''}`}
                onClick={() => openInActive(s.id)}
              />
            ))}
          </HStack>
        </Card>
      )}
    </VStack>
  );
}
