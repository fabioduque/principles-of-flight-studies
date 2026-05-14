import { motion } from 'framer-motion';
import type { FlightState } from '../physics';
import { WEIGHT_N } from '../physics';
import { AircraftSilhouette } from './AircraftSilhouette';

interface Props {
  state: FlightState;
}

const REF_ARROW_PX = 90;
const MAX_ARROW_PX = 220;
const LABEL_MIN_DIST = 160;

const rad = (deg: number) => (deg * Math.PI) / 180;

interface Vec { x: number; y: number; }

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
  const along = Math.max(len + 28, LABEL_MIN_DIST);
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

// Drafting label tag: paper background, dark ink for both the symbol (large)
// and the value (mono). A colored swatch bar on the left identifies the force.
function ForceArrow({ end, labelAt, color, label, value, ariaLabel }: ForceArrowProps) {
  return (
    <g aria-label={ariaLabel}>
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
      <motion.line
        initial={false}
        animate={{ x1: end.x, y1: end.y, x2: labelAt.x - 4, y2: labelAt.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        stroke={color}
        strokeWidth={0.8}
        strokeDasharray="1 2"
        opacity={0.75}
      />
      <motion.g
        initial={false}
        animate={{ x: labelAt.x, y: labelAt.y }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      >
        {/* Tag plate */}
        <rect
          x={-4}
          y={-17}
          width={104}
          height={34}
          fill="var(--bg-elev)"
          stroke="var(--rule)"
          strokeWidth={0.8}
        />
        {/* Color swatch bar (semantic identifier) */}
        <rect x={-4} y={-17} width={7} height={34} fill={color} />
        {/* Force letter (Fraunces italic in the force color — purely decorative) */}
        <text
          x={9}
          y={-2}
          fill={color}
          fontSize={14}
          fontWeight={700}
          fontFamily="'Fraunces', Georgia, serif"
          fontStyle="italic"
        >
          {label}
        </text>
        {/* Value (mono, ink color — the part that matters) */}
        <text
          x={9}
          y={12}
          fill="var(--text)"
          fontSize={11}
          fontWeight={500}
          fontFamily="'IBM Plex Mono', monospace"
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

  const gammaRad = rad(gamma);
  const Ly = L * Math.cos(gammaRad);   // vertical component (gravity-fighting)
  const Lx = L * Math.sin(gammaRad);   // horizontal component (along flight path projection)

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
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={colour} />
          </marker>
        ))}
        <pattern id="ground-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} stroke="var(--rule)" strokeWidth={0.4} opacity={0.30} />
        </pattern>
      </defs>

      {/* Earth band */}
      <rect x={-380} y={0} width={760} height={170} fill="url(#ground-hatch)" opacity={0.55} />

      {/* Horizon */}
      <line x1={-340} y1={0} x2={340} y2={0} stroke={COLOR_HORIZON} strokeWidth={1} strokeDasharray="6 4" />
      {[-280, -200, -120, -40, 40, 120, 200, 280].map((x) => (
        <line key={x} x1={x} y1={-3} x2={x} y2={3} stroke={COLOR_HORIZON} strokeWidth={0.6} opacity={0.7} />
      ))}
      <text
        x={332}
        y={-7}
        fill={COLOR_HORIZON}
        fontSize={9.5}
        textAnchor="end"
        fontFamily="'IBM Plex Sans Condensed', system-ui"
        letterSpacing="0.14em"
        fontWeight={600}
      >
        HORIZON
      </text>

      {/* Flight path */}
      <line
        x1={-fpDir.x * 320}
        y1={-fpDir.y * 320}
        x2={fpDir.x * 320}
        y2={fpDir.y * 320}
        stroke={COLOR_FLIGHTPATH}
        strokeWidth={1}
        strokeDasharray="5 3"
        opacity={0.85}
      />
      <text
        x={fpDir.x * 305}
        y={fpDir.y * 305 - 6}
        fill={COLOR_FLIGHTPATH}
        fontSize={9.5}
        fontFamily="'IBM Plex Sans Condensed', system-ui"
        letterSpacing="0.1em"
        fontWeight={600}
        textAnchor="end"
      >
        FLIGHT PATH
      </text>

      {/* Chord */}
      <line
        x1={-bodyDir.x * 180}
        y1={-bodyDir.y * 180}
        x2={bodyDir.x * 180}
        y2={bodyDir.y * 180}
        stroke={COLOR_CHORD}
        strokeWidth={0.6}
        strokeDasharray="1 3"
        opacity={0.55}
      />

      {/* Angle arcs */}
      <path d={arcPath(54, 0, theta)} fill="none" stroke={COLOR_CHORD} strokeWidth={1} />
      <text
        x={64 * Math.cos(rad(-theta / 2))}
        y={64 * Math.sin(rad(-theta / 2)) + 3.5}
        fill={COLOR_CHORD}
        fontSize={10.5}
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight={500}
      >
        θ {theta >= 0 ? '+' : ''}{theta.toFixed(1)}°
      </text>

      <path d={arcPath(82, 0, gamma)} fill="none" stroke={COLOR_FLIGHTPATH} strokeWidth={1} />
      <text
        x={92 * Math.cos(rad(-gamma / 2))}
        y={92 * Math.sin(rad(-gamma / 2)) + 3.5}
        fill={COLOR_FLIGHTPATH}
        fontSize={10.5}
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight={500}
      >
        γ {gamma >= 0 ? '+' : ''}{gamma.toFixed(1)}°
      </text>

      <path d={arcPath(30, gamma, theta)} fill="none" stroke={COLOR_LIFT} strokeWidth={1} />
      <text
        x={38 * Math.cos(rad(-(theta + gamma) / 2))}
        y={38 * Math.sin(rad(-(theta + gamma) / 2)) + 3.5}
        fill={COLOR_LIFT}
        fontSize={10.5}
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight={600}
      >
        α {alpha.toFixed(1)}°
      </text>

      {/* Aircraft */}
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

      {/* ── Lift decomposition with VISIBLE Lᵧ (and Lₓ when γ ≠ 0) labels ── */}
      <g>
        {/* Vertical projection axis (Lᵧ) — dashed, fairly visible */}
        <line
          x1={0} y1={0} x2={0} y2={liftEnd.y}
          stroke={COLOR_LIFT}
          strokeWidth={1.4}
          strokeDasharray="6 3"
          opacity={0.75}
        />
        {/* Horizontal projection axis (Lₓ) */}
        <line
          x1={0} y1={0} x2={liftEnd.x} y2={0}
          stroke={COLOR_LIFT}
          strokeWidth={1.4}
          strokeDasharray="6 3"
          opacity={0.75}
        />
        {/* Parallelogram corner connectors */}
        <line x1={liftEnd.x} y1={0} x2={liftEnd.x} y2={liftEnd.y} stroke={COLOR_LIFT} strokeWidth={0.7} strokeDasharray="2 3" opacity={0.45} />
        <line x1={0} y1={liftEnd.y} x2={liftEnd.x} y2={liftEnd.y} stroke={COLOR_LIFT} strokeWidth={0.7} strokeDasharray="2 3" opacity={0.45} />

        {/* Lᵧ label — paper tag on the vertical projection */}
        <g transform={`translate(${liftEnd.x < 0 ? -10 : 10}, ${liftEnd.y / 2 + 4})`}>
          <rect
            x={liftEnd.x < 0 ? -92 : 0}
            y={-11}
            width={92}
            height={22}
            fill="var(--bg-elev)"
            stroke="var(--rule)"
            strokeWidth={0.7}
          />
          <rect
            x={liftEnd.x < 0 ? -92 : 0}
            y={-11}
            width={4}
            height={22}
            fill={COLOR_LIFT}
          />
          <text
            x={liftEnd.x < 0 ? -86 : 6}
            y={5}
            fill="var(--text)"
            fontSize={11}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight={500}
          >
            <tspan fill={COLOR_LIFT} fontWeight={700}>Lᵧ</tspan>
            <tspan> = {Math.round(Ly).toLocaleString()} N</tspan>
          </text>
        </g>

        {/* Lₓ label — paper tag on the horizontal projection (only when γ matters) */}
        {Math.abs(gamma) > 0.5 && Math.abs(liftEnd.x) > 12 && (
          <g transform={`translate(${liftEnd.x / 2}, ${liftEnd.y > 0 ? -16 : 22})`}>
            <rect x={-52} y={-11} width={104} height={22} fill="var(--bg-elev)" stroke="var(--rule)" strokeWidth={0.7} />
            <rect x={-52} y={-11} width={4} height={22} fill={COLOR_LIFT} />
            <text
              x={0}
              y={5}
              fill="var(--text)"
              fontSize={11}
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight={500}
              textAnchor="middle"
            >
              <tspan fill={COLOR_LIFT} fontWeight={700}>Lₓ</tspan>
              <tspan> = {(Lx > 0 ? '+' : '') + Math.round(Lx).toLocaleString()} N</tspan>
            </text>
          </g>
        )}
      </g>

      {/* CG crosshair */}
      <circle cx={0} cy={0} r={5} fill="var(--bg-elev)" stroke={COLOR_CG} strokeWidth={1.4} />
      <line x1={-4} y1={0} x2={4} y2={0} stroke={COLOR_CG} strokeWidth={1} />
      <line x1={0} y1={-4} x2={0} y2={4} stroke={COLOR_CG} strokeWidth={1} />

      {/* Force vectors */}
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
        labelAt={labelPosition(thrustEnd, -44)}
        color={COLOR_THRUST}
        label="T"
        value={`${Math.round(thrust).toLocaleString()} N`}
        ariaLabel={`Thrust ${Math.round(thrust)} newtons, along fuselage axis`}
      />
      <ForceArrow
        end={dragEnd}
        labelAt={labelPosition(dragEnd, -44)}
        color={COLOR_DRAG}
        label="D"
        value={`${Math.round(D).toLocaleString()} N`}
        ariaLabel={`Drag ${Math.round(D)} newtons, opposite to flight path`}
      />

      {/* Title block */}
      <g>
        <rect x={196} y={120} width={170} height={42} fill="var(--bg-elev)" stroke="var(--rule)" strokeWidth={0.8} />
        <line x1={196} y1={132} x2={366} y2={132} stroke="var(--rule)" strokeWidth={0.5} opacity={0.7} />
        <text
          x={203}
          y={130}
          fill="var(--text-soft)"
          fontSize={9}
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
          fontSize={10.5}
          fontFamily="'Fraunces', Georgia, serif"
          fontStyle="italic"
        >
          Cessna 152 — four forces
        </text>
        <text
          x={203}
          y={157}
          fill="var(--text-mute)"
          fontSize={9}
          fontFamily="'IBM Plex Mono', monospace"
          letterSpacing="0.02em"
        >
          {V_kts.toFixed(0)} KIAS · SL ISA
        </text>
      </g>
    </svg>
  );
}
