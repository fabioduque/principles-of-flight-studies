import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import type { Flaps } from '../physics';
import { FLAP_CONFIGS, FLAP_SETTINGS, sampleCLCurve } from '../physics';
import { StallStamp } from './StallStamp';
import { useI18n } from '../i18n';

interface Props {
  activeFlaps: Flaps;
  alpha: number;
  CL: number;
  // In Simple mode we hide the other flap curves entirely.
  showAllFlapCurves: boolean;
  stalled?: boolean;
}

const FLAP_STYLES: Record<Flaps, { dashArray: string; color: string; styleLabel: string }> = {
  0: { dashArray: '0', color: 'var(--c-lift)', styleLabel: 'solid' },
  10: { dashArray: '7 4', color: 'var(--c-magenta)', styleLabel: 'dashed' },
  30: { dashArray: '2 4', color: 'var(--c-drag)', styleLabel: 'dotted' },
};

export function CLChart({ activeFlaps, alpha, CL, showAllFlapCurves, stalled }: Props) {
  const { t } = useI18n();

  // Sample range adapts to the current α so the operating-point dot stays on
  // the curve even when the user has pitched well past stall (e.g. α > 24°).
  const alphaMin = Math.min(-6, Math.floor(alpha) - 2);
  const alphaMax = Math.max(24, Math.ceil(alpha) + 4);

  // Build a single dataset where each row has α plus CL_0, CL_10, CL_30 values.
  const merged: Record<string, number>[] = [];
  const sampled = FLAP_SETTINGS.map((f) => sampleCLCurve(f, 0.5, alphaMin, alphaMax));
  const length = sampled[0].length;
  for (let i = 0; i < length; i++) {
    const row: Record<string, number> = { alpha: sampled[0][i].alpha };
    FLAP_SETTINGS.forEach((f, idx) => {
      row[`CL_${f}`] = sampled[idx][i].CL;
    });
    merged.push(row);
  }

  // Ticks: keep 4° spacing across whatever range is active.
  const ticks: number[] = [];
  const tickStart = Math.ceil(alphaMin / 4) * 4;
  for (let v = tickStart; v <= alphaMax; v += 4) ticks.push(v);

  const activeCfg = FLAP_CONFIGS[activeFlaps];

  return (
    <div
      aria-label="Lift coefficient versus angle of attack chart"
      className="p-5 sm:p-6"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
        <p className="meta">Fig 6.1 — Cₗ vs α</p>
        <p className="num text-sm" style={{ color: 'var(--c-cg)' }}>
          α = {alpha.toFixed(1)}°
          <span className="text-fg-soft mx-2">|</span>
          Cₗ = {CL.toFixed(2)}
        </p>
      </header>

      <div className="h-80 grid-bg border border-app relative" role="img" aria-label="Lift coefficient curves for flaps 0, 10, and 30 degrees">
        {stalled && <StallStamp />}
        <ResponsiveContainer>
          <LineChart data={merged} margin={{ top: 8, right: 12, left: 0, bottom: 18 }}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.1} />
            <XAxis
              dataKey="alpha"
              type="number"
              domain={[alphaMin, alphaMax]}
              ticks={ticks}
              tickFormatter={(v: number) => `${v}°`}
              stroke="currentColor"
              fontSize={11}
              label={{
                value: t.alphaAxis,
                position: 'insideBottom',
                offset: -12,
                fill: 'currentColor',
                fontSize: 11,
              }}
            />
            <YAxis
              domain={[0, 2.4]}
              ticks={[0, 0.4, 0.8, 1.2, 1.6, 2.0]}
              stroke="currentColor"
              fontSize={11}
              label={{
                value: t.clAxis,
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                fill: 'currentColor',
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15,23,42,0.92)',
                border: 'none',
                borderRadius: 6,
                fontSize: 11,
                color: 'white',
              }}
              labelFormatter={(v: number) => `α = ${Number(v).toFixed(1)}°`}
              formatter={(value: number, name: string) => {
                const m = name.match(/CL_(\d+)/);
                const flap = m ? m[1] : '?';
                return [Number(value).toFixed(2), `flaps ${flap}°`];
              }}
            />
            <ReferenceLine
              y={activeCfg.CLmax}
              stroke={FLAP_STYLES[activeFlaps].color}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              label={{
                value: `CL max = ${activeCfg.CLmax}`,
                position: 'insideTopRight',
                fill: FLAP_STYLES[activeFlaps].color,
                fontSize: 10,
              }}
            />
            {FLAP_SETTINGS.map((f) => {
              const active = f === activeFlaps;
              const style = FLAP_STYLES[f];
              if (!showAllFlapCurves && !active) return null;
              return (
                <Line
                  key={f}
                  type="monotone"
                  dataKey={`CL_${f}`}
                  stroke={style.color}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeDasharray={style.dashArray}
                  strokeOpacity={active ? 1 : 0.3}
                  dot={false}
                  isAnimationActive={false}
                />
              );
            })}
            <ReferenceDot
              x={alpha}
              y={CL}
              r={7}
              fill="var(--c-cg)"
              stroke="var(--bg-elev)"
              strokeWidth={2}
              ifOverflow="discard"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {FLAP_SETTINGS.filter((f) => showAllFlapCurves || f === activeFlaps).map((f) => {
          const active = f === activeFlaps;
          const style = FLAP_STYLES[f];
          return (
            <li
              key={f}
              className={
                'flex items-center gap-2 num ' +
                (active ? '' : 'opacity-50')
              }
            >
              <svg width={28} height={8} aria-hidden="true">
                <line
                  x1={0}
                  y1={4}
                  x2={28}
                  y2={4}
                  stroke={style.color}
                  strokeWidth={2.5}
                  strokeDasharray={style.dashArray}
                />
              </svg>
              <span className="text-fg">flaps {f}°</span>
              <span className="text-fg-mute">({style.styleLabel})</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
