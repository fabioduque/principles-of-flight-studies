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

interface Props {
  flaps: Flaps;
  V_kts: number;
}

export function DragChart({ flaps, V_kts }: Props) {
  const data = sampleDragCurve(flaps);
  const here = dragAtTrim(V_kts, flaps);

  return (
    <div className="p-3 sm:p-4">
      <div className="h-[260px] grid-bg border border-app" role="img" aria-label="Parasite, induced, and total drag versus airspeed">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 18, left: 8, bottom: 22 }}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.08} />
            <XAxis
              dataKey="V"
              type="number"
              domain={[35, 130]}
              ticks={[40, 60, 80, 100, 120]}
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
              domain={[0, 'auto']}
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
            <ReferenceDot
              x={here.V_kts}
              y={here.total}
              r={6}
              fill="var(--c-cg)"
              stroke="var(--bg-elev)"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs num">
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-drag)' }} />parasite ∝ V²</li>
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-magenta)' }} />induced ∝ 1/V²</li>
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-lift)' }} />total</li>
        <li className="ml-auto text-fg-soft">here · {Math.round(here.total)} N at {V_kts.toFixed(0)} kt</li>
      </ul>
    </div>
  );
}
