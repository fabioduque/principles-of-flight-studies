import { useEffect, useMemo, useState } from 'react';
import {
  type Flaps,
  FLAP_SETTINGS,
  PRESETS,
  WEIGHT_N,
  solveFromPitchThrottleBank,
} from './physics';
import { FlightDiagram } from './components/FlightDiagram';
import { CLChart } from './components/CLChart';
import { DragChart } from './components/DragChart';
import { LoadFactorPanel } from './components/LoadFactorPanel';
import { Readouts } from './components/Readouts';
import { ForceBalance } from './components/ForceBalance';
import { BankView } from './components/BankView';
import { AttitudeControl } from './components/AttitudeControl';

type Theme = 'auto' | 'light' | 'dark';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

const DEFAULTS = {
  flaps: 0 as Flaps,
  theta: 2,
  thrust: 720,
  bank: 0,
};
const MAX_THRUST = 1100;

function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col h-full">
      <div className="card-header">
        <span className="card-header-title">{title}</span>
        {aside && <span className="card-header-aside">{aside}</span>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function App() {
  const [flaps, setFlaps] = useState<Flaps>(DEFAULTS.flaps);
  const [theta, setTheta] = useState(DEFAULTS.theta);
  const [thrust, setThrust] = useState(DEFAULTS.thrust);
  const [bank, setBank] = useState(DEFAULTS.bank);
  const [theme, setTheme] = useState<Theme>('auto');
  const [showAssumptions, setShowAssumptions] = useState(false);

  function resetToDefaults() {
    setFlaps(DEFAULTS.flaps);
    setTheta(DEFAULTS.theta);
    setThrust(DEFAULTS.thrust);
    setBank(DEFAULTS.bank);
  }

  useEffect(() => {
    applyTheme(theme);
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('auto');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const state = useMemo(
    () => solveFromPitchThrottleBank(theta, thrust, bank, flaps),
    [theta, thrust, bank, flaps],
  );

  function applyPreset(name: string) {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    setFlaps(p.flaps);
    setThrust(p.thrust);
    if (p.theta !== undefined) setTheta(p.theta);
  }

  const throttlePct = Math.round((thrust / MAX_THRUST) * 100);

  return (
    <div className="min-h-screen bg-app text-fg">
      {/* Body content — reserve space at bottom for sticky control bar */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 pb-[280px]">

        {/* ─── Header — drafting frontispiece ─── */}
        <header className="mb-4 pb-3 border-b border-app">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-baseline gap-4">
              <div>
                <div className="meta" style={{ fontSize: 9, letterSpacing: '0.28em' }}>
                  PRINCIPLES OF FLIGHT · STUDY SUPPLEMENT
                </div>
                <h1 className="font-display italic text-2xl sm:text-3xl mt-0.5 leading-none" style={{ fontVariationSettings: "'SOFT' 30, 'WONK' 1, 'opsz' 144" }}>
                  Cessna <span className="text-accent">152</span>
                  <span className="text-fg-mute font-normal not-italic mx-2">·</span>
                  <span className="font-normal not-italic text-fg-soft text-xl">Aerodynamics</span>
                </h1>
              </div>
              <span className="stamp hidden sm:inline-flex">
                <span className="stamp-num">SL · ISA</span>
                <span>1670 lb · normal cat.</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`pill ${theme === t ? 'is-active' : ''}`}
                  aria-pressed={theme === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ═══ TOP: charts row ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <Card
            title="Fig 2 — Lift coefficient Cₗ vs α"
            aside={`α ${state.alpha.toFixed(1)}° · Cₗ ${state.CL.toFixed(2)}`}
          >
            <CLChart activeFlaps={flaps} alpha={state.alpha} CL={state.CL} showAllFlapCurves />
          </Card>

          <Card
            title="Fig 3 — Drag curves D vs V"
            aside={`D ${Math.round(state.D)} N at ${state.V_kts.toFixed(0)} kt`}
          >
            <DragChart flaps={flaps} V_kts={state.V_kts} />
          </Card>
        </div>

        {/* ═══ MIDDLE: aircraft views ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <Card
            title="Fig 1·A — Side profile"
            aside={`θ ${theta >= 0 ? '+' : ''}${theta.toFixed(1)}° · ${flaps === 0 ? 'CLEAN' : `FLAPS ${flaps}°`}`}
          >
            <div className="horizon-bg aspect-[16/10] xl:aspect-auto xl:h-[320px]">
              <FlightDiagram state={state} />
            </div>
            <div className="px-3 py-1.5 text-[10px] border-t border-app flex flex-wrap gap-x-3 gap-y-1 num text-fg-soft">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-lift)' }} />L ⟂ flight path</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-weight)' }} />W ↓</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-thrust)' }} />T fuselage</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-drag)' }} />D opp. flight path</span>
            </div>
          </Card>

          <Card
            title="Fig 1·B — Aft view"
            aside={`φ ${bank.toFixed(0)}° · n ${state.n.toFixed(2)} g`}
          >
            <div className="horizon-bg aspect-[16/10] xl:aspect-auto xl:h-[320px]">
              <BankView state={state} />
            </div>
            <div className="px-3 py-1.5 text-[10px] border-t border-app flex flex-wrap gap-x-3 gap-y-1 num text-fg-soft">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-lift)' }} />L tilts with wings</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-weight)' }} />W stays vertical</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-magenta)' }} />L cos φ, L sin φ</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--accent)' }} />turn direction</span>
            </div>
          </Card>
        </div>

        {/* ─── Compact readouts strip ─── */}
        <div className="mb-3">
          <Card title="State" aside="live">
            <Readouts state={state} />
          </Card>
        </div>

        {/* Supplementary panels — accessible by scrolling */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <Card title="Load factor in turns" aside="n = 1 / cos φ">
            <LoadFactorPanel L={state.L} W={WEIGHT_N} gamma={state.gamma} n={state.n} bankDeg={state.bankDeg} />
          </Card>
          <Card title="Force decomposition" aside="X forward · Y up">
            <ForceBalance state={state} />
          </Card>
        </div>

        {/* Assumptions */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowAssumptions((v) => !v)}
            className="w-full card px-4 py-3 text-left flex items-center justify-between hover:bg-soft transition-colors"
            aria-expanded={showAssumptions}
          >
            <span className="card-header-title">Model assumptions</span>
            <span className="text-fg-soft text-lg font-mono leading-none">{showAssumptions ? '−' : '+'}</span>
          </button>
          {showAssumptions && (
            <div className="card border-t-0 px-5 py-4 text-sm text-fg-soft rounded-t-none" style={{ marginTop: '-1px' }}>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Lift slope (0.10/°), α<sub>ZL</sub>, α<sub>stall</sub> and C<sub>L</sub> max are textbook approximations — not POH data.</li>
                <li>Coordinated turns assumed; no slip or skid.</li>
                <li>Banked load: L cos φ supports W cos γ; n = 1/(cos φ · cos γ).</li>
                <li>V<sub>s</sub> scales with √n (the wing carries n·W).</li>
                <li>Steady-state only — no transients, gusts, or ground effect.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ═══ BOTTOM: sticky control bar — drafting "instrument panel" ═══ */}
      <div
        className="fixed inset-x-0 bottom-0 z-40"
        style={{
          background: 'var(--bg-elev)',
          borderTop: '1px solid var(--border-strong)',
          boxShadow: '0 -2px 0 var(--rule), 0 -10px 24px -8px rgba(0,0,0,0.15)',
        }}
      >
        {/* Title strip — like a drafting cartouche */}
        <div
          className="border-b border-app px-4 py-1 flex items-center justify-between"
          style={{ background: 'var(--bg-soft)' }}
        >
          <span className="meta" style={{ fontSize: 8.5, letterSpacing: '0.24em' }}>
            CONSOLE · PILOT INPUTS
          </span>
          <span className="meta" style={{ fontSize: 8.5, letterSpacing: '0.18em' }}>
            STEP θ {2.5}° · φ {5}° · T {10} N
          </span>
        </div>

        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3">
          <div className="flex flex-wrap items-start gap-5 lg:gap-6">

            {/* Attitude indicator (with bank presets + pitch tape) */}
            <div className="flex flex-col items-center">
              <span className="meta mb-1.5" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                ATTITUDE
              </span>
              <AttitudeControl
                theta={theta}
                bank={bank}
                setTheta={setTheta}
                setBank={setBank}
              />
            </div>

            {/* Throttle */}
            <div className="flex flex-col items-center">
              <span className="meta mb-1.5" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                THROTTLE
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={MAX_THRUST}
                  step={10}
                  value={thrust}
                  onChange={(e) => setThrust(Number(e.target.value))}
                  className="vertical"
                  style={{
                    writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
                    direction: 'rtl',
                    height: 168,
                    width: 24,
                  }}
                />
                <div className="text-center min-w-[64px] border border-app p-1.5 bg-app">
                  <div className="display-num text-3xl" style={{ color: 'var(--c-thrust)' }}>
                    {throttlePct}
                  </div>
                  <div className="meta" style={{ fontSize: 7.5 }}>PERCENT</div>
                  <div className="num text-[10px] text-fg-soft mt-1">{Math.round(thrust)} N</div>
                </div>
              </div>
            </div>

            {/* Flaps */}
            <div className="flex flex-col items-center">
              <span className="meta mb-1.5" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                FLAPS
              </span>
              <div className="flex flex-col gap-px h-[168px] border border-app">
                {[...FLAP_SETTINGS].reverse().map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlaps(f)}
                    className={`btn flex-1 min-w-[60px] !border-0 ${f === flaps ? 'is-active' : ''}`}
                    aria-pressed={f === flaps}
                  >
                    {f}°
                  </button>
                ))}
              </div>
            </div>

            {/* Live readout snapshot */}
            <div className="flex items-stretch border border-app divide-x divide-[var(--border)] ml-auto bg-app">
              <div className="px-3 py-2 text-center min-w-[72px]">
                <div className="meta" style={{ fontSize: 8 }}>IAS</div>
                <div className="display-num text-xl mt-0.5">{state.V_kts.toFixed(0)}</div>
                <div className="text-[9px] text-fg-mute mt-0.5">kt</div>
              </div>
              <div className="px-3 py-2 text-center min-w-[68px]">
                <div className="meta" style={{ fontSize: 8 }}>α</div>
                <div className="display-num text-xl mt-0.5">{state.alpha.toFixed(1)}°</div>
              </div>
              <div className="px-3 py-2 text-center min-w-[68px]">
                <div className="meta" style={{ fontSize: 8 }}>γ</div>
                <div className="display-num text-xl mt-0.5">{state.gamma.toFixed(1)}°</div>
              </div>
              <div className="px-3 py-2 text-center min-w-[60px]">
                <div className="meta" style={{ fontSize: 8 }}>n</div>
                <div className="display-num text-xl mt-0.5" style={{ color: state.n > 1.5 ? 'var(--c-drag)' : 'var(--text)' }}>
                  {state.n.toFixed(2)}
                </div>
              </div>
              <div className={`px-3 py-2 text-center min-w-[96px] ${state.status === 'stalled' ? '' : ''}`} style={{ background: state.status === 'stalled' ? 'color-mix(in srgb, var(--c-weight) 22%, transparent)' : 'transparent' }}>
                <div className="meta" style={{ fontSize: 8 }}>STATUS</div>
                <div className="text-[11px] font-bold uppercase tracking-widest mt-1.5" style={{
                  fontFamily: "'IBM Plex Sans Condensed', system-ui",
                  color: state.status === 'stalled' ? 'var(--c-weight)' :
                         state.status === 'near-stall' || state.status === 'pull-up' || state.status === 'unloaded' ? 'var(--c-drag)' :
                         state.status === 'climbing' ? 'var(--c-thrust)' :
                         'var(--text)',
                }}>
                  {state.status === 'pull-up' ? 'pull-up' :
                   state.status === 'near-stall' ? 'near stall' :
                   state.status}
                </div>
              </div>
            </div>

            {/* Scenario presets + reset */}
            <div className="flex flex-col items-stretch gap-1.5 min-w-[200px]">
              <span className="meta" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
                SCENARIO
              </span>
              <div className="flex flex-wrap gap-px border border-app">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p.name)}
                    className="btn !border-0 flex-1 min-w-[88px] text-[10px] px-2"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button type="button" onClick={resetToDefaults} className="btn-ghost btn text-[10px] self-end">
                ↺ reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="hidden">
        <span>Educational tool — not for flight planning.</span>
      </footer>
    </div>
  );
}
