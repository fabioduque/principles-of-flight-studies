import type { FlightState } from '../physics';
import { stallSpeed } from '../physics';

interface Props {
  state: FlightState;
}

function MetricCard({
  label,
  value,
  unit,
  tone = 'default',
  big = false,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'default' | 'warn' | 'bad' | 'good' | 'primary';
  big?: boolean;
}) {
  const toneColor = {
    default: 'var(--text)',
    warn: 'var(--c-drag)',
    bad: 'var(--c-weight)',
    good: 'var(--c-thrust)',
    primary: 'var(--c-cg)',
  }[tone];

  const toneBorder = {
    default: 'var(--border)',
    warn: 'var(--c-drag)',
    bad: 'var(--c-weight)',
    good: 'var(--c-thrust)',
    primary: 'var(--c-cg)',
  }[tone];

  return (
    <div
      className="px-3 py-2.5"
      style={{
        borderLeft: `3px solid ${toneBorder}`,
        background: 'var(--bg)',
      }}
    >
      <p className="meta">{label}</p>
      <p
        className={`num ${big ? 'text-2xl' : 'text-base'} mt-0.5`}
        style={{ color: toneColor }}
      >
        {value}
        {unit && <span className="text-fg-mute text-xs ml-1 font-normal">{unit}</span>}
      </p>
    </div>
  );
}

function statusLabel(s: FlightState['status']): {
  text: string;
  tone: 'default' | 'warn' | 'bad' | 'good' | 'primary';
} {
  switch (s) {
    case 'stalled':
      return { text: 'STALLED', tone: 'bad' };
    case 'near-stall':
      return { text: 'NEAR STALL', tone: 'warn' };
    case 'pull-up':
      return { text: 'PULL-UP (n > 1)', tone: 'warn' };
    case 'unloaded':
      return { text: 'UNLOADED (n < 1)', tone: 'warn' };
    case 'climbing':
      return { text: 'CLIMBING', tone: 'good' };
    case 'descending':
      return { text: 'DESCENDING', tone: 'default' };
    case 'level':
    default:
      return { text: 'LEVEL', tone: 'good' };
  }
}

export function Readouts({ state }: Props) {
  const s = statusLabel(state.status);
  const Vs = stallSpeed(state.flaps, state.bankDeg);
  const Vs_clean = stallSpeed(state.flaps, 0);
  const belowStall = state.V_kts < Vs;

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricCard label="Airspeed" value={state.V_kts.toFixed(0)} unit="kt" tone="primary" big />
        <MetricCard label="α — AoA" value={state.alpha.toFixed(1)} unit="°" big />
        <MetricCard label="γ — Flight path" value={state.gamma.toFixed(1)} unit="°" big />
        <MetricCard label="CL" value={state.CL.toFixed(2)} />
        <MetricCard label="CD" value={state.CD.toFixed(3)} />
        <MetricCard label="Lift" value={Math.round(state.L).toLocaleString()} unit="N" />
        <MetricCard label="Drag" value={Math.round(state.D).toLocaleString()} unit="N" />
        <MetricCard label="Load factor n" value={state.n.toFixed(2)} unit="g" tone={state.n > 1.5 ? 'warn' : 'default'} />
        <MetricCard label="Status" value={s.text} tone={s.tone} />
      </div>

      <div
        className="px-4 py-3 border"
        style={{
          background: 'var(--bg)',
          borderColor: belowStall ? 'var(--c-weight)' : 'var(--c-lift)',
          borderLeftWidth: '4px',
        }}
      >
        <p className="meta mb-1" style={{ color: belowStall ? 'var(--c-weight)' : 'var(--c-lift)' }}>
          Stall speed Vₛ — flaps {state.flaps}°, bank {state.bankDeg.toFixed(0)}°
        </p>
        <p className="num text-lg">
          <span style={{ color: belowStall ? 'var(--c-weight)' : 'var(--c-lift)' }}>
            {Vs.toFixed(1)} kt
          </span>
          {state.bankDeg > 0.5 && (
            <span className="text-fg-soft text-sm ml-2">
              ← {Vs_clean.toFixed(1)} kt wings level × √{state.n.toFixed(2)}
            </span>
          )}
        </p>
        {belowStall && (
          <p className="mt-1 text-sm font-bold" style={{ color: 'var(--c-weight)' }}>
            ⚠ Current airspeed {state.V_kts.toFixed(0)} kt is below Vₛ — wing stalled.
          </p>
        )}
      </div>
    </div>
  );
}
