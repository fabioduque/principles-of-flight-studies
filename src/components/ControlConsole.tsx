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
import { translatePresetName, translateStatus, useI18n } from '../i18n';

const MAX_THRUST = 1100;
const PITCH_STEP = 2.5;
const BANK_STEP = 5;

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  /** Hides the EXPAND/COLLAPSE button when false — used to lock collapsed
   *  state on mobile (no room for the expanded grid) and while a chart
   *  modal is open (console is force-collapsed underneath). */
  canToggle: boolean;
  /** Suppresses keyboard-related affordances (KBD toggle, key labels) on
   *  small viewports where there's no physical keyboard. */
  isMobile: boolean;
  keyboardMode: boolean;
  setKeyboardMode: (v: boolean | ((prev: boolean) => boolean)) => void;
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

// Throttle key badge — sits above and below the slider showing the bound
// key plus a prominent sign for the action direction. Always rendered;
// opacity transitions between dim and full when keyboard mode toggles.
function ThrottleKeyBadge({ k, sign, active }: { k: string; sign: string; active: boolean }) {
  return (
    <div
      className="flex items-center justify-center gap-1 select-none transition-opacity"
      style={{
        opacity: active ? 1 : 0.28,
        transition: 'opacity 0.25s ease',
        background: 'var(--bg-elev)',
        border: '1px solid var(--accent)',
        borderBottomWidth: 2,
        padding: '1px 5px',
        minWidth: 36,
      }}
    >
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          fontSize: 11,
          color: 'var(--accent)',
          lineHeight: 1,
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--accent)',
          lineHeight: 1,
          marginLeft: 2,
        }}
      >
        {sign}
      </span>
    </div>
  );
}

// Single key cap rendered drafting-style — paper background, hairline rule.
function Kbd({ children, size = 'sm' }: { children: React.ReactNode; size?: 'sm' | 'md' }) {
  const dim = size === 'md'
    ? { px: '0.4rem', minW: 22, h: 22, fs: 11 }
    : { px: '0.32rem', minW: 18, h: 18, fs: 10 };
  return (
    <span
      className="inline-flex items-center justify-center font-semibold"
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        background: 'var(--bg-elev)',
        color: 'var(--text)',
        border: '1px solid var(--rule)',
        borderBottomWidth: 2,
        lineHeight: 1,
        padding: `0 ${dim.px}`,
        minWidth: dim.minW,
        height: dim.h,
        fontSize: dim.fs,
      }}
    >
      {children}
    </span>
  );
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
    collapsed, onToggle, canToggle, isMobile,
    keyboardMode, setKeyboardMode,
    theta, bank, thrust, flaps, throttlePct, state,
    setTheta, setBank, setThrust, setFlaps,
    applyPreset, resetToDefaults,
  } = props;
  const { t } = useI18n();

  const Vs = stallSpeed(flaps, bank);
  const stallMargin = state.V_kts - Vs;
  const LD = state.D > 0.5 ? state.L / state.D : 0;
  const status = state.status;
  const statClr = statusColor(status);
  const statBg = status === 'stalled'
    ? 'color-mix(in srgb, var(--c-weight) 22%, transparent)'
    : 'transparent';
  const statusLabel = translateStatus(status, t);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        background: 'var(--bg-elev)',
        borderTop: keyboardMode ? '2px solid var(--accent)' : '1px solid var(--border-strong)',
        boxShadow: keyboardMode
          ? '0 -2px 0 var(--accent), 0 -10px 24px -8px rgba(0,0,0,0.18)'
          : '0 -2px 0 var(--rule), 0 -10px 24px -8px rgba(0,0,0,0.15)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* ── Cartouche / title strip ── */}
      <div
        className="border-b border-app px-3 sm:px-4 py-1 flex items-center justify-between gap-3"
        style={{ background: 'var(--bg-soft)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="meta" style={{ fontSize: 8.5, letterSpacing: '0.24em' }}>
            {t.consoleTitle}
          </span>
          <span className="hidden sm:inline meta text-fg-mute" style={{ fontSize: 8.5, letterSpacing: '0.18em' }}>
            {t.step} θ {PITCH_STEP}° · φ {BANK_STEP}° · T 10 N
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
            {statusLabel}
          </span>
          {/* KEYBOARD toggle — only visible on devices that have a keyboard.
              On phones it's noise. */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setKeyboardMode((v) => !v)}
              className={`btn px-3 py-1.5 text-[11px] flex items-center gap-2 ${keyboardMode ? 'is-active' : ''}`}
              aria-pressed={keyboardMode}
              title={keyboardMode ? 'Disable keyboard control' : 'Enable keyboard control'}
              style={keyboardMode ? {
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
                color: 'var(--bg-elev)',
              } : undefined}
            >
              {/* K key cap — makes the keyboard shortcut visible at a glance */}
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 700,
                  fontSize: 11,
                  padding: '0 5px',
                  minWidth: 18,
                  height: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid currentColor',
                  borderBottomWidth: 2,
                  lineHeight: 1,
                }}
              >
                K
              </span>
              <span className="font-semibold tracking-wider">{t.keyboard}</span>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: keyboardMode ? 'var(--bg-elev)' : 'var(--text-mute)',
                  boxShadow: keyboardMode
                    ? '0 0 0 2px color-mix(in srgb, var(--bg-elev) 30%, transparent)'
                    : undefined,
                  animation: keyboardMode ? 'pulse 1.6s ease-in-out infinite' : undefined,
                }}
              />
            </button>
          )}
          {/* EXPAND/COLLAPSE — hidden when caller can't toggle (mobile,
              fullscreen modal open). */}
          {canToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="btn px-3 py-1 text-[10px] flex items-center gap-1"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand console' : 'Collapse console'}
              title={collapsed ? 'Expand console' : 'Collapse console'}
            >
              <span className="font-semibold">{collapsed ? t.expand : t.collapse}</span>
              <span className="text-base leading-none">{collapsed ? '▴' : '▾'}</span>
            </button>
          )}
        </div>
      </div>


      {/* ─────────────────────────── COLLAPSED VIEW ─────────────────────── */}
      {collapsed && (
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Inline nudges */}
            <InlineNudge
              label={t.pitchLabel.replace(' θ', '')}
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
              label={t.bankPresets.split(' ')[0]}
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
              <span className="meta" style={{ fontSize: 8.5 }}>{t.throttle}</span>
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
              <span className="meta" style={{ fontSize: 8.5 }}>{t.flaps}</span>
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

            {/* Compact readouts — cells shrink on phone to fit 360 px wraps. */}
            <div className="flex items-center border border-app divide-x divide-[var(--border)] bg-app sm:ml-auto">
              <div className="px-1.5 sm:px-2 py-1 text-center min-w-[44px] sm:min-w-[56px]">
                <div className="meta" style={{ fontSize: 7.5 }}>IAS</div>
                <div className="num text-sm font-semibold">{state.V_kts.toFixed(0)}<span className="text-[8px] text-fg-mute ml-0.5">kt</span></div>
              </div>
              <div className="px-1.5 sm:px-2 py-1 text-center min-w-[42px] sm:min-w-[52px]">
                <div className="meta" style={{ fontSize: 7.5 }}>α</div>
                <div className="num text-sm font-semibold">{state.alpha.toFixed(1)}°</div>
              </div>
              <div className="px-1.5 sm:px-2 py-1 text-center min-w-[42px] sm:min-w-[52px]">
                <div className="meta" style={{ fontSize: 7.5 }}>γ</div>
                <div className="num text-sm font-semibold">{state.gamma.toFixed(1)}°</div>
              </div>
              <div className="px-1.5 sm:px-2 py-1 text-center min-w-[40px] sm:min-w-[48px]">
                <div className="meta" style={{ fontSize: 7.5 }}>n</div>
                <div className="num text-sm font-semibold" style={{ color: state.n > 1.5 ? 'var(--c-drag)' : 'var(--text)' }}>
                  {state.n.toFixed(2)}
                </div>
              </div>
              <div className="px-1.5 sm:px-2 py-1 text-center min-w-[56px] sm:min-w-[60px]" style={{ background: statBg }}>
                <div className="meta" style={{ fontSize: 7.5 }}>{t.status}</div>
                <div
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: statClr, letterSpacing: '0.06em', fontFamily: "'IBM Plex Sans Condensed', system-ui" }}
                >
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* Reset — visible in collapsed view so mobile users (forced
                collapsed) still have a way to recover pitch/bank/throttle/
                flaps to cruise defaults. */}
            <button
              type="button"
              onClick={resetToDefaults}
              className="btn-ghost btn text-[10px] px-2.5 py-1"
              title="Reset pitch, bank, throttle, and flaps to cruise defaults"
              aria-label={t.reset}
            >
              ↺ {t.reset}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────── EXPANDED VIEW ─────────────────────── */}
      {!collapsed && (
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2">
          <div className="grid grid-cols-12 gap-3 lg:gap-4 items-start">

            {/* LEFT — attitude indicator with presets ────────────────── */}
            <div className="col-span-12 md:col-span-6 lg:col-span-5 xl:col-span-5 flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <span className="meta" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                  ATTITUDE
                </span>
                {/* Always-visible keyboard toggle hint — press K from anywhere */}
                <button
                  type="button"
                  onClick={() => setKeyboardMode((v) => !v)}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 border border-app hover:bg-soft transition-colors"
                  style={{
                    background: keyboardMode ? 'var(--accent-soft)' : 'transparent',
                    borderColor: keyboardMode ? 'var(--accent)' : 'var(--border)',
                  }}
                  title={keyboardMode ? 'Press K to disable keyboard' : 'Press K to enable keyboard'}
                  aria-pressed={keyboardMode}
                >
                  <Kbd size="sm">K</Kbd>
                  <span
                    className="meta"
                    style={{
                      fontSize: 8.5,
                      letterSpacing: '0.10em',
                      color: keyboardMode ? 'var(--accent)' : 'var(--text-soft)',
                    }}
                  >
                    {keyboardMode ? t.keyboardOn : t.keyboardOff}
                  </span>
                </button>
              </div>
              <AttitudeControl
                theta={theta}
                bank={bank}
                setTheta={setTheta}
                setBank={setBank}
                keyboardMode={keyboardMode}
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
                  {/* Slider column with R+ above and F- below.
                      Badges are always rendered (no layout shift) — opacity
                      fades from dim to accent when keyboard mode toggles. */}
                  <div className="flex flex-col items-center gap-1">
                    <ThrottleKeyBadge k="R" sign="+" active={keyboardMode} />
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
                        height: 152,
                        width: 22,
                      }}
                    />
                    <ThrottleKeyBadge k="F" sign="−" active={keyboardMode} />
                  </div>
                  <div className="text-center min-w-[64px] border border-app p-1.5 bg-app flex flex-col justify-center">
                    <div className="display-num text-2xl leading-none" style={{ color: 'var(--c-thrust)' }}>
                      {throttlePct}
                    </div>
                    <div className="meta mt-0.5" style={{ fontSize: 8 }}>{t.percent}</div>
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
                <div className="flex flex-col items-center gap-1">
                  <ThrottleKeyBadge k="T" sign="+" active={keyboardMode} />
                  <div className="flex flex-col gap-px h-[152px] border border-app">
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
                  <ThrottleKeyBadge k="G" sign="−" active={keyboardMode} />
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
                <MetricCell label={t.aoa} value={state.alpha.toFixed(1) + '°'} />
                <MetricCell label={t.gammaFlightPath} value={state.gamma.toFixed(1) + '°'} />
                <MetricCell
                  label={t.nLoad}
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
                  label={t.margin}
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
                  <div className="meta" style={{ fontSize: 8.5 }}>{t.status}</div>
                  <div
                    className="text-[12px] font-bold uppercase mt-1 leading-tight"
                    style={{
                      color: statClr,
                      letterSpacing: '0.10em',
                      fontFamily: "'IBM Plex Sans Condensed', system-ui",
                    }}
                  >
                    {statusLabel}
                  </div>
                  <div className="text-[9px] text-fg-mute num mt-1 truncate">
                    {t.alphaStallRatio} {(state.alpha / (state.flaps === 0 ? 16 : state.flaps === 10 ? 14 : 12)).toFixed(2)}
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
                      {translatePresetName(p.name, t)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="btn-ghost btn text-[10px] whitespace-nowrap"
                  title="Reset to cruise defaults"
                >
                  ↺ {t.reset}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
