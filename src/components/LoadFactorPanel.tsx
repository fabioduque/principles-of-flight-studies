import { loadFactorForBank, N_LIMIT_POS, N_LIMIT_NEG } from '../physics';

interface Props {
  L: number;
  W: number;
  gamma: number;
  n: number;
  bankDeg: number;
}

export function LoadFactorPanel({ L, W, gamma, n, bankDeg }: Props) {
  // Sample bank angles 0..70°
  const bankSamples = Array.from({ length: 71 }, (_, i) => i);
  const points = bankSamples.map((b) => ({ bank: b, n: loadFactorForBank(b) }));

  // Chart geometry
  const chartW = 320;
  const chartH = 180;
  const xPad = 36;
  const yPadTop = 12;
  const yPadBot = 26;
  const innerW = chartW - xPad - 8;
  const innerH = chartH - yPadTop - yPadBot;
  const maxN = 4.5;
  const xOf = (b: number) => xPad + (b / 70) * innerW;
  const yOf = (val: number) => yPadTop + (1 - val / maxN) * innerH;
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.bank).toFixed(1)} ${yOf(p.n).toFixed(1)}`)
    .join(' ');

  const markers = [
    { bank: 30, n: loadFactorForBank(30) },
    { bank: 45, n: loadFactorForBank(45) },
    { bank: 60, n: loadFactorForBank(60) },
  ];

  return (
    <div
      aria-label="Load factor explainer"
      className="p-5 sm:p-6 space-y-5"
    >
      <header>
        <p className="text-sm text-fg-soft leading-relaxed">
          n is the ratio of total lift to weight — how many g the airframe (and you) feel
          perpendicular to the flight path.
        </p>
      </header>

      <div
        className="px-4 py-3 border-l-4 num text-base space-y-1"
        style={{ borderColor: 'var(--c-cg)', background: 'var(--bg)' }}
      >
        <div>
          n = L / W = {Math.round(L).toLocaleString()} / {Math.round(W).toLocaleString()} ={' '}
          <span className="font-bold text-lg" style={{ color: 'var(--c-cg)' }}>{n.toFixed(2)}</span>
        </div>
        {bankDeg > 0.5 && (
          <div className="text-sm text-fg-soft">
            = cos(γ) / cos(φ) = cos({gamma.toFixed(1)}°) / cos({bankDeg.toFixed(0)}°) ={' '}
            <span className="font-bold" style={{ color: 'var(--c-cg)' }}>
              {(Math.cos((gamma * Math.PI) / 180) / Math.cos((bankDeg * Math.PI) / 180)).toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {bankDeg > 0.5 && Math.abs(gamma) > 0.5 && (
        <div className="text-xs px-3 py-2 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--text)' }}>
          <strong>Heads-up:</strong> the textbook formula <span className="num">n = 1 / cos(φ)</span> only holds for a{' '}
          <em>level</em> turn (γ = 0). Here γ = {gamma.toFixed(1)}°, so the wing carries
          slightly {gamma < 0 ? 'less' : 'more'} than 1 / cos(φ). Add throttle until γ → 0 and n will lock to{' '}
          <span className="font-bold num">{(1 / Math.cos((bankDeg * Math.PI) / 180)).toFixed(2)}</span> exactly.
        </div>
      )}

      <p className="text-xs text-fg-soft">
        In steady wings-level climbs or descents (no bank), n ≈ cos(γ) ≈ 1.0 — n is measured
        perpendicular to the flight path, and for small γ, cos γ ≈ 1.
      </p>

      <div>
        <p className="meta mb-2">Fig 7.1 — Level turn: n = 1 / cos(bank)</p>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-auto grid-bg border border-app"
          style={{ color: 'var(--text)' }}
          role="img"
          aria-label="Load factor as a function of bank angle in a level turn. n equals 1 over cosine of bank."
        >
          {/* axes */}
          <line
            x1={xPad}
            y1={yPadTop}
            x2={xPad}
            y2={chartH - yPadBot}
            stroke="currentColor"
            strokeOpacity={0.4}
          />
          <line
            x1={xPad}
            y1={chartH - yPadBot}
            x2={chartW - 4}
            y2={chartH - yPadBot}
            stroke="currentColor"
            strokeOpacity={0.4}
          />

          {/* gridlines at integer n */}
          {[1, 2, 3, 4].map((v) => (
            <g key={v}>
              <line
                x1={xPad}
                y1={yOf(v)}
                x2={chartW - 4}
                y2={yOf(v)}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
              <text
                x={xPad - 4}
                y={yOf(v) + 3}
                textAnchor="end"
                fontSize={9}
                fill="currentColor"
              >
                {v}
              </text>
            </g>
          ))}
          {/* x-ticks */}
          {[0, 15, 30, 45, 60].map((b) => (
            <g key={b}>
              <line
                x1={xOf(b)}
                y1={chartH - yPadBot}
                x2={xOf(b)}
                y2={chartH - yPadBot + 3}
                stroke="currentColor"
                strokeOpacity={0.4}
              />
              <text
                x={xOf(b)}
                y={chartH - yPadBot + 13}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
              >
                {b}°
              </text>
            </g>
          ))}

          {/* curve */}
          <path d={pathD} fill="none" stroke="var(--c-lift)" strokeWidth={2.5} />

          {/* limit line */}
          <line
            x1={xPad}
            y1={yOf(N_LIMIT_POS)}
            x2={chartW - 4}
            y2={yOf(N_LIMIT_POS)}
            stroke="var(--c-weight)"
            strokeDasharray="4 3"
            strokeWidth={1.4}
          />
          <text
            x={chartW - 6}
            y={yOf(N_LIMIT_POS) - 3}
            textAnchor="end"
            fontSize={10}
            fontWeight={700}
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--c-weight)"
          >
            +{N_LIMIT_POS} g limit
          </text>

          {/* markers at 30/45/60 */}
          {markers.map((m) => (
            <g key={m.bank}>
              <circle cx={xOf(m.bank)} cy={yOf(m.n)} r={4} fill="var(--c-lift)" />
              <text
                x={xOf(m.bank) + 7}
                y={yOf(m.n) - 5}
                fontSize={10}
                fontFamily="'JetBrains Mono', monospace"
                fill="currentColor"
              >
                {m.bank}° → n = {m.n.toFixed(2)}
              </text>
            </g>
          ))}

          {/* current-state marker (where the airplane is right now) */}
          {bankDeg >= 0 && bankDeg <= 70 && (
            <g>
              <line
                x1={xOf(bankDeg)}
                y1={yPadTop}
                x2={xOf(bankDeg)}
                y2={chartH - yPadBot}
                stroke="var(--c-cg)"
                strokeWidth={1.4}
                strokeDasharray="3 3"
                opacity={0.8}
              />
              <circle cx={xOf(bankDeg)} cy={yOf(loadFactorForBank(bankDeg))} r={5} fill="var(--c-cg)" />
            </g>
          )}
        </svg>
        <p className="meta mt-2">
          C152 normal-category limits ·
          <strong className="text-fg ml-1.5" style={{ color: 'var(--c-weight)' }}>+{N_LIMIT_POS} g</strong> /
          <strong className="text-fg ml-1.5" style={{ color: 'var(--c-weight)' }}>{N_LIMIT_NEG} g</strong>
        </p>
      </div>
    </div>
  );
}
