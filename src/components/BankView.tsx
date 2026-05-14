// Aft view (looking from behind the airplane toward the nose) — drafting style.
// The C152 is drawn anatomically: high wing seated *above* the fuselage, with
// the cabin hanging below the wing centerline; V-strut from lower fuselage to
// wing underside on each side; prop disk visible as a faint translucent circle;
// vertical fin and horizontal stab behind. Bank rotates the airframe AND the
// lift vector; weight stays vertical. The L·cosφ / L·sinφ decomposition shows
// the perpendicular force balance and the centripetal component that turns the
// airplane. A curved turn-arrow indicates the direction of acceleration.

import type { FlightState } from '../physics';
import { WEIGHT_N } from '../physics';
import { useI18n } from '../i18n';

interface Props {
  state: FlightState;
}

const COLOR_LIFT = 'var(--c-lift)';
const COLOR_WEIGHT = 'var(--c-weight)';
const COLOR_COMP = 'var(--c-magenta)';
const COLOR_HORIZON = 'var(--text-mute)';

export function BankView({ state }: Props) {
  const { t } = useI18n();
  const phi = state.bankDeg;
  const phiRad = (phi * Math.PI) / 180;
  const n = state.L / WEIGHT_N;

  const REF = 90;
  const lengthFor = (F: number) =>
    Math.min(Math.sqrt(Math.max(0, F) / WEIGHT_N) * REF, 220);

  const Lpx = lengthFor(state.L);
  const Wpx = lengthFor(WEIGHT_N);

  // Right bank visualization: bank-right tilts the lift vector to the right.
  const Lx = Lpx * Math.sin(phiRad);
  const Ly = -Lpx * Math.cos(phiRad);

  // Centripetal turn-arrow: arc on whichever side the lift is tilting toward,
  // showing the direction the airplane is accelerating.
  const turnSide = phi >= 0 ? 1 : -1;
  const showTurn = Math.abs(phi) > 4;

  return (
    <svg
      viewBox="-220 -200 440 360"
      className="w-full h-full"
      role="img"
      aria-label={`Rear view of Cessna 152, banked ${phi.toFixed(0)} degrees, load factor ${n.toFixed(2)}`}
    >
      <defs>
        <marker id="bv-arrow-L" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLOR_LIFT} />
        </marker>
        <marker id="bv-arrow-W" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLOR_WEIGHT} />
        </marker>
        <marker id="bv-arrow-C" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLOR_COMP} />
        </marker>
        <marker id="bv-arrow-turn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--accent)" />
        </marker>
      </defs>

      {/* ── Horizon datum (drafting dashed rule + small cardinal ticks) ── */}
      <line
        x1={-210}
        y1={0}
        x2={210}
        y2={0}
        stroke={COLOR_HORIZON}
        strokeDasharray="6 4"
        strokeWidth={0.9}
      />
      {[-180, -120, -60, 60, 120, 180].map((x) => (
        <line key={x} x1={x} y1={-2} x2={x} y2={2} stroke={COLOR_HORIZON} strokeWidth={0.6} opacity={0.7} />
      ))}
      <text x={-208} y={-5} fill={COLOR_HORIZON} fontSize={8.5} fontFamily="'IBM Plex Sans Condensed', system-ui" letterSpacing="0.1em">
        {t.horizon}
      </text>

      {/* ── Airframe (rotates with bank around CG = origin) ── */}
      <g transform={`rotate(${phi})`}>
        {/* Prop disk — behind everything */}
        <circle cx={0} cy={-3} r={64} fill="currentColor" opacity={0.04} stroke="none" />
        <circle cx={0} cy={-3} r={64} fill="none" stroke="currentColor" strokeWidth={0.7} strokeDasharray="1 3" opacity={0.45} />

        {/* Horizontal stab (behind fuselage in 3D, drawn first) */}
        <g stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" fill="currentColor">
          <path d="M -56 6 L 56 6 L 56 12 L -56 12 Z" fillOpacity={0.05} />
        </g>

        {/* Vertical fin — narrow, sticking up behind the cabin */}
        <path d="M -5 -8 L -3 -42 L 3 -42 L 5 -8 Z" fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />

        {/* Fuselage cross-section — rounded top, flat bottom (rear projection) */}
        <path
          d="M -13 -18
             C -13 -22, -8 -25, 0 -25
             C 8 -25, 13 -22, 13 -18
             L 13 14
             C 13 18, 8 19, 0 19
             C -8 19, -13 18, -13 14
             Z"
          fill="var(--bg-elev)"
          stroke="currentColor"
          strokeWidth={1.4}
        />

        {/* Cabin glass — small window slits each side */}
        <path d="M -11 -21 L -11 -14 L 11 -14 L 11 -21 Z" fill="#9bd5ff" fillOpacity={0.30} stroke="currentColor" strokeWidth={0.9} />
        <line x1={0} y1={-21} x2={0} y2={-14} stroke="currentColor" strokeWidth={0.7} opacity={0.7} />

        {/* High wing — long thin slab sitting on top of cabin */}
        <path d="M -116 -27 L 116 -27 L 116 -22 L -116 -22 Z" fill="currentColor" fillOpacity={0.10} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />

        {/* Subtle dihedral hint — wingtip uptick (real C152 dihedral is ~1.5°) */}
        <line x1={116} y1={-22} x2={120} y2={-23} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <line x1={-116} y1={-22} x2={-120} y2={-23} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />

        {/* V-strut — one each side, fuselage bottom corner to wing underside */}
        <line x1={-10} y1={16} x2={-46} y2={-22} stroke="currentColor" strokeWidth={1.3} />
        <line x1={10}  y1={16} x2={46}  y2={-22} stroke="currentColor" strokeWidth={1.3} />
        {/* Strut attachment fittings — small drafting dots */}
        <circle cx={-10} cy={16}  r={1.2} fill="var(--bg-elev)" stroke="currentColor" strokeWidth={0.7} />
        <circle cx={10}  cy={16}  r={1.2} fill="var(--bg-elev)" stroke="currentColor" strokeWidth={0.7} />
        <circle cx={-46} cy={-22} r={1.2} fill="var(--bg-elev)" stroke="currentColor" strokeWidth={0.7} />
        <circle cx={46}  cy={-22} r={1.2} fill="var(--bg-elev)" stroke="currentColor" strokeWidth={0.7} />

        {/* Wingtip nav lights — port red, starboard green */}
        <circle cx={-118} cy={-24.5} r={2.4} fill="var(--c-weight)" stroke="none" />
        <circle cx={ 118} cy={-24.5} r={2.4} fill="var(--c-thrust)" stroke="none" />
      </g>

      {/* ── Force vectors (do NOT rotate with airframe — only L tilts) ── */}

      {/* Lift vector (tilts with the wings) */}
      <line
        x1={0}
        y1={0}
        x2={Lx}
        y2={Ly}
        stroke={COLOR_LIFT}
        strokeWidth={2.6}
        strokeLinecap="round"
        markerEnd="url(#bv-arrow-L)"
      />

      {/* Weight (always down) */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={Wpx}
        stroke={COLOR_WEIGHT}
        strokeWidth={2.6}
        strokeLinecap="round"
        markerEnd="url(#bv-arrow-W)"
      />

      {/* L·cosφ vertical projection */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={Ly}
        stroke={COLOR_COMP}
        strokeWidth={1.4}
        strokeDasharray="5 3"
        opacity={0.85}
      />
      {/* L·sinφ horizontal projection */}
      <line
        x1={0}
        y1={0}
        x2={Lx}
        y2={0}
        stroke={COLOR_COMP}
        strokeWidth={1.4}
        strokeDasharray="5 3"
        opacity={0.85}
      />
      {/* Parallelogram corner closure */}
      <line x1={Lx} y1={Ly} x2={Lx} y2={0} stroke={COLOR_COMP} strokeWidth={0.6} strokeDasharray="2 3" opacity={0.5} />
      <line x1={Lx} y1={Ly} x2={0}  y2={Ly} stroke={COLOR_COMP} strokeWidth={0.6} strokeDasharray="2 3" opacity={0.5} />

      {/* ── Turn-direction arrow — curved arc showing centripetal acceleration ── */}
      {showTurn && (
        <g>
          <path
            d={`M ${turnSide * 64} 36
                A 36 18 0 0 ${turnSide > 0 ? 1 : 0} ${turnSide * 132} 36`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.6}
            strokeDasharray="4 2"
            markerEnd="url(#bv-arrow-turn)"
            opacity={0.9}
          />
          <text
            x={turnSide * 96}
            y={56}
            fill="var(--accent)"
            fontSize={9.5}
            fontFamily="'IBM Plex Sans Condensed', system-ui"
            fontWeight={600}
            letterSpacing="0.08em"
            textAnchor="middle"
          >
            {t.turn}
          </text>
        </g>
      )}

      {/* ── Drafting tag labels — paper bg, ink text, color swatch ── */}
      {/* L tag */}
      <g transform={`translate(${Lx + (Lx >= 0 ? 8 : -112)}, ${Ly - 12})`}>
        <rect x={0} y={0} width={104} height={26} fill="var(--bg-elev)" stroke="var(--rule)" strokeWidth={0.8} />
        <rect x={0} y={0} width={5} height={26} fill={COLOR_LIFT} />
        <text x={11} y={11} fill={COLOR_LIFT} fontSize={13} fontWeight={700} fontFamily="'Bricolage Grotesque', system-ui, sans-serif">L</text>
        <text x={11} y={22} fill="var(--text)" fontSize={11} fontFamily="'IBM Plex Mono', monospace" fontWeight={500}>
          {Math.round(state.L).toLocaleString()} N
        </text>
      </g>

      {/* W tag */}
      <g transform={`translate(8, ${Wpx + 4})`}>
        <rect x={0} y={0} width={104} height={26} fill="var(--bg-elev)" stroke="var(--rule)" strokeWidth={0.8} />
        <rect x={0} y={0} width={5} height={26} fill={COLOR_WEIGHT} />
        <text x={11} y={11} fill={COLOR_WEIGHT} fontSize={13} fontWeight={700} fontFamily="'Bricolage Grotesque', system-ui, sans-serif">W</text>
        <text x={11} y={22} fill="var(--text)" fontSize={11} fontFamily="'IBM Plex Mono', monospace" fontWeight={500}>
          {WEIGHT_N.toLocaleString()} N
        </text>
      </g>

      {/* L·cos φ tag — sits on the vertical projection */}
      <g transform={`translate(${-118}, ${Ly / 2 - 11})`}>
        <rect x={0} y={0} width={108} height={22} fill="var(--bg-elev)" stroke="var(--rule)" strokeWidth={0.7} />
        <rect x={0} y={0} width={4} height={22} fill={COLOR_COMP} />
        <text x={9} y={15} fill="var(--text)" fontSize={11} fontFamily="'IBM Plex Mono', monospace" fontWeight={500}>
          <tspan fill={COLOR_COMP} fontWeight={700}>L cos φ</tspan>
          <tspan> {Math.round(state.L * Math.cos(phiRad)).toLocaleString()}</tspan>
        </text>
      </g>

      {/* L·sin φ tag — only when bank > 0 */}
      {Math.abs(Lx) > 14 && (
        <g transform={`translate(${Lx / 2 - 54}, ${-30})`}>
          <rect x={0} y={0} width={108} height={22} fill="var(--bg-elev)" stroke="var(--rule)" strokeWidth={0.7} />
          <rect x={0} y={0} width={4} height={22} fill={COLOR_COMP} />
          <text x={9} y={15} fill="var(--text)" fontSize={11} fontFamily="'IBM Plex Mono', monospace" fontWeight={500}>
            <tspan fill={COLOR_COMP} fontWeight={700}>L sin φ</tspan>
            <tspan> {Math.round(Math.abs(state.L * Math.sin(phiRad))).toLocaleString()}</tspan>
          </text>
        </g>
      )}

      {/* Stalled stamp — top-right */}
      {state.status === 'stalled' && (
        <g>
          <rect
            x={80}
            y={-195}
            width={130}
            height={26}
            fill="var(--c-weight)"
            stroke="var(--bg-elev)"
            strokeWidth={1.5}
          >
            <animate attributeName="opacity" values="1;0.5;1" dur="1.4s" repeatCount="indefinite" />
          </rect>
          <text
            x={145}
            y={-177}
            textAnchor="middle"
            fill="var(--bg-elev)"
            fontSize={13}
            fontFamily="'IBM Plex Sans Condensed', system-ui"
            fontWeight={700}
            letterSpacing="0.22em"
          >
            ⚠ {t.stalledStamp}
          </text>
        </g>
      )}

    </svg>
  );
}
