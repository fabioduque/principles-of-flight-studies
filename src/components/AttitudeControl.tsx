// Attitude indicator + D-pad + pitch/bank presets.
// Drag the AI face to fly. Use the D-pad to nudge by fine steps.
// Presets snap to common pitch (-5/0/+5/+10°) and bank (0/10/30/60°) values.

import { useRef, useCallback } from 'react';

interface Props {
  theta: number;
  bank: number;
  setTheta: (v: number) => void;
  setBank: (v: number) => void;
  pitchMin?: number;
  pitchMax?: number;
  bankMax?: number;
  size?: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

const VIEW_R = 100;
const INNER_R = 88;
const PITCH_PX_PER_DEG = 4;

const SKY = '#4d9be0';
const GROUND = '#8a5a3c';
const HORIZON_LINE = '#ffffff';
const SYMBOL = '#fbbf24';
const SCALE = '#f4f4f6';

const PITCH_PRESETS = [-10, -5, 0, 5, 10, 15, 30];
const BANK_PRESETS = [0, 10, 30, 60];
const PITCH_STEP = 0.5;
const BANK_STEP = 1;

export function AttitudeControl({
  theta,
  bank,
  setTheta,
  setBank,
  pitchMin = -15,
  pitchMax = 45,
  bankMax = 75,
  size = 150,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);

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
      // Yoke-style: pull back (cursor down) = nose UP.
      const newPitch = clamp(pitchMid + dy * halfPitchRange, pitchMin, pitchMax);

      setBank(Math.round(newBank * 10) / 10);
      setTheta(Math.round(newPitch * 2) / 2);
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
    setTheta(clamp(Math.round((theta + d) * 2) / 2, pitchMin, pitchMax));
  const nudgeBank = (d: number) =>
    setBank(clamp(Math.round((bank + d) * 10) / 10, -bankMax, bankMax));

  const pitchLadder = [-15, -10, -5, 5, 10, 15, 20, 25, 30, 40];
  const bankMajor = [-60, -45, -30, 30, 45, 60];
  const bankMinor = [-20, -10, 10, 20];

  return (
    <div className="flex items-start gap-3 select-none">
      {/* ── Attitude indicator ── */}
      <div className="flex flex-col items-center">
        <svg
          ref={ref}
          viewBox={`-${VIEW_R} -${VIEW_R} ${VIEW_R * 2} ${VIEW_R * 2}`}
          width={size}
          height={size}
          onPointerDown={handlePointerDown}
          className="touch-none cursor-grab active:cursor-grabbing"
          style={{ display: 'block' }}
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
              <stop offset="60%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
            </radialGradient>
          </defs>

          <circle cx={0} cy={0} r={VIEW_R - 2} fill="var(--bg-soft)" stroke="var(--border-strong)" strokeWidth={2} />
          <circle cx={0} cy={0} r={INNER_R + 4} fill="var(--bg-elev)" stroke="var(--border)" strokeWidth={0.6} />

          <g clipPath="url(#ai-clip)">
            <rect x={-200} y={-200} width={400} height={400} fill={GROUND} />
            <g transform={`rotate(${rotateDeg}) translate(0 ${translateY})`}>
              <rect x={-300} y={-400} width={600} height={400} fill={SKY} />
              <rect x={-300} y={0} width={600} height={400} fill={GROUND} />
              <line x1={-300} y1={0} x2={300} y2={0} stroke={HORIZON_LINE} strokeWidth={2} />

              {pitchLadder.map((p) => {
                const y = -p * PITCH_PX_PER_DEG;
                const isMajor = Math.abs(p) % 10 === 0;
                const len = isMajor ? 22 : 12;
                return (
                  <g key={p}>
                    <line x1={-len} y1={y} x2={len} y2={y} stroke={HORIZON_LINE} strokeWidth={1.4} />
                    {isMajor && (
                      <>
                        <text x={len + 3} y={y + 3.2} fontSize={8.5} fill={HORIZON_LINE} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>{Math.abs(p)}</text>
                        <text x={-len - 3} y={y + 3.2} fontSize={8.5} fill={HORIZON_LINE} fontFamily="'JetBrains Mono', monospace" fontWeight={600} textAnchor="end">{Math.abs(p)}</text>
                      </>
                    )}
                  </g>
                );
              })}

              <path
                d={`M 0 ${-INNER_R + 6} L -5 ${-INNER_R + 14} L 5 ${-INNER_R + 14} Z`}
                fill={SYMBOL}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.6}
              />
            </g>
            <rect x={-200} y={-200} width={400} height={400} fill="url(#ai-vignette)" />
          </g>

          {bankMajor.map((b) => {
            const a = (b * Math.PI) / 180;
            const r1 = INNER_R + 2;
            const r2 = INNER_R - 6;
            return (
              <line key={b} x1={r1 * Math.sin(a)} y1={-r1 * Math.cos(a)} x2={r2 * Math.sin(a)} y2={-r2 * Math.cos(a)} stroke={SCALE} strokeWidth={1.6} opacity={0.9} />
            );
          })}
          {bankMinor.map((b) => {
            const a = (b * Math.PI) / 180;
            const r1 = INNER_R + 2;
            const r2 = INNER_R - 3;
            return (
              <line key={b} x1={r1 * Math.sin(a)} y1={-r1 * Math.cos(a)} x2={r2 * Math.sin(a)} y2={-r2 * Math.cos(a)} stroke={SCALE} strokeWidth={1} opacity={0.7} />
            );
          })}
          {[30, 60, -30, -60].map((b) => {
            const a = (b * Math.PI) / 180;
            const r = INNER_R - 14;
            return (
              <text key={b} x={r * Math.sin(a)} y={-r * Math.cos(a) + 3.2} fontSize={8} fill={SCALE} fontFamily="'JetBrains Mono', monospace" fontWeight={600} textAnchor="middle" opacity={0.9}>{Math.abs(b)}</text>
            );
          })}

          <path d={`M 0 ${-INNER_R - 6} L -4.5 ${-INNER_R - 14} L 4.5 ${-INNER_R - 14} Z`} fill={SCALE} />

          <g stroke={SYMBOL} fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <line x1={-30} y1={0} x2={-12} y2={0} />
            <line x1={12} y1={0} x2={30} y2={0} />
            <path d="M -8 0 L 0 5 L 8 0" />
          </g>
          <circle cx={0} cy={0} r={2.4} fill={SYMBOL} />
        </svg>

        <div className="mt-1.5 flex items-center gap-2 text-[10px] num text-fg-soft">
          <span>θ <span className="text-fg font-bold">{(theta > 0 ? '+' : '') + theta.toFixed(1)}°</span></span>
          <span>φ <span className="text-fg font-bold">{(bank > 0 ? '+' : '') + bank.toFixed(0)}°</span></span>
          <button
            type="button"
            onClick={() => { setTheta(0); setBank(0); }}
            className="btn-ghost btn text-[10px] py-0.5 px-1.5"
            title="Level — zero pitch & bank"
          >
            ↺
          </button>
        </div>
      </div>

      {/* ── Right column: D-pad + presets ── */}
      <div className="flex flex-col gap-2 min-w-0">
        <div>
          <div className="meta mb-1">Nudge</div>
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-[96px]">
            <span />
            {/* Yoke convention: push forward (↑) = nose down */}
            <button type="button" onClick={() => nudgePitch(-PITCH_STEP)} className="btn px-0 py-1 text-sm" title={`push — nose ↓ (pitch −${PITCH_STEP}°)`} aria-label="push: nose down">↑</button>
            <span />
            <button type="button" onClick={() => nudgeBank(-BANK_STEP)} className="btn px-0 py-1 text-sm" title={`bank −${BANK_STEP}°`} aria-label="bank left">←</button>
            <button type="button" onClick={() => { setTheta(0); setBank(0); }} className="btn-ghost btn px-0 py-1 text-[10px]" title="centre" aria-label="centre">•</button>
            <button type="button" onClick={() => nudgeBank(BANK_STEP)} className="btn px-0 py-1 text-sm" title={`bank +${BANK_STEP}°`} aria-label="bank right">→</button>
            <span />
            {/* Pull back (↓) = nose up */}
            <button type="button" onClick={() => nudgePitch(PITCH_STEP)} className="btn px-0 py-1 text-sm" title={`pull — nose ↑ (pitch +${PITCH_STEP}°)`} aria-label="pull: nose up">↓</button>
            <span />
          </div>
        </div>

        <div>
          <div className="meta mb-1">Pitch preset</div>
          <div className="flex gap-1 flex-wrap">
            {PITCH_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTheta(p)}
                className={`btn px-2 py-1 text-[11px] ${Math.abs(theta - p) < 0.01 ? 'is-active' : ''}`}
                aria-pressed={Math.abs(theta - p) < 0.01}
              >
                {p > 0 ? '+' : ''}{p}°
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="meta mb-1">Bank preset</div>
          <div className="flex gap-1 flex-wrap">
            {BANK_PRESETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBank(b)}
                className={`btn px-2 py-1 text-[11px] ${Math.abs(bank - b) < 0.01 ? 'is-active' : ''}`}
                aria-pressed={Math.abs(bank - b) < 0.01}
              >
                {b}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
