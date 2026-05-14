// Front-view (looking from the tail forward) of the C152, showing the wings
// banked by φ. The lift vector tilts with the wings; weight stays vertical.
// The vertical component of lift (L·cos φ) must support W; the horizontal
// component (L·sin φ) provides the centripetal force that turns the airplane.

import type { FlightState } from '../physics';
import { WEIGHT_N } from '../physics';

interface Props {
  state: FlightState;
}

const COLOR_LIFT = 'var(--c-lift)';
const COLOR_WEIGHT = 'var(--c-weight)';
const COLOR_COMP = 'var(--c-magenta)';

export function BankView({ state }: Props) {
  const phi = state.bankDeg;
  const phiRad = (phi * Math.PI) / 180;
  const n = state.L / WEIGHT_N;

  // Pixel scaling: weight = 100 px (sqrt scale to match the side view).
  const REF = 90;
  const lengthFor = (F: number) =>
    Math.min(Math.sqrt(Math.max(0, F) / WEIGHT_N) * REF, 220);

  const Lpx = lengthFor(state.L);
  const Wpx = lengthFor(WEIGHT_N);

  // Total lift in screen coords (up = -Y), tilted to the LEFT for positive bank
  // (banking right turns the lift vector to the right in side view, but a
  // "looking forward" view means we see the lift tilt to OUR left if pilot
  // banks right). We pick right-bank visualisation: pilot's right wing drops,
  // lift vector goes to +x direction at top → tilted to the right.
  const Lx = Lpx * Math.sin(phiRad);
  const Ly = -Lpx * Math.cos(phiRad);

  // Vertical and horizontal components for the decomposition lines.
  const Lvert_screen = Ly; // vertical (up) component = L·cos φ
  const Lhoriz_screen = Lx; // horizontal component = L·sin φ

  return (
    <svg
      viewBox="-220 -200 440 360"
      className="w-full h-full"
      role="img"
      aria-label={`Front view, banked ${phi.toFixed(0)} degrees, load factor ${n.toFixed(2)}`}
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
      </defs>

      {/* horizon */}
      <line
        x1={-200}
        y1={0}
        x2={200}
        y2={0}
        stroke="var(--text-mute)"
        strokeDasharray="6 6"
        strokeWidth={0.9}
      />

      {/* aircraft front-view silhouette, rotated by bank angle */}
      <g transform={`rotate(${phi})`} stroke="currentColor" strokeLinejoin="round" fill="none" strokeWidth={1.8}>
        {/* wings — long thin bar */}
        <rect x={-110} y={-3} width={220} height={6} rx={3} />
        {/* wing-tip dihedral marks (subtle uptick on each end) */}
        <line x1={-110} y1={-3} x2={-118} y2={-7} />
        <line x1={110} y1={-3} x2={118} y2={-7} />

        {/* fuselage — slightly rounded rectangle in centre */}
        <rect x={-12} y={-22} width={24} height={28} rx={6} />
        {/* canopy hint */}
        <rect x={-7} y={-19} width={14} height={9} rx={3} fill="var(--c-lift)" fillOpacity={0.35} strokeWidth={0.9} />

        {/* vertical fin sticking up behind the canopy */}
        <path d="M -3 -32 L 0 -46 L 3 -32 Z" />

        {/* horizontal stab seen edge-on at the back — small bar */}
        <line x1={-22} y1={6} x2={22} y2={6} strokeWidth={1.4} />

        {/* port-wing red nav light, starboard-wing green */}
        <circle cx={-110} cy={0} r={2.6} fill="var(--c-weight)" stroke="none" />
        <circle cx={110} cy={0} r={2.6} fill="var(--c-thrust)" stroke="none" />
      </g>

      {/* lift vector (tilted with the wings) */}
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

      {/* weight (always down) */}
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

      {/* dashed projection: L·cos φ (vertical component) */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={Lvert_screen}
        stroke={COLOR_COMP}
        strokeWidth={1.6}
        strokeDasharray="4 3"
        opacity={0.8}
      />
      {/* dashed projection: L·sin φ (horizontal component) */}
      <line
        x1={0}
        y1={0}
        x2={Lhoriz_screen}
        y2={0}
        stroke={COLOR_COMP}
        strokeWidth={1.6}
        strokeDasharray="4 3"
        opacity={0.8}
      />
      {/* small dashed "corner" connector */}
      <line
        x1={Lx}
        y1={Ly}
        x2={Lx}
        y2={0}
        stroke={COLOR_COMP}
        strokeWidth={0.6}
        strokeDasharray="2 3"
        opacity={0.5}
      />
      <line
        x1={Lx}
        y1={Ly}
        x2={0}
        y2={Ly}
        stroke={COLOR_COMP}
        strokeWidth={0.6}
        strokeDasharray="2 3"
        opacity={0.5}
      />

      {/* labels */}
      <text
        x={Lx + (Lx >= 0 ? 6 : -6)}
        y={Ly - 6}
        fill={COLOR_LIFT}
        fontSize={11}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui"
        textAnchor={Lx >= 0 ? 'start' : 'end'}
      >
        L = {Math.round(state.L).toLocaleString()} N
      </text>
      <text
        x={6}
        y={Wpx + 14}
        fill={COLOR_WEIGHT}
        fontSize={11}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui"
      >
        W = {WEIGHT_N.toLocaleString()} N
      </text>
      <text
        x={-4}
        y={Lvert_screen / 2 + 4}
        fill={COLOR_COMP}
        fontSize={10}
        textAnchor="end"
        fontFamily="ui-sans-serif, system-ui"
      >
        L cos φ = {Math.round(state.L * Math.cos(phiRad)).toLocaleString()} N
      </text>
      <text
        x={Lhoriz_screen / 2}
        y={-6}
        fill={COLOR_COMP}
        fontSize={10}
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
      >
        L sin φ = {Math.round(state.L * Math.sin(phiRad)).toLocaleString()} N
      </text>

      {/* bank-angle label */}
      <text
        x={-210}
        y={-170}
        fill="var(--text)"
        fontSize={13}
        fontWeight={600}
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
      >
        Bank φ = {phi.toFixed(0)}°
      </text>
      <text
        x={-210}
        y={-150}
        fill="var(--c-cg)"
        fontSize={17}
        fontWeight={700}
        fontFamily="'JetBrains Mono', monospace"
      >
        n = {n.toFixed(2)} g
      </text>
    </svg>
  );
}
