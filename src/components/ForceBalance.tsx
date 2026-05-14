import type { FlightState } from '../physics';
import { WEIGHT_N } from '../physics';

interface Props {
  state: FlightState;
}

function decompose(state: FlightState) {
  const gammaRad = (state.gamma * Math.PI) / 180;
  const thetaRad = (state.theta * Math.PI) / 180;

  const Lx = -state.L * Math.sin(gammaRad);
  const Ly = state.L * Math.cos(gammaRad);
  const Tx = state.thrust * Math.cos(thetaRad);
  const Ty = state.thrust * Math.sin(thetaRad);
  const Dx = -state.D * Math.cos(gammaRad);
  const Dy = -state.D * Math.sin(gammaRad);
  const Wx = 0;
  const Wy = -WEIGHT_N;

  const verticalLift = Ly + Ty;
  const sumX = Lx + Tx + Dx + Wx;
  const sumY = Ly + Ty + Dy + Wy;

  return { Lx, Ly, Tx, Ty, Dx, Dy, Wx, Wy, sumX, sumY, verticalLift };
}

function fmt(n: number): string {
  const rounded = Math.round(n);
  return (rounded > 0 ? '+' : '') + rounded.toLocaleString();
}

export function ForceBalance({ state }: Props) {
  const d = decompose(state);

  const vTone =
    Math.abs(d.sumY) < 100 ? 'balanced' : d.sumY > 0 ? 'up' : 'down';
  const hTone =
    Math.abs(d.sumX) < 100 ? 'balanced' : d.sumX > 0 ? 'forward' : 'back';

  const vText = {
    balanced: 'Balanced — steady altitude',
    up: 'Net UP — accelerating upward (pull-up)',
    down: 'Net DOWN — accelerating downward',
  }[vTone];
  const hText = {
    balanced: 'Balanced — speed steady',
    forward: 'Net FORWARD — accelerating',
    back: 'Net BACK — decelerating',
  }[hTone];

  const vColor = vTone === 'balanced' ? 'var(--c-thrust)' : 'var(--c-drag)';
  const hColor = hTone === 'balanced' ? 'var(--c-thrust)' : 'var(--c-drag)';

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <p className="text-sm text-fg-soft">
        Each force broken into <strong className="text-fg">X (forward)</strong> and{' '}
        <strong className="text-fg">Y (up)</strong>. Steady flight requires both columns to sum to zero.
      </p>

      <div className="overflow-hidden border border-app">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th className="text-left px-3 py-2 meta">Force</th>
              <th className="text-right px-3 py-2 meta">X (forward)</th>
              <th className="text-right px-3 py-2 meta">Y (up)</th>
              <th className="text-right px-3 py-2 meta">|F|</th>
            </tr>
          </thead>
          <tbody className="num">
            <tr className="border-t border-app">
              <td className="px-3 py-2 font-bold" style={{ color: 'var(--c-lift)' }}>Lift</td>
              <td className="text-right px-3 py-2">{fmt(d.Lx)}</td>
              <td className="text-right px-3 py-2">{fmt(d.Ly)}</td>
              <td className="text-right px-3 py-2 text-fg-soft">{Math.round(state.L).toLocaleString()}</td>
            </tr>
            <tr className="border-t border-app">
              <td className="px-3 py-2 font-bold" style={{ color: 'var(--c-thrust)' }}>Thrust</td>
              <td className="text-right px-3 py-2">{fmt(d.Tx)}</td>
              <td className="text-right px-3 py-2">{fmt(d.Ty)}</td>
              <td className="text-right px-3 py-2 text-fg-soft">{Math.round(state.thrust).toLocaleString()}</td>
            </tr>
            <tr className="border-t border-app">
              <td className="px-3 py-2 font-bold" style={{ color: 'var(--c-drag)' }}>Drag</td>
              <td className="text-right px-3 py-2">{fmt(d.Dx)}</td>
              <td className="text-right px-3 py-2">{fmt(d.Dy)}</td>
              <td className="text-right px-3 py-2 text-fg-soft">{Math.round(state.D).toLocaleString()}</td>
            </tr>
            <tr className="border-t border-app">
              <td className="px-3 py-2 font-bold" style={{ color: 'var(--c-weight)' }}>Weight</td>
              <td className="text-right px-3 py-2">{fmt(d.Wx)}</td>
              <td className="text-right px-3 py-2">{fmt(d.Wy)}</td>
              <td className="text-right px-3 py-2 text-fg-soft">{WEIGHT_N.toLocaleString()}</td>
            </tr>
            <tr className="border-t-2" style={{ borderColor: 'var(--text)', background: 'var(--bg-soft)' }}>
              <td className="px-3 py-2 font-bold text-fg">Σ</td>
              <td className="text-right px-3 py-2 font-bold" style={{ color: hColor }}>{fmt(d.sumX)}</td>
              <td className="text-right px-3 py-2 font-bold" style={{ color: vColor }}>{fmt(d.sumY)}</td>
              <td className="text-right px-3 py-2 text-fg-mute text-xs">N</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="px-3 py-2 border-l-[3px]" style={{ borderColor: vColor, background: 'var(--bg)' }}>
          <p className="meta">Vertical</p>
          <p className="mt-1" style={{ color: vColor }}>{vText}</p>
        </div>
        <div className="px-3 py-2 border-l-[3px]" style={{ borderColor: hColor, background: 'var(--bg)' }}>
          <p className="meta">Horizontal</p>
          <p className="mt-1" style={{ color: hColor }}>{hText}</p>
        </div>
      </div>

      <div
        className="px-4 py-3 border-l-4"
        style={{ borderColor: 'var(--c-lift)', background: 'var(--bg)' }}
      >
        <p className="meta" style={{ color: 'var(--c-lift)' }}>Effective vertical lift</p>
        <p className="num text-lg mt-1">
          Lᵧ + Tᵧ ={' '}
          <span className="font-bold" style={{ color: 'var(--c-lift)' }}>
            {fmt(d.verticalLift)} N
          </span>
          <span className="text-fg-soft text-sm ml-2">vs W = {WEIGHT_N.toLocaleString()} N</span>
        </p>
        <p className="text-xs text-fg-soft mt-1">
          What holds the airplane up. At high pitch, thrust starts carrying noticeable weight.
        </p>
      </div>
    </div>
  );
}
