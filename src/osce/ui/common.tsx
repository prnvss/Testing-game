import {useEffect, useRef, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Icon} from '@astryxdesign/core/Icon';
import {Item} from '@astryxdesign/core/Item';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {List} from '@astryxdesign/core/List';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {MessageCircle, User, Stethoscope, type LucideIcon} from 'lucide-react';

// -----------------------------------------------------------------------------
// Conversation log + delayed patient responses
// -----------------------------------------------------------------------------

export interface Line {
  who: 'patient' | 'you' | 'note';
  text: string;
  t: number;
}

export interface Pending {
  at: number;
  say?: string;
  /** Shallow patch merged into the sim state when the response fires. */
  set?: Record<string, unknown>;
  /** Sim field set to the time the response fires. */
  stamp?: string;
  /** Cancels when the sim's `epoch` no longer matches (state changed before the patient answered). */
  epoch?: number;
}

export interface Talkative {
  log: Line[];
  pending: Pending[];
  epoch: number;
}

export const now = () => performance.now();

export const talk = <S extends Talkative>(s: S, who: Line['who'], text: string): S => ({...s, log: [...s.log, {who, text, t: now()}]});

/** Queue a patient reply `delay` ms from now; it is dropped if the sim's epoch changes first (when `bound`). */
export const later = <S extends Talkative>(s: S, delay: number, p: Omit<Pending, 'at' | 'epoch'>, bound = true): S => ({
  ...s,
  pending: [...s.pending, {...p, at: now() + delay, epoch: bound ? s.epoch : undefined}],
});

export const initTalk = (): Talkative => ({log: [], pending: [], epoch: 0});

/** Fires due pending responses. */
export function usePending<S extends Talkative>(sim: S, setSim: (fn: (s: S) => S) => void) {
  const has = sim.pending.length > 0;
  useEffect(() => {
    if (!has) return;
    const id = window.setInterval(() => {
      setSim(s => {
        const t = now();
        const due = s.pending.filter(p => p.at <= t);
        if (!due.length) return s;
        let next: S = {...s, pending: s.pending.filter(p => p.at > t)};
        for (const p of due) {
          if (p.epoch !== undefined && p.epoch !== s.epoch) continue;
          if (p.set) next = {...next, ...p.set};
          if (p.stamp) next = {...next, [p.stamp]: t};
          if (p.say) next = talk(next, 'patient', p.say);
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [has, setSim]);
}

const WHO: Record<Line['who'], {icon: LucideIcon; label: string}> = {
  patient: {icon: User, label: 'Patient'},
  you: {icon: MessageCircle, label: 'You'},
  note: {icon: Stethoscope, label: 'Observation'},
};

export function ConversationLog({log, empty = 'The patient’s responses will appear here.'}: {log: Line[]; empty?: string}) {
  const shown = log.slice(-8).reverse();
  return (
    <Card variant="muted" padding={2}>
      <VStack gap={1}>
        <Text type="label" weight="semibold">
          Patient &amp; observations
        </Text>
        {shown.length === 0 ? (
          <Text type="supporting">{empty}</Text>
        ) : (
          <List density="compact">
            {shown.map((l, i) => (
              <Item
                key={`${l.t}-${i}`}
                density="compact"
                startContent={<Icon icon={WHO[l.who].icon} size="sm" color={l.who === 'patient' ? 'accent' : 'secondary'} label={WHO[l.who].label} />}
                label={
                  <Text weight={i === 0 ? 'semibold' : 'normal'} color={i === 0 ? 'primary' : 'secondary'}>
                    {l.who === 'patient' ? `“${l.text}”` : l.text}
                  </Text>
                }
              />
            ))}
          </List>
        )}
      </VStack>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Press-and-hold control (moves targets, rotates Risleys)
// -----------------------------------------------------------------------------

export function HoldButton({label, icon, onTick, onEnd, isDisabled, variant = 'secondary'}: {
  label: string;
  icon?: LucideIcon;
  /** Called every frame with elapsed seconds while held. */
  onTick: (dt: number) => void;
  onEnd?: () => void;
  isDisabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const tick = useRef(onTick);
  const end = useRef(onEnd);
  useEffect(() => {
    tick.current = onTick;
    end.current = onEnd;
  });
  const stop = () => {
    if (raf.current === null) return;
    cancelAnimationFrame(raf.current);
    raf.current = null;
    end.current?.();
  };
  const start = () => {
    if (isDisabled || raf.current !== null) return;
    last.current = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last.current) / 1000);
      last.current = t;
      tick.current(dt);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  useEffect(() => stop, []);
  return (
    <Button
      label={label}
      variant={variant}
      icon={icon ? <Icon icon={icon} /> : undefined}
      isDisabled={isDisabled}
      tooltip="Press and hold"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={e => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start();
      }}
      onKeyUp={e => {
        if (e.key === ' ' || e.key === 'Enter') stop();
      }}
    />
  );
}

export function SpeedPicker({value, onChange, options, unit}: {value: number; onChange: (v: number) => void; options: number[]; unit: string}) {
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      <Text type="supporting">Speed</Text>
      <SegmentedControl label="Speed" size="sm" value={String(value)} onChange={v => onChange(Number(v))}>
        {options.map(o => (
          <SegmentedControlItem key={o} value={String(o)} label={`${o} ${unit}`} />
        ))}
      </SegmentedControl>
    </HStack>
  );
}

/** A panel of simulator controls with a title. */
export function Controls({title, children}: {title: string; children: ReactNode}) {
  return (
    <Card padding={2}>
      <VStack gap={1.5}>
        <Text type="label" weight="semibold" color="secondary">
          {title}
        </Text>
        {children}
      </VStack>
    </Card>
  );
}

export function SayButton({label, onClick, isDisabled}: {label: string; onClick: () => void; isDisabled?: boolean}) {
  return <Button label={label} size="sm" variant="ghost" icon={<Icon icon={MessageCircle} />} onClick={onClick} isDisabled={isDisabled} />;
}
