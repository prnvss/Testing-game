import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import type {Eye} from '../patient';

/**
 * SVG instruments for the simulators. Colours come from theme tokens where a token fits; the few anatomical
 * colours (iris, skin, retinal reflex) are scene colours with no token equivalent.
 */
const SCENE = {
  skin: 'var(--cl-skin, #C99A7A)',
  iris: 'var(--cl-iris, #5B7F9C)',
  reflex: 'var(--cl-reflex, #F2A33A)',
  fundus: 'var(--cl-fundus, #5A1608)',
  red: 'var(--cl-maddox, #FF3B30)',
};

// -----------------------------------------------------------------------------
// Patient's eyes (examiner's view)
// -----------------------------------------------------------------------------

export interface EyesViewProps {
  /** Eye position per eye in Δ; + = turned nasally (in), − = turned out. */
  pos: Record<Eye, number>;
  covered?: Eye | null;
  prism?: {eye: Eye; base: 'BI' | 'BO'; amount: number} | null;
  /** Show a flipper / lens in front of both eyes. */
  lensLabel?: string;
  caption?: ReactNode;
  glasses?: boolean;
}

export function EyesView({pos, covered, prism, lensLabel, glasses}: EyesViewProps) {
  // Viewer sees the patient's right eye (OD) on the left.
  const cx: Record<Eye, number> = {od: 120, os: 280};
  const px = (eye: Eye) => Math.max(-30, Math.min(30, pos[eye] * 1.6)) * (eye === 'od' ? 1 : -1);
  return (
    <svg viewBox="0 0 400 210" width="100%" role="img" aria-label="Patient's eyes" style={{display: 'block', maxHeight: 260}}>
      <rect x={0} y={0} width={400} height={210} rx={18} fill="var(--color-background-muted)" />
      <ellipse cx={200} cy={150} rx={190} ry={170} fill={SCENE.skin} opacity={0.85} />
      {/* brows + nose */}
      <path d="M70 70 Q120 48 170 66" stroke="#3b2a20" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d="M230 66 Q280 48 330 70" stroke="#3b2a20" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d="M200 105 L188 170 Q200 180 214 170" stroke="#00000033" strokeWidth={4} fill="none" />
      {(['od', 'os'] as const).map(eye => (
        <g key={eye}>
          <clipPath id={`eye-${eye}`}>
            <ellipse cx={cx[eye]} cy={115} rx={52} ry={27} />
          </clipPath>
          <ellipse cx={cx[eye]} cy={115} rx={52} ry={27} fill="#F7F4EF" stroke="#00000055" />
          <g clipPath={`url(#eye-${eye})`}>
            <g style={{transform: `translateX(${px(eye)}px)`, transition: 'transform 260ms cubic-bezier(.3,.7,.3,1)'}}>
              <circle cx={cx[eye]} cy={115} r={21} fill={SCENE.iris} />
              <circle cx={cx[eye]} cy={115} r={9} fill="#0b0b0b" />
              <circle cx={cx[eye] - 6} cy={108} r={3} fill="#ffffffcc" />
            </g>
          </g>
          <text x={cx[eye]} y={165} textAnchor="middle" fontSize={13} fill="#1d1d1d" opacity={0.75} style={{fontFamily: 'var(--font-family-body)'}}>
            {eye === 'od' ? 'R (OD)' : 'L (OS)'}
          </text>
        </g>
      ))}
      {glasses && (
        <g fill="none" stroke="#202020" strokeWidth={5} opacity={0.8}>
          <rect x={58} y={80} width={124} height={72} rx={20} />
          <rect x={218} y={80} width={124} height={72} rx={20} />
          <path d="M182 108 Q200 96 218 108" />
        </g>
      )}
      {prism && (
        <g>
          <rect x={cx[prism.eye] - 58} y={80} width={116} height={70} rx={4} fill="#9fd3ff33" stroke="#9fd3ff" />
          {(() => {
            // Base towards the nose = BI. OD's nose side is to the viewer's right.
            const nasalRight = prism.eye === 'od';
            const baseRight = prism.base === 'BI' ? nasalRight : !nasalRight;
            const x0 = cx[prism.eye] + (baseRight ? 58 : -58);
            return <rect x={baseRight ? x0 - 10 : x0} y={80} width={10} height={70} fill="#9fd3ff88" />;
          })()}
          <text x={cx[prism.eye]} y={76} textAnchor="middle" fontSize={13} fill="var(--color-text-primary)" style={{fontFamily: 'var(--font-family-body)'}}>
            {prism.amount}Δ {prism.base}
          </text>
        </g>
      )}
      {covered && (
        <g>
          <rect x={cx[covered] - 62} y={70} width={124} height={92} rx={14} fill="#15161c" stroke="#ffffff22" />
          <rect x={cx[covered] - 6} y={160} width={12} height={50} fill="#15161c" />
          <text x={cx[covered]} y={121} textAnchor="middle" fontSize={13} fill="#ffffffaa" style={{fontFamily: 'var(--font-family-body)'}}>
            occluder
          </text>
        </g>
      )}
      {lensLabel && (
        <text x={200} y={30} textAnchor="middle" fontSize={15} fontWeight={600} fill="var(--color-text-primary)" style={{fontFamily: 'var(--font-family-body)'}}>
          {lensLabel}
        </text>
      )}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Side view ruler (target distance from the spectacle plane)
// -----------------------------------------------------------------------------

export function DistanceRuler({cm, max = 50, label, marks = []}: {cm: number; max?: number; label: string; marks?: {cm: number; text: string}[]}) {
  const W = 520;
  const x0 = 60;
  const x = (c: number) => x0 + (c / max) * (W - x0 - 20);
  return (
    <svg viewBox={`0 0 ${W} 120`} width="100%" role="img" aria-label={`${label} at ${cm.toFixed(1)} cm`} style={{display: 'block'}}>
      <rect x={0} y={0} width={W} height={120} rx={14} fill="var(--color-background-muted)" />
      {/* head profile */}
      <path d="M8 20 Q50 10 52 50 L58 62 L50 70 Q52 100 20 112" fill="none" stroke="var(--color-text-secondary)" strokeWidth={3} />
      <circle cx={44} cy={52} r={3} fill="var(--color-text-primary)" />
      <line x1={x0} x2={W - 20} y1={92} y2={92} stroke="var(--color-text-secondary)" />
      {Array.from({length: max + 1}, (_, i) => i).map(i => (
        <g key={i}>
          <line x1={x(i)} x2={x(i)} y1={92} y2={i % 5 === 0 ? 80 : 86} stroke="var(--color-text-secondary)" />
          {i % 5 === 0 && (
            <text x={x(i)} y={108} fontSize={10} textAnchor="middle" fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
              {i}
            </text>
          )}
        </g>
      ))}
      {marks.map(m => (
        <g key={m.text}>
          <line x1={x(m.cm)} x2={x(m.cm)} y1={30} y2={92} stroke="var(--color-accent)" strokeDasharray="3 3" />
          <text x={x(m.cm)} y={26} fontSize={10} textAnchor="middle" fill="var(--color-text-accent)" style={{fontFamily: 'var(--font-family-body)'}}>
            {m.text}
          </text>
        </g>
      ))}
      <g style={{transform: `translateX(${x(cm) - x0}px)`}}>
        <line x1={x0} x2={x0} y1={40} y2={92} stroke="var(--color-text-primary)" strokeWidth={3} />
        <rect x={x0 - 9} y={36} width={18} height={22} rx={2} fill="var(--color-text-primary)" />
        <text x={x0} y={52} fontSize={11} textAnchor="middle" fontWeight={700} fill="var(--color-background-body)" style={{fontFamily: 'var(--font-family-body)'}}>
          E
        </text>
      </g>
      <line x1={44} x2={x(cm)} y1={52} y2={48} stroke="var(--color-text-secondary)" strokeDasharray="2 4" />
      <text x={W - 20} y={22} textAnchor="end" fontSize={13} fontWeight={600} fill="var(--color-text-primary)" style={{fontFamily: 'var(--font-family-body)'}}>
        {label}: {cm.toFixed(1)} cm
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Retinoscope reflex
// -----------------------------------------------------------------------------

/** `error` = dioptric error relative to neutrality: + → with motion, − → against, ~0 → neutral. */
export function ReflexView({error, sweeping, lensLabel}: {error: number; sweeping: boolean; lensLabel?: string}) {
  const [phase, setPhase] = useState(0);
  const raf = useRef<number | null>(null);
  const clip = useId();
  useEffect(() => {
    if (!sweeping) return;
    const t0 = performance.now();
    const loop = (t: number) => {
      setPhase(Math.sin(((t - t0) / 1000) * Math.PI * 1.3));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      setPhase(0);
    };
  }, [sweeping]);
  const mag = Math.abs(error);
  const neutral = mag < 0.13;
  const dir = error >= 0 ? 1 : -1;
  // Narrower, dimmer, slower bands further from neutral.
  const width = neutral ? 120 : Math.max(16, 70 - mag * 30);
  const bright = neutral ? 0.95 : Math.max(0.35, 0.9 - mag * 0.35);
  const travel = neutral ? 0 : Math.min(55, 25 + 20 / (mag + 0.2));
  const bandX = 150 + dir * phase * travel;
  const scopeX = 150 + phase * 90;
  return (
    <svg viewBox="0 0 300 200" width="100%" role="img" aria-label="Retinoscopic reflex" style={{display: 'block', maxHeight: 260}}>
      <rect x={0} y={0} width={300} height={200} rx={16} fill="#050506" />
      <clipPath id={clip}>
        <circle cx={150} cy={100} r={60} />
      </clipPath>
      <circle cx={150} cy={100} r={60} fill={SCENE.fundus} />
      <g clipPath={`url(#${clip})`}>
        {sweeping || neutral ? (
          neutral ? (
            <circle cx={150} cy={100} r={60} fill={SCENE.reflex} opacity={sweeping ? (Math.abs(phase) > 0.85 ? 0.25 : bright) : 0.6} />
          ) : (
            <rect x={bandX - width / 2} y={30} width={width} height={140} fill={SCENE.reflex} opacity={bright} />
          )
        ) : (
          <rect x={150 - width / 2} y={30} width={width} height={140} fill={SCENE.reflex} opacity={bright * 0.7} />
        )}
      </g>
      <circle cx={150} cy={100} r={60} fill="none" stroke="#ffffff22" />
      {/* the intercept (streak on the face) */}
      <rect x={scopeX - 4} y={10} width={8} height={180} fill="#ffffff" opacity={0.08} />
      {lensLabel && (
        <text x={150} y={190} textAnchor="middle" fontSize={13} fill="#ffffffcc" style={{fontFamily: 'var(--font-family-body)'}}>
          {lensLabel}
        </text>
      )}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// What the patient sees
// -----------------------------------------------------------------------------

export interface SeenTarget {
  text: string;
  /** Second image offset in px (0,0 = fused). */
  double?: {dx: number; dy: number} | null;
  blur?: number;
  /** Maddox rod view: spot + red streak offset (px). */
  maddox?: {dx: number} | null;
  column?: boolean;
  dim?: boolean;
}

export function PatientView({t, title = 'What the patient sees'}: {t: SeenTarget; title?: string}) {
  const f = useId();
  const letters = t.column ? t.text.split('') : [t.text];
  const block = (dx: number, dy: number, op: number) =>
    letters.map((ch, i) => (
      <text
        key={`${dx}-${dy}-${i}`}
        x={150 + dx}
        y={(t.column ? 70 + i * 34 - (letters.length - 1) * 4 : 112) + dy}
        textAnchor="middle"
        fontSize={t.column ? 28 : 46}
        fontWeight={700}
        fill={t.dim ? '#d7d7d7' : '#111'}
        opacity={op}
        style={{fontFamily: 'Arial, sans-serif'}}>
        {ch}
      </text>
    ));
  return (
    <svg viewBox="0 0 300 200" width="100%" role="img" aria-label={title} style={{display: 'block', maxHeight: 260}}>
      <defs>
        <filter id={f}>
          <feGaussianBlur stdDeviation={t.blur ?? 0} />
        </filter>
      </defs>
      {t.maddox ? (
        <g>
          <rect x={0} y={0} width={300} height={200} rx={16} fill="#07070a" />
          <circle cx={150} cy={100} r={7} fill="#fffbe8" />
          <circle cx={150} cy={100} r={14} fill="#fffbe844" />
          <rect x={150 + t.maddox.dx - 2.5} y={0} width={5} height={200} fill={SCENE.red} opacity={0.9} />
        </g>
      ) : (
        <g>
          <rect x={0} y={0} width={300} height={200} rx={16} fill={t.dim ? '#2a2a2e' : '#f4f2ec'} />
          <g filter={`url(#${f})`}>
            {block(0, 0, 1)}
            {t.double && block(t.double.dx, t.double.dy, 0.75)}
          </g>
        </g>
      )}
      <text x={10} y={192} fontSize={11} fill={t.maddox || t.dim ? '#ffffff88' : '#00000088'} style={{fontFamily: 'var(--font-family-body)'}}>
        {title}
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Phoropter (refractor head) read-out
// -----------------------------------------------------------------------------

export interface PhoropterState {
  sph: Record<Eye, number>;
  /** Signed horizontal prism per eye: + = BO, − = BI. */
  h: Record<Eye, number>;
  /** Signed vertical prism per eye: + = BU, − = BD. */
  v: Record<Eye, number>;
  aux: Record<Eye, string>;
  risley: Record<Eye, boolean>;
}

export function PhoropterView({ph, caption}: {ph: PhoropterState; caption?: string}) {
  const cx: Record<Eye, number> = {od: 110, os: 290};
  const prismText = (eye: Eye) => {
    const parts: string[] = [];
    if (ph.h[eye]) parts.push(`${Math.abs(ph.h[eye]).toFixed(0)}Δ ${ph.h[eye] > 0 ? 'BO' : 'BI'}`);
    if (ph.v[eye]) parts.push(`${Math.abs(ph.v[eye]).toFixed(0)}Δ ${ph.v[eye] > 0 ? 'BU' : 'BD'}`);
    return parts.join(' · ') || '0Δ';
  };
  return (
    <svg viewBox="0 0 400 220" width="100%" role="img" aria-label="Phoropter settings" style={{display: 'block', maxHeight: 280}}>
      <rect x={0} y={0} width={400} height={220} rx={18} fill="var(--color-background-muted)" />
      <path d="M40 60 Q200 10 360 60 L370 170 Q200 205 30 170 Z" fill="#2a2c34" stroke="#ffffff1a" />
      <rect x={185} y={45} width={30} height={60} rx={6} fill="#1b1c22" />
      {(['od', 'os'] as const).map(eye => (
        <g key={eye}>
          <circle cx={cx[eye]} cy={115} r={62} fill="#1b1c22" stroke="#ffffff22" strokeWidth={2} />
          <circle cx={cx[eye]} cy={115} r={26} fill={ph.aux[eye] === 'OC' ? '#000' : '#9fd3ff22'} stroke="#9fd3ff66" />
          {ph.risley[eye] && <circle cx={cx[eye]} cy={115} r={36} fill="none" stroke="#F6B65E" strokeWidth={4} strokeDasharray="4 3" />}
          <text x={cx[eye]} y={66} textAnchor="middle" fontSize={11} fill="#ffffff99" style={{fontFamily: 'var(--font-family-body)'}}>
            {eye === 'od' ? 'OD (pt’s right)' : 'OS (pt’s left)'}
          </text>
          <text x={cx[eye]} y={120} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff" style={{fontFamily: 'var(--font-family-body)'}}>
            {ph.sph[eye] === 0 ? '0.00' : `${ph.sph[eye] > 0 ? '+' : '−'}${Math.abs(ph.sph[eye]).toFixed(2)}`}
          </text>
          <text x={cx[eye]} y={165} textAnchor="middle" fontSize={11} fill="#F6B65E" style={{fontFamily: 'var(--font-family-body)'}}>
            {ph.risley[eye] ? prismText(eye) : 'Risley off'}
          </text>
          <text x={cx[eye]} y={190} textAnchor="middle" fontSize={11} fill="#ffffffaa" style={{fontFamily: 'var(--font-family-body)'}}>
            Aux: {ph.aux[eye]}
          </text>
        </g>
      ))}
      {caption && (
        <text x={200} y={212} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)" style={{fontFamily: 'var(--font-family-body)'}}>
          {caption}
        </text>
      )}
    </svg>
  );
}
