// Attitude indicator with presets arranged AROUND the bezel.
//   • Bank presets sit on the bottom arc as clickable tick-buttons.
//   • Pitch presets stack as a vertical "tape" to the right of the AI.
//   • A compact 4-way nudge cross provides fine adjustment.
//
// Increments: pitch step = 2.5° · bank step = 5°.

import { useCallback, useRef } from 'react';
import { useI18n } from '../i18n';

interface Props {
  theta: number;
  bank: number;
  setTheta: (v: number) => void;
  setBank: (v: number) => void;
  pitchMin?: number;
  pitchMax?: number;
  bankMax?: number;
  size?: number;
  /** When true, render key-cap hints next to each nudge direction. */
  keyboardMode?: boolean;
}

// Accent-bordered keycap badge under each nudge button — same visual
// language as the throttle's R+/F− badges. Always rendered (reserves
// vertical space) so toggling keyboard mode never shifts the layout;
// only its opacity transitions from dim to full.
function NudgeKeyBadge({ text, active }: { text: string; active: boolean }) {
  return (
    <div
      className="flex items-center justify-center select-none transition-opacity"
      style={{
        opacity: active ? 1 : 0.28,
        transition: 'opacity 0.25s ease',
        background: 'var(--bg-elev)',
        border: '1px solid var(--accent)',
        borderBottomWidth: 2,
        padding: '1px 6px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 700,
        fontSize: 11,
        color: 'var(--accent)',
        lineHeight: 1,
        letterSpacing: '0.08em',
        minWidth: 30,
      }}
    >
      {text}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

const PITCH_STEP = 2.5;
const BANK_STEP = 5;

const PITCH_PRESETS = [20, 15, 10, 5, 0, -5, -10];
const BANK_PRESETS = [-60, -45, -30, -15, 0, 15, 30, 45, 60];

const VIEW_R = 110;
const INNER_R = 92;
const PITCH_PX_PER_DEG = 4;

// Muted "blueprint sky" — desaturated steel-slate gradient. Reads as
// atmospheric and drafted, not as a saturated gauge sky.
const SKY = '#3a536e';        // deeper muted slate (top of dome)
const SKY_LIGHT = '#6b88a4';  // lighter muted slate (near horizon)
const GROUND = '#6e4a25';     // earth, slightly desaturated to match
const GROUND_LIGHT = '#94693a';
const HORIZON_LINE = '#f3ecd5';
const SYMBOL = '#ffb454';
const SCALE = '#f3ecd5';

function roundTo(v: number, step: number) {
  return Math.round(v / step) * step;
}

export function AttitudeControl({
  theta,
  bank,
  setTheta,
  setBank,
  pitchMin = -15,
  pitchMax = 30,
  bankMax = 75,
  size = 168,
  keyboardMode = false,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const { t } = useI18n();

  const halfPitchRange = (pitchMax - pitchMin) / 2;
  const pitchMid = (pitchMin + pitchMax) / 2;

  const translateY = theta * PITCH_PX_PER_DEG;
  const rotateDeg = -bank;

  const updateFromEvent = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ((e as PointerEvent).clientX - cx) / (rect.width / 2);
      const dy = ((e as PointerEvent).clientY - cy) / (rect.height / 2);

      const newBank = clamp(dx * bankMax, -bankMax, bankMax);
      const newPitch = clamp(pitchMid + dy * halfPitchRange, pitchMin, pitchMax);

      setBank(roundTo(newBank, BANK_STEP));
      setTheta(roundTo(newPitch, PITCH_STEP));
    },
    [bankMax, pitchMin, pitchMax, pitchMid, halfPitchRange, setBank, setTheta],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromEvent(e);

    const handleMove = (ev: PointerEvent) => updateFromEvent(ev);
    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      (ev.target as Element).releasePointerCapture?.(ev.pointerId);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const nudgePitch = (d: number) =>
    setTheta(clamp(roundTo(theta + d, PITCH_STEP), pitchMin, pitchMax));
  const nudgeBank = (d: number) =>
    setBank(clamp(roundTo(bank + d, BANK_STEP), -bankMax, bankMax));

  const pitchLadder = [-15, -10, -5, 5, 10, 15, 20, 25, 30];
  const bankMajorMarks = [-60, -45, -30, 30, 45, 60];
  const bankMinorMarks = [-20, -10, 10, 20];

  // Bank preset positions on the BOTTOM arc — angle = preset value, radius just
  // outside the dial. Reflected to bottom by +180° rotation.
  const bezelBankR = VIEW_R + 14;
  const bezelBankInner = VIEW_R + 4;

  return (
    <div className="select-none flex items-center gap-3">
      {/* ── LEFT: nudge cross + live readout ── */}
      <div className="flex flex-col items-center gap-1.5 min-w-[88px]">
        <div className="meta" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
          {t.nudge}
        </div>

        {/* Cross — each button has a larger arrow + accent-bordered keycap
            badge below it. Badge opacity transitions so layout never shifts. */}
        <div className="flex flex-col items-center gap-1.5">
          {/* Up — pitch down (yoke push, nose down) */}
          <button
            type="button"
            onClick={() => nudgePitch(-PITCH_STEP)}
            className="btn px-3 py-1.5 flex flex-col items-center gap-1.5 min-w-[58px]"
            title={`pitch −${PITCH_STEP}° · ↑ / W`}
            aria-label="pitch down"
          >
            <span className="text-base leading-none">▲</span>
            <NudgeKeyBadge text="↑ W" active={keyboardMode} />
          </button>

          {/* Middle row: bank-left | centre | bank-right */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => nudgeBank(-BANK_STEP)}
              className="btn px-3 py-1.5 flex flex-col items-center gap-1.5 min-w-[58px]"
              title={`bank −${BANK_STEP}° · ← / A`}
              aria-label="bank left"
            >
              <span className="text-base leading-none">◀</span>
              <NudgeKeyBadge text="← A" active={keyboardMode} />
            </button>
            <button
              type="button"
              onClick={() => { setTheta(0); setBank(0); }}
              className="btn-ghost btn px-3 py-1.5 flex flex-col items-center gap-1.5 min-w-[58px]"
              title="centre — reset pitch & bank · X"
              aria-label="centre"
            >
              <span className="text-sm leading-none">●</span>
              <NudgeKeyBadge text="X" active={keyboardMode} />
            </button>
            <button
              type="button"
              onClick={() => nudgeBank(BANK_STEP)}
              className="btn px-3 py-1.5 flex flex-col items-center gap-1.5 min-w-[58px]"
              title={`bank +${BANK_STEP}° · → / D`}
              aria-label="bank right"
            >
              <span className="text-base leading-none">▶</span>
              <NudgeKeyBadge text="→ D" active={keyboardMode} />
            </button>
          </div>

          {/* Down — pitch up (yoke pull, nose up) */}
          <button
            type="button"
            onClick={() => nudgePitch(PITCH_STEP)}
            className="btn px-3 py-1.5 flex flex-col items-center gap-1.5 min-w-[58px]"
            title={`pitch +${PITCH_STEP}° · ↓ / S`}
            aria-label="pitch up"
          >
            <span className="text-base leading-none">▼</span>
            <NudgeKeyBadge text="↓ S" active={keyboardMode} />
          </button>
        </div>

        <div className="border border-app px-2 py-1 bg-app w-full">
          <div className="flex items-center justify-between text-[10px] num text-fg-soft">
            <span>θ</span>
            <span className="text-fg font-bold tabular-nums">
              {(theta > 0 ? '+' : '') + theta.toFixed(1)}°
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] num text-fg-soft">
            <span>φ</span>
            <span className="text-fg font-bold tabular-nums">
              {(bank > 0 ? '+' : '') + bank.toFixed(0)}°
            </span>
          </div>
        </div>
      </div>

      {/* ── MIDDLE: AI + bezel bank presets ── */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            ref={ref}
            // ViewBox extended on bottom to fit bank-preset arc
            viewBox={`-${VIEW_R + 30} -${VIEW_R + 8} ${(VIEW_R + 30) * 2} ${(VIEW_R + 8) + (VIEW_R + 38)}`}
            width={size + 60}
            height={size + 46}
            onPointerDown={handlePointerDown}
            className="touch-none cursor-grab active:cursor-grabbing block"
            aria-label="Attitude indicator — drag to set pitch and bank"
            role="slider"
            aria-valuemin={-bankMax}
            aria-valuemax={bankMax}
            aria-valuenow={bank}
          >
            <defs>
              <clipPath id="ai-clip">
                <circle cx={0} cy={0} r={INNER_R} />
              </clipPath>
              <radialGradient id="ai-vignette" cx="50%" cy="50%" r="60%">
                <stop offset="55%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.40)" />
              </radialGradient>
              {/* Drafting tick gradient for sky/ground halves */}
              <linearGradient id="ai-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SKY} />
                <stop offset="100%" stopColor={SKY_LIGHT} />
              </linearGradient>
              <linearGradient id="ai-ground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GROUND_LIGHT} />
                <stop offset="100%" stopColor={GROUND} />
              </linearGradient>
              <pattern id="bezel-hatch" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="3" stroke="var(--rule)" strokeWidth="0.4" opacity="0.4" />
              </pattern>
            </defs>

            {/* Outer drafting bezel — paper coloured with hairline rules */}
            <circle cx={0} cy={0} r={VIEW_R + 2} fill="var(--bg-soft)" stroke="var(--border-strong)" strokeWidth={1.4} />
            <circle cx={0} cy={0} r={VIEW_R - 4} fill="url(#bezel-hatch)" opacity={0.45} />
            <circle cx={0} cy={0} r={INNER_R + 4} fill="var(--bg-elev)" stroke="var(--rule)" strokeWidth={0.7} />

            {/* Inner AI face */}
            <g clipPath="url(#ai-clip)">
              <rect x={-200} y={-200} width={400} height={400} fill="url(#ai-ground)" />
              <g transform={`rotate(${rotateDeg}) translate(0 ${translateY})`}>
                <rect x={-300} y={-400} width={600} height={400} fill="url(#ai-sky)" />
                <rect x={-300} y={0} width={600} height={400} fill="url(#ai-ground)" />
                <line x1={-300} y1={0} x2={300} y2={0} stroke={HORIZON_LINE} strokeWidth={2} />

                {pitchLadder.map((p) => {
                  const y = -p * PITCH_PX_PER_DEG;
                  const isMajor = Math.abs(p) % 10 === 0;
                  const len = isMajor ? 24 : 12;
                  return (
                    <g key={p}>
                      <line x1={-len} y1={y} x2={len} y2={y} stroke={HORIZON_LINE} strokeWidth={1.3} />
                      {isMajor && (
                        <>
                          <text x={len + 4} y={y + 3.2} fontSize={9} fill={HORIZON_LINE} fontFamily="'IBM Plex Mono', monospace" fontWeight={600}>{Math.abs(p)}</text>
                          <text x={-len - 4} y={y + 3.2} fontSize={9} fill={HORIZON_LINE} fontFamily="'IBM Plex Mono', monospace" fontWeight={600} textAnchor="end">{Math.abs(p)}</text>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Sky pointer (small triangle at top of pitch tape) */}
                <path
                  d={`M 0 ${-INNER_R + 6} L -5 ${-INNER_R + 14} L 5 ${-INNER_R + 14} Z`}
                  fill={SYMBOL}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth={0.6}
                />
              </g>
              <rect x={-200} y={-200} width={400} height={400} fill="url(#ai-vignette)" />
            </g>

            {/* Bank scale on top half of bezel */}
            {bankMajorMarks.map((b) => {
              const a = (b * Math.PI) / 180;
              const r1 = INNER_R + 2;
              const r2 = INNER_R - 8;
              return (
                <line key={b} x1={r1 * Math.sin(a)} y1={-r1 * Math.cos(a)} x2={r2 * Math.sin(a)} y2={-r2 * Math.cos(a)} stroke={SCALE} strokeWidth={1.6} opacity={0.92} />
              );
            })}
            {bankMinorMarks.map((b) => {
              const a = (b * Math.PI) / 180;
              const r1 = INNER_R + 2;
              const r2 = INNER_R - 3;
              return (
                <line key={b} x1={r1 * Math.sin(a)} y1={-r1 * Math.cos(a)} x2={r2 * Math.sin(a)} y2={-r2 * Math.cos(a)} stroke={SCALE} strokeWidth={1} opacity={0.7} />
              );
            })}
            {[30, 60, -30, -60].map((b) => {
              const a = (b * Math.PI) / 180;
              const r = INNER_R - 18;
              return (
                <text key={b} x={r * Math.sin(a)} y={-r * Math.cos(a) + 3.2} fontSize={8.5} fill={SCALE} fontFamily="'IBM Plex Mono', monospace" fontWeight={600} textAnchor="middle" opacity={0.92}>{Math.abs(b)}</text>
              );
            })}

            {/* Top bank pointer (drafting triangle) */}
            <path d={`M 0 ${-INNER_R - 6} L -4.5 ${-INNER_R - 14} L 4.5 ${-INNER_R - 14} Z`} fill={SCALE} />

            {/* Aircraft wing symbol — drafting orange */}
            <g stroke={SYMBOL} fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <line x1={-30} y1={0} x2={-12} y2={0} />
              <line x1={12} y1={0} x2={30} y2={0} />
              <path d="M -8 0 L 0 5 L 8 0" />
            </g>
            <circle cx={0} cy={0} r={2.4} fill={SYMBOL} />

            {/* ── Bezel bank preset buttons (bottom arc) ── */}
            {BANK_PRESETS.map((b) => {
              const a = (b * Math.PI) / 180;
              // Place on BOTTOM arc — invert vertical sign
              const x = bezelBankR * Math.sin(a);
              const y = bezelBankR * Math.cos(a);  // +cos → below center
              const xi = bezelBankInner * Math.sin(a);
              const yi = bezelBankInner * Math.cos(a);
              const isActive = Math.abs(bank - b) < 0.01;
              return (
                <g key={`bp-${b}`}>
                  {/* Tick line into the bezel */}
                  <line
                    x1={xi}
                    y1={yi}
                    x2={x * 0.94}
                    y2={y * 0.94}
                    stroke={isActive ? 'var(--accent)' : 'var(--rule)'}
                    strokeWidth={isActive ? 1.6 : 0.8}
                    opacity={isActive ? 1 : 0.6}
                  />
                  {/* Clickable hit area — invisible larger circle for ergonomics */}
                  <circle
                    cx={x}
                    cy={y}
                    r={11}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={(ev) => { ev.stopPropagation(); setBank(b); }}
                  />
                  {/* Visible label */}
                  <text
                    x={x}
                    y={y + 3.5}
                    textAnchor="middle"
                    fontSize={isActive ? 10 : 9}
                    fill={isActive ? 'var(--accent)' : 'var(--text-soft)'}
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight={isActive ? 700 : 500}
                    style={{ pointerEvents: 'none' }}
                  >
                    {b === 0 ? '0' : (b > 0 ? `+${b}` : b) + '°'}
                  </text>
                </g>
              );
            })}

            {/* Bezel bank caption */}
            <text
              x={0}
              y={VIEW_R + 32}
              textAnchor="middle"
              fontSize={7.5}
              fill="var(--text-mute)"
              fontFamily="'IBM Plex Sans Condensed', system-ui"
              letterSpacing="0.22em"
              fontWeight={600}
            >
              {t.bankPresets}
            </text>
          </svg>
        </div>
      </div>

      {/* ── Pitch preset tape (vertical column to the right of the AI) ── */}
      <div className="flex flex-col items-stretch min-w-[68px]">
        <div className="meta mb-1 text-center" style={{ fontSize: 8.5, letterSpacing: '0.22em' }}>
          {t.pitchLabel}
        </div>
        <div className="flex flex-col gap-px border border-app">
          {PITCH_PRESETS.map((p) => {
            const isActive = Math.abs(theta - p) < 0.01;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setTheta(p)}
                className={`px-2 py-1 text-[11px] num text-left flex items-center gap-2 transition-colors ${
                  isActive ? 'bg-[var(--text)] text-[var(--bg-elev)]' : 'bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)]'
                }`}
                aria-pressed={isActive}
              >
                <span
                  className="inline-block w-1 h-3"
                  style={{ background: isActive ? 'var(--accent)' : (p === 0 ? 'var(--rule)' : 'transparent') }}
                />
                <span className="font-bold tabular-nums">
                  {p > 0 ? '+' : (p < 0 ? '' : ' ')}
                  {p}°
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-[9px] text-fg-mute mt-1 text-center" style={{ letterSpacing: '0.1em' }}>
          {t.step} {PITCH_STEP}°
        </div>
      </div>
    </div>
  );
}
