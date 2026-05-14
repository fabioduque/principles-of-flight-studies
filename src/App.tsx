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
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 pb-[220px]">

        {/* ─── Header ─── */}
        <header className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-app">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-bold tracking-tight">
              C152 <span className="text-accent">aero</span>
            </h1>
            <span className="meta hidden sm:inline">Lift · drag · load factor</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="meta hidden lg:inline">Sea level ISA</span>
            <div className="flex gap-1">
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
            title="Lift coefficient · Cₗ vs α"
            aside={`α ${state.alpha.toFixed(1)}° · Cₗ ${state.CL.toFixed(2)}`}
          >
            <CLChart activeFlaps={flaps} alpha={state.alpha} CL={state.CL} showAllFlapCurves />
          </Card>

          <Card
            title="Drag curves · D vs V (level trim)"
            aside={`D ${Math.round(state.D)} N at ${state.V_kts.toFixed(0)} kt`}
          >
            <DragChart flaps={flaps} V_kts={state.V_kts} />
          </Card>
        </div>

        {/* ═══ MIDDLE: aircraft views ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <Card
            title="Side view — four forces"
            aside={`θ ${theta >= 0 ? '+' : ''}${theta.toFixed(1)}° · ${flaps === 0 ? 'clean' : `flaps ${flaps}°`}`}
          >
            <div className="grid-bg aspect-[16/10] xl:aspect-auto xl:h-[300px]">
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
            title="Back view — bank &amp; load"
            aside={`φ ${bank.toFixed(0)}° · n ${state.n.toFixed(2)}g`}
          >
            <div className="grid-bg aspect-[16/10] xl:aspect-auto xl:h-[300px]">
              <BankView state={state} />
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

      {/* ═══ BOTTOM: sticky control bar ═══ */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
        style={{
          background: 'color-mix(in srgb, var(--bg-elev) 92%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">

            {/* 2D pitch/bank joystick */}
            <div className="flex flex-col items-center">
              <span className="meta mb-1.5">Yoke · pitch &amp; bank</span>
              <AttitudeControl
                theta={theta}
                bank={bank}
                setTheta={setTheta}
                setBank={setBank}
              />
            </div>

            {/* Throttle (vertical slider) */}
            <div className="flex flex-col items-center">
              <span className="meta mb-1.5">Throttle</span>
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
                <div className="text-center min-w-[56px]">
                  <div className="num text-2xl font-bold" style={{ color: 'var(--c-thrust)' }}>
                    {throttlePct}
                  </div>
                  <div className="text-[10px] text-fg-mute">%</div>
                  <div className="num text-[10px] text-fg-soft mt-1">{Math.round(thrust)} N</div>
                </div>
              </div>
            </div>

            {/* Flaps (vertical buttons) */}
            <div className="flex flex-col items-center">
              <span className="meta mb-1.5">Flaps</span>
              <div className="flex flex-col gap-1 h-[168px]">
                {[...FLAP_SETTINGS].reverse().map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlaps(f)}
                    className={`btn flex-1 min-w-[60px] ${f === flaps ? 'is-active' : ''}`}
                    aria-pressed={f === flaps}
                  >
                    {f}°
                  </button>
                ))}
              </div>
            </div>

            {/* Live readout snapshot */}
            <div className="flex items-stretch divide-x divide-[var(--border)] border border-app rounded-lg overflow-hidden ml-auto bg-elev">
              <div className="px-3 py-2 text-center min-w-[68px]">
                <div className="meta">IAS</div>
                <div className="num text-base font-bold">{state.V_kts.toFixed(0)}<span className="text-[10px] text-fg-mute ml-0.5">kt</span></div>
              </div>
              <div className="px-3 py-2 text-center min-w-[60px]">
                <div className="meta">α</div>
                <div className="num text-base font-bold">{state.alpha.toFixed(1)}°</div>
              </div>
              <div className="px-3 py-2 text-center min-w-[60px]">
                <div className="meta">γ</div>
                <div className="num text-base font-bold">{state.gamma.toFixed(1)}°</div>
              </div>
              <div className="px-3 py-2 text-center min-w-[56px]">
                <div className="meta">n</div>
                <div className="num text-base font-bold" style={{ color: state.n > 1.5 ? 'var(--c-drag)' : 'var(--text)' }}>
                  {state.n.toFixed(2)}
                </div>
              </div>
              <div className={`px-3 py-2 text-center min-w-[88px] ${state.status === 'stalled' ? 'bg-[color-mix(in_srgb,var(--c-weight)_18%,transparent)]' : ''}`}>
                <div className="meta">Status</div>
                <div className="text-xs font-bold uppercase tracking-wide" style={{
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

            {/* Presets + reset */}
            <div className="flex flex-col items-end gap-2 ml-auto sm:ml-0">
              <span className="meta">Presets</span>
              <div className="flex flex-wrap gap-1 max-w-[260px] justify-end">
                {PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => applyPreset(p.name)} className="btn text-xs">
                    {p.name}
                  </button>
                ))}
                <button type="button" onClick={resetToDefaults} className="btn-ghost btn text-xs">
                  ↺
                </button>
              </div>
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
