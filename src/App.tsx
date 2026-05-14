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
import { ControlConsole } from './components/ControlConsole';

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
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);

  // ─── Global toggle: K turns keyboard piloting on/off (always listening). ──
  useEffect(() => {
    function handleToggle(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setKeyboardMode((v) => !v);
      }
    }
    window.addEventListener('keydown', handleToggle);
    return () => window.removeEventListener('keydown', handleToggle);
  }, []);

  // ─── Keyboard piloting (only active when toggled on) ─────────────────────
  // ↑/W: pitch −2.5° (nose down)     ↓/S: pitch +2.5° (yoke-pull, nose up)
  // ←/A: bank −5°    →/D: bank +5°
  // R:   throttle +50 N              F:   throttle −50 N
  useEffect(() => {
    if (!keyboardMode) return;

    function roundTo(v: number, step: number) { return Math.round(v / step) * step; }
    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      let handled = true;
      const k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        setTheta((t) => clamp(roundTo(t - 2.5, 2.5), -15, 30));
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        setTheta((t) => clamp(roundTo(t + 2.5, 2.5), -15, 30));
      } else if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        setBank((b) => clamp(roundTo(b - 5, 5), -75, 75));
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        setBank((b) => clamp(roundTo(b + 5, 5), -75, 75));
      } else if (k === 'r' || k === 'R') {
        setThrust((t) => clamp(t + 50, 0, 1100));
      } else if (k === 'f' || k === 'F') {
        setThrust((t) => clamp(t - 50, 0, 1100));
      } else if (k === 'x' || k === 'X') {
        setTheta(0);
        setBank(0);
      } else if (k === 't' || k === 'T') {
        // Cycle flaps DOWN (more flap deployed): 0 → 10 → 30 → 30 (clamp)
        setFlaps((f) => {
          const idx = FLAP_SETTINGS.indexOf(f);
          return FLAP_SETTINGS[Math.min(idx + 1, FLAP_SETTINGS.length - 1)];
        });
      } else if (k === 'g' || k === 'G') {
        // Cycle flaps UP (retract): 30 → 10 → 0 → 0 (clamp)
        setFlaps((f) => {
          const idx = FLAP_SETTINGS.indexOf(f);
          return FLAP_SETTINGS[Math.max(idx - 1, 0)];
        });
      } else {
        handled = false;
      }
      if (handled) e.preventDefault();
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [keyboardMode]);

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
      <div
        className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3"
        style={{ paddingBottom: consoleCollapsed ? 96 : 268 }}
      >

        {/* ─── Header — drafting frontispiece ─── */}
        <header className="mb-4 pb-3 border-b border-app">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-baseline gap-4 flex-wrap">
              <div>
                <div className="meta" style={{ fontSize: 9, letterSpacing: '0.28em' }}>
                  AERODYNAMIC STUDY SUPPLEMENT · CESSNA 152
                </div>
                <h1
                  className="font-display text-2xl sm:text-3xl mt-1 leading-none flex flex-wrap items-baseline gap-x-2.5"
                  style={{ fontVariationSettings: "'opsz' 96", fontWeight: 700, letterSpacing: '-0.025em' }}
                >
                  <span>Principles</span>
                  <span className="text-fg-soft" style={{ fontSize: '0.7em', fontWeight: 400 }}>
                    of
                  </span>
                  <span className="text-accent">Flight</span>
                </h1>
                <div
                  className="num text-fg-mute mt-1.5"
                  style={{ fontSize: 10, letterSpacing: '0.04em' }}
                >
                  Study aid · simplified model · may contain inaccuracies
                </div>
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
            <CLChart
              activeFlaps={flaps}
              alpha={state.alpha}
              CL={state.CL}
              showAllFlapCurves
              stalled={state.status === 'stalled'}
            />
          </Card>

          <Card
            title="Fig 3 — Drag curves D vs V"
            aside={`D ${Math.round(state.D)} N at ${state.V_kts.toFixed(0)} kt`}
          >
            <DragChart
              flaps={flaps}
              V_kts={state.V_kts}
              stalled={state.status === 'stalled'}
            />
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

      {/* ═══ BOTTOM: collapsible sticky control console ═══ */}
      <ControlConsole
        collapsed={consoleCollapsed}
        onToggle={() => setConsoleCollapsed((v) => !v)}
        keyboardMode={keyboardMode}
        setKeyboardMode={setKeyboardMode}
        theta={theta}
        bank={bank}
        thrust={thrust}
        flaps={flaps}
        throttlePct={throttlePct}
        state={state}
        setTheta={setTheta}
        setBank={setBank}
        setThrust={setThrust}
        setFlaps={setFlaps}
        applyPreset={applyPreset}
        resetToDefaults={resetToDefaults}
      />

      {/* Visible copyright footer — sits above the sticky console via padding */}
      <footer
        className="fixed inset-x-0 z-30 pointer-events-none flex justify-center"
        style={{ bottom: (consoleCollapsed ? 96 : 268) + 4 }}
      >
        <div
          className="pointer-events-auto px-3 py-0.5 num text-fg-mute"
          style={{ fontSize: 9, letterSpacing: '0.08em' }}
        >
          © {new Date().getFullYear()} Fábio Duque · Educational tool — not for flight planning.
        </div>
      </footer>
    </div>
  );
}
