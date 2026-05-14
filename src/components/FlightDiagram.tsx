import { motion } from 'framer-motion';
import type { FlightState } from '../physics';
import { WEIGHT_N } from '../physics';
import { AircraftSilhouette } from './AircraftSilhouette';

interface Props {
  state: FlightState;
}

// Force magnitude → pixel length scaling.
//
// We use square-root scaling so that:
//   - small forces (cruise thrust ~700 N) are still readable as short arrows;
//   - the lift arrow grows visibly from trim (n=1) all the way to CL_max
//     without saturating, and then shrinks again past stall.
// Reference: weight (W = 7428 N) → 90 px. At V=95 kt, CL_max ≈ 1.5 gives
// L ≈ 4.4·W → arrow ≈ 189 px. A hard cap of 220 px protects against extreme
// V × CL_max combinations (e.g. V=130 kt at α=16°) without affecting the
// normal exploration range at typical airspeeds.
const REF_ARROW_PX = 90;
const MAX_ARROW_PX = 220;
const LABEL_MIN_DIST = 145;

const rad = (deg: number) => (deg * Math.PI) / 180;

interface Vec {
  x: number;
  y: number;
}

function scaleForce(magnitudeN: number, dir: Vec): Vec {
  const ratio = Math.sqrt(Math.max(0, magnitudeN) / WEIGHT_N);
  const lengthPx = Math.min(ratio * REF_ARROW_PX, MAX_ARROW_PX);
  return { x: dir.x * lengthPx, y: dir.y * lengthPx };
}

// Place a label at LABEL_MIN_DIST along the arrow direction, plus an optional
// perpendicular offset (in px, measured CW from the arrow direction in screen).
// If the arrow tip is already past LABEL_MIN_DIST, the label sits a bit past it.
function labelPosition(end: Vec, perp: number): Vec {
  const len = Math.hypot(end.x, end.y) || 1;
  const ux = end.x / len;
  const uy = end.y / len;
  // CW perpendicular unit (screen): (-uy, ux) rotated... we'll use (uy, -ux)
  const px = uy;
  const py = -ux;
  const along = Math.max(len + 22, LABEL_MIN_DIST);
  return { x: along * ux + perp * px, y: along * uy + perp * py };
}

interface ForceArrowProps {
  end: Vec;
  labelAt: Vec;
  color: string;
  label: string;
  value: string;
  ariaLabel: string;
}

function ForceArrow({ end, labelAt, color, label, value, ariaLabel }: ForceArrowProps) {
  return (
    <g aria-label={ariaLabel}>
      {/* main arrow */}
      <motion.line
        x1={0}
        y1={0}
        initial={false}
        animate={{ x2: end.x, y2: end.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        markerEnd={`url(#arrow-${label})`}
      />
      {/* dashed leader line from arrow tip to the label */}
      <motion.line
        initial={false}
        animate={{ x1: end.x, y1: end.y, x2: labelAt.x, y2: labelAt.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        stroke={color}
        strokeWidth={0.8}
        strokeDasharray="2 3"
        opacity={0.55}
      />
      {/* label pill */}
      <motion.g
        initial={false}
        animate={{ x: labelAt.x, y: labelAt.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      >
        <rect
          x={-26}
          y={-14}
          width={78}
          height={28}
          rx={0}
          fill="var(--bg-elev)"
          stroke={color}
          strokeWidth={1.2}
        />
        <text
          x={-21}
          y={-3}
          fill={color}
          fontSize={12}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui"
        >
          {label}
        </text>
        <text
          x={-21}
          y={9}
          fill={color}
          fontSize={10}
          fontFamily="ui-monospace, monospace"
        >
          {value}
        </text>
      </motion.g>
    </g>
  );
}

// Punchy palette pulled from the page's CSS variables.
const COLOR_LIFT = 'var(--c-lift)';
const COLOR_WEIGHT = 'var(--c-weight)';
const COLOR_THRUST = 'var(--c-thrust)';
const COLOR_DRAG = 'var(--c-drag)';
const COLOR_HORIZON = 'var(--text-mute)';
const COLOR_FLIGHTPATH = 'var(--c-magenta)';
const COLOR_CHORD = 'var(--text-soft)';
const COLOR_CG = 'var(--c-cg)';

export function FlightDiagram({ state }: Props) {
  const { alpha, theta, gamma, L, D, thrust, V_kts } = state;

  // Body axis (thrust direction) in screen coords
  const bodyDir: Vec = {
    x: Math.cos(rad(theta)),
    y: -Math.sin(rad(theta)),
  };
  // Flight path direction
  const fpDir: Vec = {
    x: Math.cos(rad(gamma)),
    y: -Math.sin(rad(gamma)),
  };
  // Lift direction (perpendicular to flight path, on upper-wing side)
  const liftDir: Vec = {
    x: -Math.sin(rad(gamma)),
    y: -Math.cos(rad(gamma)),
  };
  // Drag direction (opposite to flight path)
  const dragDir: Vec = {
    x: -Math.cos(rad(gamma)),
    y: Math.sin(rad(gamma)),
  };
  // Weight direction (straight down in screen)
  const weightDir: Vec = { x: 0, y: 1 };

  const liftEnd = scaleForce(L, liftDir);
  const weightEnd = scaleForce(WEIGHT_N, weightDir);
  const thrustEnd = scaleForce(thrust, bodyDir);
  const dragEnd = scaleForce(D, dragDir);

  // Angle arc helper. Draws a small arc between two angles at given radius.
  // Angles are SVG-screen angles (positive = CW from +X in SVG since Y is down).
  // We pass body and flight-path angles in DEGREES measured the natural way
  // (positive pitch = nose-up, positive γ = climbing). In SVG screen, these
  // map to negative angles around origin.
  const arcRadius = (r: number, angle1: number, angle2: number) => {
    const a1 = -angle1; // convert pitch-up to SVG angle
    const a2 = -angle2;
    const x1 = r * Math.cos(rad(a1));
    const y1 = r * Math.sin(rad(a1));
    const x2 = r * Math.cos(rad(a2));
    const y2 = r * Math.sin(rad(a2));
    // Sweep direction: we draw from a1 to a2.
    // sweep-flag 1 = CW in SVG (increasing angle)
    const sweep = a2 > a1 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`;
  };

  return (
    <svg
      viewBox="-360 -250 720 420"
      className="w-full h-full"
      role="img"
      aria-label={`Cessna flight diagram. Pitch ${theta.toFixed(1)} degrees, AoA ${alpha.toFixed(1)} degrees, flight path angle ${gamma.toFixed(1)} degrees, airspeed ${V_kts.toFixed(0)} knots.`}
    >
      <defs>
        {(
          [
            ['L', COLOR_LIFT],
            ['W', COLOR_WEIGHT],
            ['T', COLOR_THRUST],
            ['D', COLOR_DRAG],
          ] as const
        ).map(([k, colour]) => (
          <marker
            key={k}
            id={`arrow-${k}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={colour} />
          </marker>
        ))}
      </defs>

      {/* horizon (dashed, always horizontal) */}
      <line
        x1={-320}
        y1={0}
        x2={320}
        y2={0}
        stroke={COLOR_HORIZON}
        strokeWidth={0.9}
        strokeDasharray="6 6"
      />
      <text
        x={310}
        y={-6}
        fill={COLOR_HORIZON}
        fontSize={10}
        textAnchor="end"
        fontFamily="ui-sans-serif, system-ui"
      >
        horizon
      </text>

      {/* flight path (dashed, through CG at angle γ) */}
      <line
        x1={-fpDir.x * 300}
        y1={-fpDir.y * 300}
        x2={fpDir.x * 300}
        y2={fpDir.y * 300}
        stroke={COLOR_FLIGHTPATH}
        strokeWidth={0.9}
        strokeDasharray="4 4"
        opacity={0.85}
      />
      <text
        x={fpDir.x * 285}
        y={fpDir.y * 285 - 6}
        fill={COLOR_FLIGHTPATH}
        fontSize={10}
        fontFamily="ui-sans-serif, system-ui"
        textAnchor="end"
      >
        flight path
      </text>

      {/* chord line (subtle, along body axis through CG) */}
      <line
        x1={-bodyDir.x * 180}
        y1={-bodyDir.y * 180}
        x2={bodyDir.x * 180}
        y2={bodyDir.y * 180}
        stroke={COLOR_CHORD}
        strokeWidth={0.7}
        strokeDasharray="2 4"
        opacity={0.65}
      />

      {/* angle arcs */}
      <path
        d={arcRadius(48, 0, theta)}
        fill="none"
        stroke={COLOR_CHORD}
        strokeWidth={1}
      />
      <text
        x={56 * Math.cos(rad(-theta / 2))}
        y={56 * Math.sin(rad(-theta / 2)) + 3}
        fill={COLOR_CHORD}
        fontSize={10}
        fontFamily="ui-sans-serif, system-ui"
      >
        θ {theta >= 0 ? '+' : ''}
        {theta.toFixed(1)}°
      </text>

      <path
        d={arcRadius(74, 0, gamma)}
        fill="none"
        stroke={COLOR_FLIGHTPATH}
        strokeWidth={1}
      />
      <text
        x={84 * Math.cos(rad(-gamma / 2))}
        y={84 * Math.sin(rad(-gamma / 2)) + 3}
        fill={COLOR_FLIGHTPATH}
        fontSize={10}
        fontFamily="ui-sans-serif, system-ui"
      >
        γ {gamma >= 0 ? '+' : ''}
        {gamma.toFixed(1)}°
      </text>

      <path
        d={arcRadius(28, gamma, theta)}
        fill="none"
        stroke={COLOR_LIFT}
        strokeWidth={1}
      />
      <text
        x={36 * Math.cos(rad(-(theta + gamma) / 2))}
        y={36 * Math.sin(rad(-(theta + gamma) / 2)) + 3}
        fill={COLOR_LIFT}
        fontSize={10}
        fontFamily="ui-sans-serif, system-ui"
      >
        α {alpha.toFixed(1)}°
      </text>

      {/* the aircraft rotates around CG (SVG origin) by -θ */}
      <motion.g
        initial={false}
        animate={{ rotate: -theta }}
        transition={{ type: 'spring', stiffness: 150, damping: 22 }}
        style={{
          transformOrigin: '0px 0px',
          transformBox: 'view-box',
          color: 'var(--text)',
        } as React.CSSProperties}
      >
        <AircraftSilhouette />
      </motion.g>

      {/* Lift decomposition — projects the lift vector onto horizontal (Lₓ) and
          vertical (Lᵧ) axes so students can see how much of the lift is fighting
          gravity (Lᵧ) vs how much is pulling the airplane back along the flight
          path (Lₓ, when γ ≠ 0). Drawn below the main arrows. */}
      <g>
        {/* horizontal (Lₓ) projection */}
        <line
          x1={0}
          y1={0}
          x2={liftEnd.x}
          y2={0}
          stroke={COLOR_LIFT}
          strokeWidth={1.4}
          strokeDasharray="4 3"
          opacity={0.55}
        />
        {/* vertical (Lᵧ) projection */}
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={liftEnd.y}
          stroke={COLOR_LIFT}
          strokeWidth={1.4}
          strokeDasharray="4 3"
          opacity={0.55}
        />
        {/* dashed corner lines completing the rectangle */}
        <line
          x1={liftEnd.x}
          y1={0}
          x2={liftEnd.x}
          y2={liftEnd.y}
          stroke={COLOR_LIFT}
          strokeWidth={0.8}
          strokeDasharray="2 3"
          opacity={0.35}
        />
        <line
          x1={0}
          y1={liftEnd.y}
          x2={liftEnd.x}
          y2={liftEnd.y}
          stroke={COLOR_LIFT}
          strokeWidth={0.8}
          strokeDasharray="2 3"
          opacity={0.35}
        />

        {/* Lᵧ label — vertical lift (gravity-fighting component) */}
        <g transform={`translate(${liftEnd.x < 0 ? -8 : 8}, ${liftEnd.y / 2 + 4})`}>
          <rect
            x={liftEnd.x < 0 ? -78 : 0}
            y={-9}
            width={78}
            height={18}
            rx={2}
            fill="var(--bg-elev)"
            stroke={COLOR_LIFT}
            strokeWidth={0.7}
            opacity={0.92}
          />
          <text
            x={liftEnd.x < 0 ? -74 : 4}
            y={4}
            fill={COLOR_LIFT}
            fontSize={10}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={600}
          >
            Lᵧ = {Math.round(L * Math.cos((gamma * Math.PI) / 180)).toLocaleString()} N
          </text>
        </g>

        {/* Lₓ label — horizontal lift (only shown when γ ≠ 0 so it's meaningful) */}
        {Math.abs(gamma) > 0.4 && (
          <g transform={`translate(${liftEnd.x / 2}, ${liftEnd.y > 0 ? -10 : 18})`}>
            <rect
              x={-46}
              y={-9}
              width={92}
              height={18}
              rx={2}
              fill="var(--bg-elev)"
              stroke={COLOR_LIFT}
              strokeWidth={0.7}
              opacity={0.92}
            />
            <text
              x={0}
              y={4}
              fill={COLOR_LIFT}
              fontSize={10}
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={600}
            >
              Lₓ = {(L * Math.sin((gamma * Math.PI) / 180) > 0 ? '+' : '') +
                Math.round(L * Math.sin((gamma * Math.PI) / 180)).toLocaleString()} N
            </text>
          </g>
        )}
      </g>

      {/* CG marker (small ring) */}
      <circle cx={0} cy={0} r={4.2} fill="none" stroke={COLOR_CG} strokeWidth={1.4} />
      <circle cx={0} cy={0} r={1.5} fill={COLOR_CG} />

      {/* force vectors with leader-line labels */}
      <ForceArrow
        end={liftEnd}
        labelAt={labelPosition(liftEnd, 0)}
        color={COLOR_LIFT}
        label="L"
        value={`${Math.round(L).toLocaleString()} N`}
        ariaLabel={`Lift ${Math.round(L)} newtons, perpendicular to flight path`}
      />
      <ForceArrow
        end={weightEnd}
        labelAt={labelPosition(weightEnd, 0)}
        color={COLOR_WEIGHT}
        label="W"
        value={`${WEIGHT_N.toLocaleString()} N`}
        ariaLabel={`Weight ${WEIGHT_N} newtons, straight down`}
      />
      <ForceArrow
        end={thrustEnd}
        labelAt={labelPosition(thrustEnd, -38)}
        color={COLOR_THRUST}
        label="T"
        value={`${Math.round(thrust).toLocaleString()} N`}
        ariaLabel={`Thrust ${Math.round(thrust)} newtons, along fuselage axis`}
      />
      <ForceArrow
        end={dragEnd}
        labelAt={labelPosition(dragEnd, -38)}
        color={COLOR_DRAG}
        label="D"
        value={`${Math.round(D).toLocaleString()} N`}
        ariaLabel={`Drag ${Math.round(D)} newtons, opposite to flight path`}
      />
    </svg>
  );
}
