import {useEffect, useRef} from 'react';
import {rng} from '../rng';
import {capColor} from './color';
import {CITY_P1, CITY_P2, cityColours, HRR, ISHIHARA, type Shape} from './data';

/**
 * Pseudoisochromatic plates drawn on a canvas from coloured dots. They are rendered as a colour-normal observer
 * sees them — the simulated patient's answers come from their defect, not from the picture.
 */

const SIZE = 360;
const R = 170;

interface Dot {
  x: number;
  y: number;
  r: number;
}

const dotCache = new Map<number, Dot[]>();
function dots(seed: number): Dot[] {
  const hit = dotCache.get(seed);
  if (hit) return hit;
  const r = rng(seed);
  const out: Dot[] = [];
  const cell = 10;
  const grid = new Map<string, Dot[]>();
  const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (let tries = 0; tries < 9000 && out.length < 1400; tries++) {
    const rad = r.range(3, 8.5);
    const a = r.range(0, Math.PI * 2);
    const d = Math.sqrt(r.next()) * (R - rad);
    const x = SIZE / 2 + Math.cos(a) * d;
    const y = SIZE / 2 + Math.sin(a) * d;
    let ok = true;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let i = -2; i <= 2 && ok; i++)
      for (let j = -2; j <= 2 && ok; j++)
        for (const o of grid.get(`${cx + i},${cy + j}`) ?? []) if (Math.hypot(o.x - x, o.y - y) < o.r + rad + 1.2) ok = false;
    if (!ok) continue;
    const dot = {x, y, r: rad};
    out.push(dot);
    const k = key(x, y);
    grid.set(k, [...(grid.get(k) ?? []), dot]);
  }
  dotCache.set(seed, out);
  return out;
}

type Mask = (ctx: CanvasRenderingContext2D) => void;

function maskData(draw: Mask) {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  draw(ctx);
  return ctx.getImageData(0, 0, SIZE, SIZE).data;
}

function paint(canvas: HTMLCanvasElement, seed: number, layers: {mask?: Mask; colors: string[]}[], bg: string[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#f3efe4';
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, R + 8, 0, Math.PI * 2);
  ctx.fill();
  const masks = layers.map(l => (l.mask ? maskData(l.mask) : null));
  const r = rng(seed ^ 0x5bd1e995);
  for (const d of dots(seed % 7)) {
    const idx = (Math.round(d.y) * SIZE + Math.round(d.x)) * 4 + 3;
    let colors = bg;
    masks.forEach((m, i) => {
      if (m && m[idx] > 100) colors = layers[i].colors;
    });
    ctx.fillStyle = colors[Math.floor(r.next() * colors.length)];
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function useCanvas(draw: (c: HTMLCanvasElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) draw(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const canvasStyle = {width: '100%', maxWidth: SIZE, aspectRatio: '1 / 1', display: 'block', margin: '0 auto'} as const;

// -----------------------------------------------------------------------------
// Ishihara
// -----------------------------------------------------------------------------

const ORANGE = ['#e8823a', '#d96a2b', '#f0a04b', '#c9572c', '#eb9a5c', '#de7b45'];
const GREEN = ['#8db36a', '#a4c27a', '#7aa35a', '#b9c98a', '#9fb06a', '#88a866'];
const PURPLE = ['#c0587e', '#b44d73', '#d0688f', '#a94a6c'];
const GREY = ['#a3a19c', '#b3b0aa', '#97958f', '#aeaaa2'];

const textMask = (text: string, size = 190): Mask => ctx => {
  ctx.font = `bold ${size}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, SIZE / 2, SIZE / 2 + 8);
};

export function IshiharaPlate({n}: {n: number}) {
  const pl = ISHIHARA[n - 1];
  const ref = useCanvas(
    c => {
      if (pl.kind === 'Hidden') return paint(c, n * 31, [], GREEN.concat(ORANGE.slice(0, 1)));
      if (pl.kind === 'Diagnostic') return paint(c, n * 31, [{mask: textMask(pl.normal, 170), colors: PURPLE}], GREY);
      return paint(c, n * 31, [{mask: textMask(pl.normal, pl.normal.length > 1 ? 170 : 220), colors: ORANGE}], GREEN);
    },
    [n],
  );
  return <canvas ref={ref} style={canvasStyle} aria-label={`Ishihara plate ${n}`} />;
}

// -----------------------------------------------------------------------------
// HRR
// -----------------------------------------------------------------------------

const QUAD_XY = [
  [0.32, 0.32],
  [0.68, 0.32],
  [0.32, 0.68],
  [0.68, 0.68],
];

const shapeMask = (shape: Shape, quad: number): Mask => ctx => {
  const [fx, fy] = QUAD_XY[quad];
  const cx = fx * SIZE;
  const cy = fy * SIZE;
  const s = 50;
  ctx.lineWidth = 17;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (shape === 'O') ctx.arc(cx, cy, s, 0, Math.PI * 2);
  else if (shape === 'X') {
    ctx.moveTo(cx - s, cy - s);
    ctx.lineTo(cx + s, cy + s);
    ctx.moveTo(cx + s, cy - s);
    ctx.lineTo(cx - s, cy + s);
  } else {
    const rot = {'▲': -90, '▼': 90, '◀': 180, '▶': 0}[shape] as number;
    for (let i = 0; i <= 3; i++) {
      const a = ((rot + i * 120) * Math.PI) / 180;
      const x = cx + Math.cos(a) * s;
      const y = cy + Math.sin(a) * s;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.stroke();
};

const HRR_COLORS: Record<string, string[]> = {
  demo: ['#2b2b2b', '#3a3a3a', '#202020'],
  BY: ['#8fa3c9', '#9aaed0', '#879bc2'],
  RG: ['#b88a96', '#bf8f9c', '#ad8590'],
  P: ['#c48a8f', '#ba8189', '#cc9399'],
  D: ['#8fb39a', '#86aa92', '#98bba2'],
  T: ['#7f97cf', '#8aa0d6', '#7690c7'],
  Tt: ['#c9b47a', '#d0bb82', '#c2ad72'],
};
const HRR_BG = ['#a9a9a6', '#b5b4b0', '#9d9d9a', '#bdbbb6', '#a3a29f'];

export function HrrPlate({n}: {n: number}) {
  const pl = HRR[n - 1];
  const ref = useCanvas(
    c => {
      const strength = pl.group === 'strong' ? 1 : pl.group === 'medium' ? 0.7 : 0.45;
      const tone = (cols: string[]) => (pl.section === 'Demonstration' ? cols : cols.map(col => mix(col, '#acaca8', 1 - strength)));
      paint(
        c,
        n * 17 + 3,
        pl.syms.map(s => ({mask: shapeMask(s.shape, s.quad), colors: tone(HRR_COLORS[s.col])})),
        HRR_BG,
      );
    },
    [n],
  );
  return <canvas ref={ref} style={canvasStyle} aria-label={`HRR plate ${n}`} />;
}

function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join('')}`;
}

// -----------------------------------------------------------------------------
// City University
// -----------------------------------------------------------------------------

const SPOT_COLOR = {all: '#8a8478', rg: '#a8b48e', tritan: '#a9b3c6'};

export function CityPage({page}: {page: number | 'D'}) {
  if (page === 'D' || page >= 5) {
    const cols =
      page === 'D'
        ? {centre: '#c07a3a', T: '#5c8fd1', B: '#c07a3a', L: '#7aa35a', R: '#b0569c'}
        : (() => {
            const c = cityColours(page);
            const key = CITY_P2.find(pg => pg.page === page)!.key;
            const out: Record<string, string> = {centre: capColor(c.centre, false)};
            (['N', 'P', 'D', 'T'] as const).forEach(k => (out[key[k]] = capColor(c[k], false)));
            return out;
          })();
    const pos: Record<string, [number, number]> = {centre: [150, 150], T: [150, 55], B: [150, 245], L: [55, 150], R: [245, 150]};
    return (
      <svg viewBox="0 0 300 300" width="100%" style={{maxWidth: SIZE, display: 'block', margin: '0 auto'}} role="img" aria-label={`City University page ${page}`}>
        <rect x={0} y={0} width={300} height={300} rx={16} fill="#111" />
        {Object.entries(pos).map(([k, [x, y]]) => (
          <g key={k}>
            <circle cx={x} cy={y} r={k === 'centre' ? 36 : 30} fill={cols[k]} />
            {k !== 'centre' && (
              <text x={x} y={y + (k === 'B' ? 50 : k === 'T' ? -38 : 5)} dx={k === 'L' ? -48 : k === 'R' ? 48 : 0} textAnchor="middle" fontSize={13} fill="#ffffff66">
                {k}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  }
  const pg = CITY_P1[page - 1];
  return (
    <svg viewBox="0 0 300 330" width="100%" style={{maxWidth: SIZE, display: 'block', margin: '0 auto'}} role="img" aria-label={`City University page ${page}`}>
      <rect x={0} y={0} width={300} height={330} rx={16} fill="#e9e5dc" />
      {pg.panels.map((spots, pi) =>
        Array.from({length: 6}, (_, i) => {
          const s = spots.find(sp => sp.pos === i);
          const x = 105 + (i % 2) * 90;
          const y = 40 + pi * 160 + Math.floor(i / 2) * 45;
          return <circle key={`${pi}-${i}`} cx={x} cy={y} r={17} fill={s ? SPOT_COLOR[s.kind] : '#b9b4a9'} />;
        }),
      )}
      <line x1={20} x2={280} y1={165} y2={165} stroke="#00000022" />
    </svg>
  );
}
