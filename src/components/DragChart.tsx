import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import type { Flaps } from '../physics';
import { sampleDragCurve, dragAtTrim } from '../physics';
import { StallStamp } from './StallStamp';

interface Props {
  flaps: Flaps;
  V_kts: number;
  stalled?: boolean;
}

export function DragChart({ flaps, V_kts, stalled }: Props) {
  // Sample the trim drag curve up to at least 130 kt, but extend if the
  // current point exceeds that (e.g. unloaded descent past Vne) so the dot
  // stays on the curve instead of detaching far off-chart.
  const vMaxSample = Math.max(130, Math.ceil(V_kts) + 10);
  const data = sampleDragCurve(flaps, 35, vMaxSample, 1);
  const here = dragAtTrim(V_kts, flaps);

  // X-axis ticks: choose dynamically so they remain evenly spaced even when
  // the chart stretches to accommodate a high-speed sample.
  const tickStep = vMaxSample > 160 ? 30 : 20;
  const ticks: number[] = [];
  for (let v = 40; v <= vMaxSample; v += tickStep) ticks.push(v);

  // Y-axis cap — clamp far above the current point but no more, so high
  // outlier values don't squash the curve.
  const yMaxHint = Math.ceil(Math.max(here.total * 1.15, 1200) / 200) * 200;

  // Show the trim-V dot only when it lies on the sampled grid (it's a
  // *trim* drag plot; outside the practical range the dot is misleading).
  const onCurve = V_kts >= 35 && V_kts <= vMaxSample;

  return (
    <div className="p-3 sm:p-4">
      <div className="h-[260px] grid-bg border border-app relative" role="img" aria-label="Parasite, induced, and total drag versus airspeed">
        {stalled && <StallStamp />}
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 18, left: 8, bottom: 22 }}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.08} />
            <XAxis
              dataKey="V"
              type="number"
              domain={[35, vMaxSample]}
              ticks={ticks}
              tickFormatter={(v: number) => `${v} kt`}
              stroke="currentColor"
              fontSize={11}
              label={{ value: 'Airspeed (kt)', position: 'insideBottom', offset: -14, fill: 'currentColor', fontSize: 11 }}
            />
            <YAxis
              stroke="currentColor"
              fontSize={11}
              tickFormatter={(v: number) => `${Math.round(v)}`}
              label={{ value: 'Drag (N)', angle: -90, position: 'insideLeft', offset: 14, fill: 'currentColor', fontSize: 11 }}
              domain={[0, yMaxHint]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--text)',
              }}
              labelFormatter={(v: number) => `V = ${v} kt`}
              formatter={(value: number, name: string) => [`${Math.round(value)} N`, name]}
            />
            <Line type="monotone" dataKey="parasite" name="Parasite" stroke="var(--c-drag)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="induced" name="Induced" stroke="var(--c-magenta)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="total" name="Total" stroke="var(--c-lift)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            {onCurve && (
              <ReferenceDot
                x={here.V_kts}
                y={here.total}
                r={6}
                fill="var(--c-cg)"
                stroke="var(--bg-elev)"
                strokeWidth={2}
                ifOverflow="discard"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs num">
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-drag)' }} />parasite ∝ V²</li>
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-magenta)' }} />induced ∝ 1/V²</li>
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-lift)' }} />total</li>
        <li className="ml-auto text-fg-soft">
          {onCurve
            ? `Total drag at trim · ${Math.round(here.total)} N at ${V_kts.toFixed(0)} kt`
            : `Off-trim · ${V_kts.toFixed(0)} kt outside steady-trim band`}
        </li>
      </ul>
    </div>
  );
}
