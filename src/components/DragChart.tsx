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
import { sampleDragCurve, dragAtTrim, minDragSpeed, bestEnduranceSpeed } from '../physics';
import { StallStamp } from './StallStamp';
import { useI18n } from '../i18n';

interface Props {
  flaps: Flaps;
  V_kts: number;
  stalled?: boolean;
}

export function DragChart({ flaps, V_kts, stalled }: Props) {
  const { t } = useI18n();
  // Sample the trim drag curve up to at least 130 kt, but extend if the
  // current point exceeds that (e.g. unloaded descent past Vne) so the dot
  // stays on the curve instead of detaching far off-chart.
  const vMaxSample = Math.max(130, Math.ceil(V_kts) + 10);
  const data = sampleDragCurve(flaps, 35, vMaxSample, 1);
  const here = dragAtTrim(V_kts, flaps);

  // VMD — speed for minimum total drag, i.e. the trough of the curve and
  // the point of maximum L/D.
  const vmd = minDragSpeed(flaps);
  const atVmd = dragAtTrim(vmd, flaps);
  const vmdOnCurve = vmd >= 35 && vmd <= vMaxSample;

  // VE — best-endurance speed (minimum power, not minimum drag), sits on
  // the curve above and to the left of the VMD trough.
  const ve = bestEnduranceSpeed(flaps);
  const atVe = dragAtTrim(ve, flaps);
  const veOnCurve = ve >= 35 && ve <= vMaxSample;

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
              label={{ value: t.airspeedAxis, position: 'insideBottom', offset: -14, fill: 'currentColor', fontSize: 11 }}
            />
            <YAxis
              stroke="currentColor"
              fontSize={11}
              tickFormatter={(v: number) => `${Math.round(v)}`}
              label={{ value: t.dragAxis, angle: -90, position: 'insideLeft', offset: 14, fill: 'currentColor', fontSize: 11 }}
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
            {/* VMD marker — the answer to "which point is min drag / best L/D?" */}
            {vmdOnCurve && (
              <ReferenceDot
                x={atVmd.V_kts}
                y={atVmd.total}
                r={5.5}
                fill="var(--accent)"
                stroke="var(--bg-elev)"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: `${t.vmdLabel} ${vmd.toFixed(0)} kt · ${t.vmdHint}`,
                  position: 'top',
                  fill: 'var(--accent)',
                  fontSize: 11,
                  fontWeight: 700,
                  offset: 8,
                }}
              />
            )}
            {/* VE marker — best endurance (min power, not min drag). */}
            {veOnCurve && (
              <ReferenceDot
                x={atVe.V_kts}
                y={atVe.total}
                r={5.5}
                fill="var(--c-thrust)"
                stroke="var(--bg-elev)"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: `${t.enduranceLabel} ${ve.toFixed(0)} kt · ${t.enduranceHint}`,
                  position: 'top',
                  fill: 'var(--c-thrust)',
                  fontSize: 11,
                  fontWeight: 700,
                  offset: 8,
                }}
              />
            )}
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

      {/* ── Pedagogical explanation panel ──
          Explicit answer to: "which point on the drag curve is the
          minimum-drag speed?" — links the curve's trough to VMD / L-D max. */}
      <div
        className="mt-4 px-3 py-2.5 border-l-[3px]"
        style={{ borderColor: 'var(--accent)', background: 'var(--bg)' }}
      >
        <div
          className="meta mb-1.5"
          style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--accent)' }}
        >
          {t.pedagogyVmdTitle}
        </div>
        <p className="text-[11.5px] text-fg-soft leading-relaxed">
          {t.pedagogyVmdL1}{' '}
          {t.pedagogyVmdL2}{' '}
          <span
            className="inline-block num"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              padding: '1px 6px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--rule)',
              color: 'var(--text)',
              margin: '0 2px',
              fontSize: 11,
            }}
          >
            {t.pedagogyVmdFormula}
          </span>
          <strong className="text-fg"> {t.pedagogyVmdL3}</strong>{' '}
          {t.pedagogyVmdL4}
        </p>

        <p className="text-[11.5px] text-fg-soft leading-relaxed mt-2 pt-2 border-t" style={{ borderColor: 'var(--rule)' }}>
          {t.pedagogyEnduranceL1}{' '}
          <span
            className="inline-block num"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              padding: '1px 6px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--rule)',
              color: 'var(--text)',
              margin: '0 2px',
              fontSize: 11,
            }}
          >
            {t.pedagogyEnduranceFormula}
          </span>
          <strong className="text-fg"> {t.pedagogyEnduranceL2}</strong>{' '}
          {t.pedagogyEnduranceL3}
        </p>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs num">
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-drag)' }} />{t.parasiteLegend}</li>
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-magenta)' }} />{t.inducedLegend}</li>
        <li className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: 'var(--c-lift)' }} />{t.totalLegend}</li>
        <li className="ml-auto text-fg-soft">
          {onCurve
            ? `${t.totalDragAtTrim} · ${Math.round(here.total)} N · ${V_kts.toFixed(0)} kt`
            : `${t.offTrim} · ${V_kts.toFixed(0)} kt — ${t.outsideTrimBand}`}
        </li>
      </ul>
    </div>
  );
}
