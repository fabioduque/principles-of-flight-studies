// Cessna 152 (gear-up) side-profile silhouette, outline only.
// Strokes use currentColor so the silhouette adapts to light/dark themes via
// the parent's text colour. Coordinates: CG at origin (0, 0); aircraft faces +X.

interface Props {
  staticProp?: boolean;
}

const GLASS = '#7dd3fc';

export function AircraftSilhouette({ staticProp = false }: Props) {
  return (
    <g
      stroke="currentColor"
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeWidth={1.8}
      fill="none"
    >
      {/* horizontal stab */}
      <polygon points="-110,-4 -160,-6 -160,6 -110,4" />

      {/* vertical fin */}
      <polygon points="-75,-12 -125,-48 -150,-48 -150,-12" />

      {/* fuselage with integrated cabin hump */}
      <path
        d="M 92 -3
           L 80 -10
           L 50 -12
           L 30 -12
           L 18 -34
           L -25 -34
           L -42 -14
           L -120 -10
           L -150 -7
           L -150 7
           L -120 12
           L -42 16
           L 50 16
           L 80 10
           L 92 3
           Z"
      />

      {/* windshield glass */}
      <polygon
        points="18,-32 30,-12 14,-22"
        fill={GLASS}
        fillOpacity={0.35}
        strokeWidth={1.2}
      />
      {/* side window glass */}
      <polygon
        points="14,-32 -22,-32 -25,-22 14,-22"
        fill={GLASS}
        fillOpacity={0.35}
        strokeWidth={1.2}
      />
      {/* door post */}
      <line x1={14} y1={-32} x2={14} y2={-22} strokeWidth={1} />

      {/* high wing — thin slab */}
      <rect x={-46} y={-40} width={86} height={5} rx={2.5} />
      {/* nav light on wing tip */}
      <circle cx={40} cy={-37.5} r={1.6} fill="#dc2626" stroke="none" />

      {/* lift strut — single clean diagonal */}
      <line x1={2} y1={-36} x2={40} y2={14} strokeWidth={2.6} />

      {/* spinner */}
      <path
        d="M 92 -5 C 100 -4, 104 -2, 105 0 C 104 2, 100 4, 92 5 Z"
        strokeWidth={1.4}
      />

      {/* propeller */}
      {staticProp ? (
        <g>
          <line x1={108} y1={-36} x2={108} y2={36} strokeWidth={2.6} />
          <circle cx={108} cy={0} r={2} fill="currentColor" stroke="none" />
        </g>
      ) : (
        <g>
          <ellipse cx={108} cy={0} rx={2.2} ry={36} stroke="none" fill="currentColor" opacity={0.18} />
          <ellipse cx={108} cy={0} rx={0.8} ry={36} stroke="none" fill="currentColor" opacity={0.5} />
          <circle cx={108} cy={0} r={2} fill="currentColor" stroke="none" />
        </g>
      )}

      {/* tail stinger */}
      <line x1={-150} y1={0} x2={-160} y2={1} strokeWidth={1} />
    </g>
  );
}
