import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ZoomableCard } from './components/ZoomableCard';
import { I18nContext, type Lang, translations } from './i18n';

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
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof navigator !== 'undefined' && /^pt/i.test(navigator.language || '')) return 'pt';
    return 'en';
  });
  const t = translations[lang];
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);
  // Tracks consecutive keystrokes that aren't bound to anything while keyboard
  // piloting is on. After two unbound key presses we surface a one-shot toast
  // telling the user how to leave keyboard mode (press K). Pressing any bound
  // key resets the counter and hides the toast.
  const [showKeyboardEscapeHint, setShowKeyboardEscapeHint] = useState(false);
  const unboundKeyCountRef = useRef(0);
  const escapeHintTimerRef = useRef<number | null>(null);

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
  // T/G: flaps extend/retract        X:   reset pitch & bank
  useEffect(() => {
    if (!keyboardMode) {
      // Leaving keyboard mode — clear the unbound-key tracker.
      unboundKeyCountRef.current = 0;
      setShowKeyboardEscapeHint(false);
      if (escapeHintTimerRef.current !== null) {
        clearTimeout(escapeHintTimerRef.current);
        escapeHintTimerRef.current = null;
      }
      return;
    }

    function roundTo(v: number, step: number) { return Math.round(v / step) * step; }
    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    // Classify a key:
    //   'bound'  — pilot command (consume + clear unbound counter)
    //   'ignore' — modifier / navigation that we don't care about either way
    //   'unbound'— a printable key that doesn't do anything; tracked for the hint
    function classify(k: string): 'bound' | 'ignore' | 'unbound' {
      if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') return 'bound';
      if (k.length !== 1) return 'ignore';     // Tab, Escape, Shift, Enter, …
      if ('wsadrfgtxkWSADRFGTXK'.includes(k)) return 'bound';
      return 'unbound';
    }

    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const k = e.key;
      const kind = classify(k);

      if (kind === 'unbound') {
        unboundKeyCountRef.current += 1;
        if (unboundKeyCountRef.current >= 2) {
          setShowKeyboardEscapeHint(true);
          if (escapeHintTimerRef.current !== null) clearTimeout(escapeHintTimerRef.current);
          escapeHintTimerRef.current = window.setTimeout(() => {
            setShowKeyboardEscapeHint(false);
            unboundKeyCountRef.current = 0;
            escapeHintTimerRef.current = null;
          }, 6000);
        }
        return;
      }
      if (kind === 'ignore') return;

      // kind === 'bound' — clear hint state and consume the input.
      unboundKeyCountRef.current = 0;
      if (showKeyboardEscapeHint) setShowKeyboardEscapeHint(false);
      if (escapeHintTimerRef.current !== null) {
        clearTimeout(escapeHintTimerRef.current);
        escapeHintTimerRef.current = null;
      }

      let handled = true;
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
        setFlaps((f) => {
          const idx = FLAP_SETTINGS.indexOf(f);
          return FLAP_SETTINGS[Math.min(idx + 1, FLAP_SETTINGS.length - 1)];
        });
      } else if (k === 'g' || k === 'G') {
        setFlaps((f) => {
          const idx = FLAP_SETTINGS.indexOf(f);
          return FLAP_SETTINGS[Math.max(idx - 1, 0)];
        });
      } else {
        // K is handled by the global toggle effect — leave it alone here.
        handled = false;
      }
      if (handled) e.preventDefault();
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [keyboardMode, showKeyboardEscapeHint]);

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
    <I18nContext.Provider value={{ lang, t, setLang }}>
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
                  {t.headerSubtitle}
                </div>
                <h1
                  className="font-display text-2xl sm:text-3xl mt-1 leading-none flex flex-wrap items-baseline gap-x-2.5"
                  style={{ fontVariationSettings: "'opsz' 96", fontWeight: 700, letterSpacing: '-0.025em' }}
                >
                  <span>{t.titlePrinciples}</span>
                  <span className="text-fg-soft" style={{ fontSize: '0.7em', fontWeight: 400 }}>
                    {t.titleOf}
                  </span>
                  <span className="text-accent">{t.titleFlight}</span>
                </h1>
                <div
                  className="num text-fg-mute mt-1.5"
                  style={{ fontSize: 10, letterSpacing: '0.04em' }}
                >
                  {t.disclaimer}
                </div>
              </div>
              <span className="stamp hidden sm:inline-flex">
                <span className="stamp-num">SL · ISA</span>
                <span>{t.configStamp}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Language toggle */}
              <div className="flex border border-app" role="group" aria-label="Language">
                {(['en', 'pt'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`pill !border-0 ${lang === l ? 'is-active' : ''}`}
                    aria-pressed={lang === l}
                    title={l === 'en' ? 'English' : 'Português'}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {/* Theme toggle */}
              <div className="flex items-center gap-1">
                {(['auto', 'light', 'dark'] as Theme[]).map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setTheme(th)}
                    className={`pill ${theme === th ? 'is-active' : ''}`}
                    aria-pressed={theme === th}
                  >
                    {th === 'auto' ? t.themeAuto : th === 'light' ? t.themeLight : t.themeDark}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* ═══ TOP: charts row ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <ZoomableCard
            title={t.fig2}
            aside={`α ${state.alpha.toFixed(1)}° · Cₗ ${state.CL.toFixed(2)}`}
          >
            {() => (
              <CLChart
                activeFlaps={flaps}
                alpha={state.alpha}
                CL={state.CL}
                showAllFlapCurves
                stalled={state.status === 'stalled'}
              />
            )}
          </ZoomableCard>

          <ZoomableCard
            title={t.fig3}
            aside={`D ${Math.round(state.D)} N at ${state.V_kts.toFixed(0)} kt`}
          >
            {() => (
              <DragChart
                flaps={flaps}
                V_kts={state.V_kts}
                stalled={state.status === 'stalled'}
              />
            )}
          </ZoomableCard>
        </div>

        {/* ═══ MIDDLE: aircraft views ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <ZoomableCard
            title={t.fig1a}
            aside={`θ ${theta >= 0 ? '+' : ''}${theta.toFixed(1)}° · ${flaps === 0 ? t.clean : `${t.flapsAside} ${flaps}°`}`}
          >
            {(mode) => (
              <>
                <div className={mode === 'modal'
                  ? 'horizon-bg w-full h-[calc(100vh-120px)]'
                  : 'horizon-bg aspect-[16/10] xl:aspect-auto xl:h-[320px]'}>
                  <FlightDiagram state={state} />
                </div>
                {mode === 'inline' && (
                  <div className="px-3 py-1.5 text-[10px] border-t border-app flex flex-wrap gap-x-3 gap-y-1 num text-fg-soft">
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-lift)' }} />{t.legendL}</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-weight)' }} />{t.legendW}</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-thrust)' }} />{t.legendT}</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-drag)' }} />{t.legendD}</span>
                  </div>
                )}
              </>
            )}
          </ZoomableCard>

          <ZoomableCard
            title={t.fig1b}
            aside={`φ ${bank.toFixed(0)}° · n ${state.n.toFixed(2)} g`}
          >
            {(mode) => (
              <>
                <div className={mode === 'modal'
                  ? 'horizon-bg w-full h-[calc(100vh-120px)]'
                  : 'horizon-bg aspect-[16/10] xl:aspect-auto xl:h-[320px]'}>
                  <BankView state={state} />
                </div>
                {mode === 'inline' && (
                  <div className="px-3 py-1.5 text-[10px] border-t border-app flex flex-wrap gap-x-3 gap-y-1 num text-fg-soft">
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-lift)' }} />{t.legendLAft}</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-weight)' }} />{t.legendWAft}</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--c-magenta)' }} />{t.legendLcosphi}</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: 'var(--accent)' }} />{t.legendTurnDir}</span>
                  </div>
                )}
              </>
            )}
          </ZoomableCard>
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

      {/* Keyboard-mode escape hint — surfaces after 2+ unbound keystrokes */}
      {keyboardMode && showKeyboardEscapeHint && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 flex items-center gap-2.5"
          style={{
            top: 84,
            background: 'var(--bg-elev)',
            border: '1px solid var(--accent)',
            borderBottomWidth: 2,
            boxShadow: '0 8px 24px -6px rgba(0,0,0,0.35)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
          role="status"
        >
          <span
            className="meta"
            style={{ fontSize: 8.5, letterSpacing: '0.22em', color: 'var(--accent)' }}
          >
            {t.keyboardModeLabel}
          </span>
          <span className="text-fg-soft" style={{ fontSize: 10 }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text)' }}>
            {t.keyboardUnbound}{' '}
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                fontSize: 11,
                padding: '1px 6px',
                background: 'var(--bg)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderBottomWidth: 2,
                margin: '0 2px',
              }}
            >
              K
            </span>{' '}
            {t.keyboardToDisable}
          </span>
        </div>
      )}

      {/* Visible copyright footer — sits above the sticky console via padding */}
      <footer
        className="fixed inset-x-0 z-30 pointer-events-none flex justify-center"
        style={{ bottom: (consoleCollapsed ? 96 : 268) + 4 }}
      >
        <div
          className="pointer-events-auto px-3 py-0.5 num text-fg-mute"
          style={{ fontSize: 9, letterSpacing: '0.08em' }}
        >
          © {new Date().getFullYear()} Fábio Duque · {t.footer}
        </div>
      </footer>
    </div>
    </I18nContext.Provider>
  );
}
