import { motion } from 'framer-motion';
import type { FlightState } from '../physics';
import { WEIGHT_N } from '../physics';
import { AircraftSilhouette } from './AircraftSilhouette';

interface Props {
  state: FlightState;
}

// Force magnitude → pixel length scaling (sqrt scale keeps small forces visible
// and prevents large forces from saturating).
const REF_ARROW_PX = 90;
const MAX_ARROW_PX = 220;
const LABEL_MIN_DIST = 150;

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

function labelPosition(end: Vec, perp: number): Vec {
  const len = Math.hypot(end.x, end.y) || 1;
  const ux = end.x / len;
  const uy = end.y / len;
  const px = uy;
  const py = -ux;
  const along = Math.max(len + 26, LABEL_MIN_DIST);
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
        strokeWidth={2.4}
        strokeLinecap="round"
        markerEnd={`url(#arrow-${label})`}
      />
      {/* drafting leader line — extends from arrow tip with a small "elbow" */}
      <motion.line
        initial={false}
        animate={{ x1: end.x, y1: end.y, x2: labelAt.x, y2: labelAt.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        stroke={color}
        strokeWidth={0.7}
        strokeDasharray="1 2"
        opacity={0.7}
      />
      {/* drafting-style label tag — hairline border, paper-coloured fill */}
      <motion.g
        initial={false}
        animate={{ x: labelAt.x, y: labelAt.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      >
        <rect
          x={-28}
          y={-15}
          width={86}
          height={30}
          rx={0}
          fill="var(--bg-elev)"
          stroke={color}
          strokeWidth={0.9}
        />
        {/* corner tick to mimic a drafting tag */}
        <line x1={-28} y1={-15} x2={-23} y2={-15} stroke={color} strokeWidth={1.6} />
        <line x1={-28} y1={-15} x2={-28} y2={-10} stroke={color} strokeWidth={1.6} />
        <text
          x={-22}
          y={-3}
          fill={color}
          fontSize={11.5}
          fontWeight={700}
          fontFamily="'Fraunces', Georgia, serif"
          fontStyle="italic"
        >
          {label}
        </text>
        <text
          x={-22}
          y={10}
          fill={color}
          fontSize={9.5}
          fontFamily="'JetBrains Mono', monospace"
        >
          {value}
        </text>
      </motion.g>
    </g>
  );
}

const COLOR_LIFT = 'var(--c-lift)';
const COLOR_WEIGHT = 'var(--c-weight)';
const COLOR_THRUST = 'var(--c-thrust)';
const COLOR_DRAG = 'var(--c-drag)';
const COLOR_HORIZON = 'var(--rule)';
const COLOR_FLIGHTPATH = 'var(--c-magenta)';
const COLOR_CHORD = 'var(--text-soft)';
const COLOR_CG = 'var(--c-cg)';

export function FlightDiagram({ state }: Props) {
  const { alpha, theta, gamma, L, D, thrust, V_kts } = state;

  const bodyDir: Vec = { x: Math.cos(rad(theta)), y: -Math.sin(rad(theta)) };
  const fpDir: Vec = { x: Math.cos(rad(gamma)), y: -Math.sin(rad(gamma)) };
  const liftDir: Vec = { x: -Math.sin(rad(gamma)), y: -Math.cos(rad(gamma)) };
  const dragDir: Vec = { x: -Math.cos(rad(gamma)), y: Math.sin(rad(gamma)) };
  const weightDir: Vec = { x: 0, y: 1 };

  const liftEnd = scaleForce(L, liftDir);
  const weightEnd = scaleForce(WEIGHT_N, weightDir);
  const thrustEnd = scaleForce(thrust, bodyDir);
  const dragEnd = scaleForce(D, dragDir);

  const arcPath = (r: number, angle1: number, angle2: number) => {
    const a1 = -angle1;
    const a2 = -angle2;
    const x1 = r * Math.cos(rad(a1));
    const y1 = r * Math.sin(rad(a1));
    const x2 = r * Math.cos(rad(a2));
    const y2 = r * Math.sin(rad(a2));
    const sweep = a2 > a1 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`;
  };

  return (
    <svg
      viewBox="-380 -250 760 420"
      className="w-full h-full"
      role="img"
      aria-label={`Cessna 152 side view. Pitch ${theta.toFixed(1)} degrees, AoA ${alpha.toFixed(1)} degrees, flight path ${gamma.toFixed(1)} degrees, airspeed ${V_kts.toFixed(0)} knots.`}
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
        {/* Drafting hatching for "ground" below horizon */}
        <pattern id="ground-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} stroke="var(--rule)" strokeWidth={0.4} opacity={0.35} />
        </pattern>
      </defs>

      {/* ── Earth band below horizon (very subtle, drafting hatch) ── */}
      <rect x={-380} y={0} width={760} height={170} fill="url(#ground-hatch)" opacity={0.55} />

      {/* ── Horizon (drafting datum line) ── */}
      <line x1={-340} y1={0} x2={340} y2={0} stroke={COLOR_HORIZON} strokeWidth={0.9} strokeDasharray="6 4" />
      {/* small cardinal ticks along the horizon */}
      {[-280, -200, -120, -40, 40, 120, 200, 280].map((x) => (
        <line key={x} x1={x} y1={-3} x2={x} y2={3} stroke={COLOR_HORIZON} strokeWidth={0.6} opacity={0.7} />
      ))}
      <text
        x={332}
        y={-7}
        fill={COLOR_HORIZON}
        fontSize={9}
        textAnchor="end"
        fontFamily="'IBM Plex Sans Condensed', system-ui"
        letterSpacing="0.14em"
        fontWeight={600}
      >
        HORIZON
      </text>

      {/* ── Flight path (through CG at angle γ) ── */}
      <line
        x1={-fpDir.x * 320}
        y1={-fpDir.y * 320}
        x2={fpDir.x * 320}
        y2={fpDir.y * 320}
        stroke={COLOR_FLIGHTPATH}
        strokeWidth={0.9}
        strokeDasharray="5 3"
        opacity={0.8}
      />
      <text
        x={fpDir.x * 305}
        y={fpDir.y * 305 - 6}
        fill={COLOR_FLIGHTPATH}
        fontSize={9}
        fontFamily="'IBM Plex Sans Condensed', system-ui"
        letterSpacing="0.1em"
        fontWeight={600}
        textAnchor="end"
      >
        FLIGHT PATH
      </text>

      {/* ── Chord/body axis (subtle, drafting construction line) ── */}
      <line
        x1={-bodyDir.x * 180}
        y1={-bodyDir.y * 180}
        x2={bodyDir.x * 180}
        y2={bodyDir.y * 180}
        stroke={COLOR_CHORD}
        strokeWidth={0.6}
        strokeDasharray="1 3"
        opacity={0.5}
      />

      {/* ── Angle arcs (drafting style — hairline) ── */}
      <path d={arcPath(52, 0, theta)} fill="none" stroke={COLOR_CHORD} strokeWidth={0.9} />
      <text
        x={62 * Math.cos(rad(-theta / 2))}
        y={62 * Math.sin(rad(-theta / 2)) + 3}
        fill={COLOR_CHORD}
        fontSize={10}
        fontFamily="'Fraunces', Georgia, serif"
        fontStyle="italic"
      >
        θ {theta >= 0 ? '+' : ''}{theta.toFixed(1)}°
      </text>

      <path d={arcPath(78, 0, gamma)} fill="none" stroke={COLOR_FLIGHTPATH} strokeWidth={0.9} />
      <text
        x={88 * Math.cos(rad(-gamma / 2))}
        y={88 * Math.sin(rad(-gamma / 2)) + 3}
        fill={COLOR_FLIGHTPATH}
        fontSize={10}
        fontFamily="'Fraunces', Georgia, serif"
        fontStyle="italic"
      >
        γ {gamma >= 0 ? '+' : ''}{gamma.toFixed(1)}°
      </text>

      <path d={arcPath(30, gamma, theta)} fill="none" stroke={COLOR_LIFT} strokeWidth={0.9} />
      <text
        x={38 * Math.cos(rad(-(theta + gamma) / 2))}
        y={38 * Math.sin(rad(-(theta + gamma) / 2)) + 3}
        fill={COLOR_LIFT}
        fontSize={10}
        fontFamily="'Fraunces', Georgia, serif"
        fontStyle="italic"
      >
        α {alpha.toFixed(1)}°
      </text>

      {/* ── Aircraft (rotates with θ around CG) ── */}
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

      {/* ── Lift decomposition (Lₓ, Lᵧ) — drawn faint behind force arrows ── */}
      <g opacity={0.6}>
        <line x1={0} y1={0} x2={liftEnd.x} y2={0} stroke={COLOR_LIFT} strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
        <line x1={0} y1={0} x2={0} y2={liftEnd.y} stroke={COLOR_LIFT} strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
        <line x1={liftEnd.x} y1={0} x2={liftEnd.x} y2={liftEnd.y} stroke={COLOR_LIFT} strokeWidth={0.6} strokeDasharray="1 3" opacity={0.4} />
        <line x1={0} y1={liftEnd.y} x2={liftEnd.x} y2={liftEnd.y} stroke={COLOR_LIFT} strokeWidth={0.6} strokeDasharray="1 3" opacity={0.4} />
      </g>

      {/* ── CG marker (drafting target) ── */}
      <circle cx={0} cy={0} r={5} fill="var(--bg-elev)" stroke={COLOR_CG} strokeWidth={1.3} />
      <line x1={-4} y1={0} x2={4} y2={0} stroke={COLOR_CG} strokeWidth={0.9} />
      <line x1={0} y1={-4} x2={0} y2={4} stroke={COLOR_CG} strokeWidth={0.9} />

      {/* ── Force vectors ── */}
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
        labelAt={labelPosition(thrustEnd, -40)}
        color={COLOR_THRUST}
        label="T"
        value={`${Math.round(thrust).toLocaleString()} N`}
        ariaLabel={`Thrust ${Math.round(thrust)} newtons, along fuselage axis`}
      />
      <ForceArrow
        end={dragEnd}
        labelAt={labelPosition(dragEnd, -40)}
        color={COLOR_DRAG}
        label="D"
        value={`${Math.round(D).toLocaleString()} N`}
        ariaLabel={`Drag ${Math.round(D)} newtons, opposite to flight path`}
      />

      {/* ── Drafting title block (lower-right) ── */}
      <g>
        <rect
          x={196}
          y={120}
          width={170}
          height={42}
          fill="var(--bg-elev)"
          stroke="var(--rule)"
          strokeWidth={0.8}
        />
        <line x1={196} y1={132} x2={366} y2={132} stroke="var(--rule)" strokeWidth={0.5} opacity={0.7} />
        <text
          x={203}
          y={130}
          fill="var(--text-soft)"
          fontSize={8.5}
          fontFamily="'IBM Plex Sans Condensed', system-ui"
          letterSpacing="0.18em"
          fontWeight={600}
        >
          FIG · SIDE PROFILE
        </text>
        <text
          x={203}
          y={146}
          fill="var(--text)"
          fontSize={10}
          fontFamily="'Fraunces', Georgia, serif"
          fontStyle="italic"
        >
          Cessna 152 — four forces
        </text>
        <text
          x={203}
          y={157}
          fill="var(--text-mute)"
          fontSize={8}
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="0.04em"
        >
          {V_kts.toFixed(0)} KIAS · SL ISA
        </text>
      </g>
    </svg>
  );
}
