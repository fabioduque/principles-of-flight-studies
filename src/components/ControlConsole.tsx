// Sticky bottom control console. Two modes:
//
//   • Expanded (default) — full instrument panel: attitude indicator + bezel
//     bank presets + pitch tape, throttle, flaps, derived-state readouts grid
//     (IAS · α · γ · n · Vs · stall margin · L/D · status), and scenario row.
//
//   • Collapsed — single thin row with inline nudge controls for pitch,
//     bank, throttle, and flaps + live state at a glance + status flag.
//
// Collapsing recovers ~190 px of vertical space for the diagrams above.

import { AttitudeControl } from './AttitudeControl';
import {
  type Flaps,
  type FlightState,
  FLAP_SETTINGS,
  PRESETS,
  stallSpeed,
} from '../physics';

const MAX_THRUST = 1100;
const PITCH_STEP = 2.5;
const BANK_STEP = 5;

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  theta: number;
  bank: number;
  thrust: number;
  flaps: Flaps;
  throttlePct: number;
  state: FlightState;
  setTheta: (v: number) => void;
  setBank: (v: number) => void;
  setThrust: (v: number) => void;
  setFlaps: (v: Flaps) => void;
  applyPreset: (name: string) => void;
  resetToDefaults: () => void;
}

function statusColor(status: FlightState['status']): string {
  switch (status) {
    case 'stalled': return 'var(--c-weight)';
    case 'near-stall':
    case 'pull-up':
    case 'unloaded': return 'var(--c-drag)';
    case 'climbing': return 'var(--c-thrust)';
    default: return 'var(--text)';
  }
}

function statusText(status: FlightState['status']): string {
  if (status === 'pull-up') return 'pull-up';
  if (status === 'near-stall') return 'near stall';
  return status;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function roundTo(v: number, step: number) {
  return Math.round(v / step) * step;
}

// ─── Readout cells used in the expanded console ──────────────────────────
function MetricCell({
  label,
  value,
  unit,
  tone,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'default' | 'warn' | 'bad' | 'good';
  hint?: string;
}) {
  const color = {
    default: 'var(--text)',
    warn: 'var(--c-drag)',
    bad: 'var(--c-weight)',
    good: 'var(--c-thrust)',
  }[tone ?? 'default'];
  return (
    <div className="px-2.5 py-2 flex flex-col justify-center min-w-0">
      <div className="meta" style={{ fontSize: 8.5 }}>{label}</div>
      <div className="display-num text-xl leading-none mt-1" style={{ color }}>
        {value}
        {unit && <span className="text-[10px] text-fg-mute font-medium ml-1">{unit}</span>}
      </div>
      {hint && <div className="text-[9px] text-fg-mute num mt-1 truncate">{hint}</div>}
    </div>
  );
}

// ─── Compact inline nudge row used in collapsed mode ────────────────────
function InlineNudge({
  label,
  symbol,
  value,
  unit,
  step,
  min,
  max,
  onChange,
  color,
}: {
  label: string;
  symbol: string;
  value: number;
  unit?: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="meta" style={{ fontSize: 8.5 }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(clamp(roundTo(value - step, step), min, max))}
        className="btn px-1.5 py-0.5 text-[11px]"
        aria-label={`${label} decrease`}
      >
        −
      </button>
      <div className="num min-w-[58px] text-center text-sm font-semibold" style={{ color: color || 'var(--text)' }}>
        <span className="text-fg-mute mr-0.5">{symbol}</span>
        {value > 0 ? '+' : ''}{value.toFixed(step < 1 ? 1 : 0)}{unit}
      </div>
      <button
        type="button"
        onClick={() => onChange(clamp(roundTo(value + step, step), min, max))}
        className="btn px-1.5 py-0.5 text-[11px]"
        aria-label={`${label} increase`}
      >
        +
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
export function ControlConsole(props: Props) {
  const {
    collapsed, onToggle,
    theta, bank, thrust, flaps, throttlePct, state,
    setTheta, setBank, setThrust, setFlaps,
    applyPreset, resetToDefaults,
  } = props;

  const Vs = stallSpeed(flaps, bank);
  const stallMargin = state.V_kts - Vs;
  const LD = state.D > 0.5 ? state.L / state.D : 0;
  const status = state.status;
  const statClr = statusColor(status);
  const statBg = status === 'stalled'
    ? 'color-mix(in srgb, var(--c-weight) 22%, transparent)'
    : 'transparent';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        background: 'var(--bg-elev)',
        borderTop: '1px solid var(--border-strong)',
        boxShadow: '0 -2px 0 var(--rule), 0 -10px 24px -8px rgba(0,0,0,0.15)',
      }}
    >
      {/* ── Cartouche / title strip with collapse toggle ── */}
      <div
        className="border-b border-app px-3 sm:px-4 py-1 flex items-center justify-between gap-3"
        style={{ background: 'var(--bg-soft)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="meta" style={{ fontSize: 8.5, letterSpacing: '0.24em' }}>
            CONSOLE · PILOT INPUTS
          </span>
          <span className="hidden sm:inline meta text-fg-mute" style={{ fontSize: 8.5, letterSpacing: '0.18em' }}>
            STEP θ {PITCH_STEP}° · φ {BANK_STEP}° · T 10 N
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="num text-[10px] px-2 py-0.5 border border-app font-semibold uppercase tracking-wider"
            style={{
              color: statClr,
              background: statBg,
              fontFamily: "'IBM Plex Sans Condensed', system-ui",
              letterSpacing: '0.14em',
            }}
          >
            {statusText(status)}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="btn px-3 py-1 text-[10px] flex items-center gap-1"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand console' : 'Collapse console'}
            title={collapsed ? 'Expand console' : 'Collapse console'}
          >
            <span className="font-semibold">{collapsed ? 'EXPAND' : 'COLLAPSE'}</span>
            <span className="text-base leading-none">{collapsed ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────── COLLAPSED VIEW ─────────────────────── */}
      {collapsed && (
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Inline nudges */}
            <InlineNudge
              label="PITCH"
              symbol="θ"
              value={theta}
              unit="°"
              step={PITCH_STEP}
              min={-15}
              max={30}
              onChange={setTheta}
              color="var(--accent)"
            />
            <InlineNudge
              label="BANK"
              symbol="φ"
              value={bank}
              unit="°"
              step={BANK_STEP}
              min={-75}
              max={75}
              onChange={setBank}
              color="var(--accent)"
            />

            {/* Inline throttle slider */}
            <div className="flex items-center gap-2">
              <span className="meta" style={{ fontSize: 8.5 }}>THROTTLE</span>
              <input
                type="range"
                min={0}
                max={MAX_THRUST}
                step={10}
                value={thrust}
                onChange={(e) => setThrust(Number(e.target.value))}
                style={{ width: 130, height: 18 }}
              />
              <span className="num text-sm font-semibold min-w-[36px]" style={{ color: 'var(--c-thrust)' }}>
                {throttlePct}%
              </span>
            </div>

            {/* Flaps quick-select */}
            <div className="flex items-center gap-2">
              <span className="meta" style={{ fontSize: 8.5 }}>FLAPS</span>
              <div className="flex border border-app">
                {FLAP_SETTINGS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlaps(f)}
                    className={`btn !border-0 px-2.5 py-0.5 text-[11px] ${f === flaps ? 'is-active' : ''}`}
                    aria-pressed={f === flaps}
                  >
                    {f}°
                  </button>
                ))}
              </div>
            </div>

            {/* Compact readouts */}
            <div className="flex items-center border border-app divide-x divide-[var(--border)] bg-app ml-auto">
              <div className="px-2 py-1 text-center min-w-[56px]">
                <div className="meta" style={{ fontSize: 7.5 }}>IAS</div>
                <div className="num text-sm font-semibold">{state.V_kts.toFixed(0)}<span className="text-[8px] text-fg-mute ml-0.5">kt</span></div>
              </div>
              <div className="px-2 py-1 text-center min-w-[52px]">
                <div className="meta" style={{ fontSize: 7.5 }}>α</div>
                <div className="num text-sm font-semibold">{state.alpha.toFixed(1)}°</div>
              </div>
              <div className="px-2 py-1 text-center min-w-[52px]">
                <div className="meta" style={{ fontSize: 7.5 }}>γ</div>
                <div className="num text-sm font-semibold">{state.gamma.toFixed(1)}°</div>
              </div>
              <div className="px-2 py-1 text-center min-w-[48px]">
                <div className="meta" style={{ fontSize: 7.5 }}>n</div>
                <div className="num text-sm font-semibold" style={{ color: state.n > 1.5 ? 'var(--c-drag)' : 'var(--text)' }}>
                  {state.n.toFixed(2)}
                </div>
              </div>
              <div className="px-2 py-1 text-center min-w-[60px]" style={{ background: statBg }}>
                <div className="meta" style={{ fontSize: 7.5 }}>STATUS</div>
                <div
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: statClr, letterSpacing: '0.06em', fontFamily: "'IBM Plex Sans Condensed', system-ui" }}
                >
                  {statusText(status)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── EXPANDED VIEW ─────────────────────── */}
      {!collapsed && (
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2">
          <div className="grid grid-cols-12 gap-3 lg:gap-4 items-start">

            {/* LEFT — attitude indicator with presets ────────────────── */}
            <div className="col-span-12 md:col-span-6 lg:col-span-5 xl:col-span-5 flex flex-col items-center">
              <span className="meta mb-1" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                ATTITUDE
              </span>
              <AttitudeControl
                theta={theta}
                bank={bank}
                setTheta={setTheta}
                setBank={setBank}
              />
            </div>

            {/* MIDDLE — throttle + flaps stacked vertically ─────────── */}
            <div className="col-span-6 md:col-span-3 lg:col-span-2 flex justify-center gap-3">
              {/* Throttle */}
              <div className="flex flex-col items-center">
                <span className="meta mb-1" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                  THROTTLE
                </span>
                <div className="flex items-stretch gap-2">
                  <input
                    type="range"
                    min={0}
                    max={MAX_THRUST}
                    step={10}
                    value={thrust}
                    onChange={(e) => setThrust(Number(e.target.value))}
                    style={{
                      writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
                      direction: 'rtl',
                      height: 168,
                      width: 22,
                    }}
                  />
                  <div className="text-center min-w-[64px] border border-app p-1.5 bg-app flex flex-col justify-center">
                    <div className="display-num text-2xl leading-none" style={{ color: 'var(--c-thrust)' }}>
                      {throttlePct}
                    </div>
                    <div className="meta mt-0.5" style={{ fontSize: 8 }}>PERCENT</div>
                    <div className="num text-[10px] text-fg-soft mt-1">
                      {Math.round(thrust)} N
                    </div>
                  </div>
                </div>
              </div>

              {/* Flaps */}
              <div className="flex flex-col items-center">
                <span className="meta mb-1" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                  FLAPS
                </span>
                <div className="flex flex-col gap-px h-[168px] border border-app">
                  {[...FLAP_SETTINGS].reverse().map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFlaps(f)}
                      className={`btn !border-0 flex-1 min-w-[58px] ${f === flaps ? 'is-active' : ''}`}
                      aria-pressed={f === flaps}
                    >
                      {f}°
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — readouts grid + scenario row, fills wasted area ─ */}
            <div className="col-span-12 md:col-span-3 lg:col-span-5 xl:col-span-5 flex flex-col gap-2">
              <span className="meta" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                STATE · DERIVED
              </span>

              {/* Readouts: 4-col × 2-row grid */}
              <div className="grid grid-cols-4 border border-app divide-x divide-[var(--border)] bg-app">
                {/* Row 1 */}
                <MetricCell label="IAS" value={state.V_kts.toFixed(0)} unit="kt" />
                <MetricCell label="α — AoA" value={state.alpha.toFixed(1) + '°'} />
                <MetricCell label="γ — flight path" value={state.gamma.toFixed(1) + '°'} />
                <MetricCell
                  label="n — load"
                  value={state.n.toFixed(2)}
                  unit="g"
                  tone={state.n > 1.5 ? 'warn' : 'default'}
                />
              </div>
              <div className="grid grid-cols-4 border border-app divide-x divide-[var(--border)] bg-app">
                {/* Row 2 — derived */}
                <MetricCell
                  label="Vs"
                  value={Vs.toFixed(0)}
                  unit="kt"
                  hint={`flaps ${flaps}° · φ ${bank.toFixed(0)}°`}
                />
                <MetricCell
                  label="margin V−Vs"
                  value={(stallMargin >= 0 ? '+' : '') + stallMargin.toFixed(0)}
                  unit="kt"
                  tone={stallMargin < 5 ? 'bad' : stallMargin < 15 ? 'warn' : 'good'}
                />
                <MetricCell
                  label="L/D"
                  value={LD.toFixed(1)}
                  hint={`L ${Math.round(state.L)} · D ${Math.round(state.D)} N`}
                />
                <div className="px-2.5 py-2 flex flex-col justify-center min-w-0" style={{ background: statBg }}>
                  <div className="meta" style={{ fontSize: 8.5 }}>STATUS</div>
                  <div
                    className="text-[12px] font-bold uppercase mt-1 leading-tight"
                    style={{
                      color: statClr,
                      letterSpacing: '0.10em',
                      fontFamily: "'IBM Plex Sans Condensed', system-ui",
                    }}
                  >
                    {statusText(status)}
                  </div>
                  <div className="text-[9px] text-fg-mute num mt-1 truncate">
                    α/α_stall {(state.alpha / (state.flaps === 0 ? 16 : state.flaps === 10 ? 14 : 12)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Scenario presets row */}
              <div className="flex items-stretch gap-2 mt-1">
                <span className="meta flex items-center" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                  SCENARIO
                </span>
                <div className="flex flex-1 border border-app">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p.name)}
                      className="btn !border-0 flex-1 min-w-0 text-[10px] px-1.5 py-1 border-r last:border-r-0"
                      style={{ borderRightColor: 'var(--border)' }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="btn-ghost btn text-[10px] whitespace-nowrap"
                  title="Reset to cruise defaults"
                >
                  ↺ reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
