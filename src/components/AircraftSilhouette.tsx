// Cessna 152 side profile — drafting/blueprint style.
//
// Three-view drafting conventions:
//   - currentColor on all strokes (theme-adaptive ink)
//   - hairline construction lines (0.8–1.6 px) with crisp linejoins
//   - small glass tint on windows so they read at small sizes
//
// Coordinates: CG at (0, 0); aircraft faces +X.  Length ≈ 275 px.
// Anatomy verified against a Cessna 152 three-view: high wing seated on cabin
// roof, slim vertical fin, single lift strut from wing mid-span to lower
// fuselage at the door station, tricycle gear omitted for clarity.

interface Props {
  staticProp?: boolean;
  /** Show small drafting tick marks at major datums. */
  drafting?: boolean;
}

const GLASS_LIGHT = '#aac8e8';

export function AircraftSilhouette({ staticProp = false, drafting = false }: Props) {
  // Pick glass tone — uses currentColor luminance via opacity so it works in both themes.
  return (
    <g
      stroke="currentColor"
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeWidth={1.4}
      fill="none"
      vectorEffect="non-scaling-stroke"
    >
      {/* ── Horizontal stabilizer (drawn first, behind the fuselage joinder) ── */}
      <path
        d="M -118 -3
           L -160 -5
           L -160  5
           L -118  3 Z"
        fill="currentColor"
        fillOpacity={0.06}
      />

      {/* ── Vertical fin (small, proportional) ── */}
      <path
        d="M -95 -8
           L -120 -34
           L -140 -34
           L -130 -3
           Z"
        fill="currentColor"
        fillOpacity={0.06}
      />
      {/* Fin's leading-edge construction tick */}
      <line x1={-120} y1={-34} x2={-118} y2={-30} strokeWidth={0.8} opacity={0.5} />

      {/* ── Fuselage outline ── */}
      <path
        d="M 132   0
           C 132 -4, 128 -7, 122 -7
           L 102 -10
           L  88 -12
           C  82 -17, 76 -22, 68 -25
           L  10 -25
           L  -8 -23
           L -40 -16
           L -95 -9
           L -135 -3
           L -160  -3
           L -160   3
           L -130   3
           L -90    9
           L -30   13
           L  20   13
           L  68   11
           L  98    7
           L 118    4
           C 128   3, 132  2, 132  0 Z"
        fill="var(--bg-elev)"
      />

      {/* ── High wing — seated on the cabin roof ── */}
      {/* Wing top edge tucks under the cabin roof line for "integrated" feel */}
      <path
        d="M -32 -30
           L  56 -30
           L  56 -26
           L -32 -26 Z"
        fill="currentColor"
        fillOpacity={0.05}
      />
      {/* Wing leading-edge highlight */}
      <line x1={56} y1={-30} x2={56} y2={-26} strokeWidth={1.6} />

      {/* ── Wing strut (single diagonal) ── */}
      <line x1={28} y1={-26} x2={4} y2={12} strokeWidth={1.6} />
      {/* Strut fittings (small hairline circles) */}
      <circle cx={28} cy={-26} r={1.4} fill="var(--bg-elev)" strokeWidth={0.9} />
      <circle cx={4}  cy={12}  r={1.4} fill="var(--bg-elev)" strokeWidth={0.9} />

      {/* ── Cabin glass ── */}
      {/* Windshield (forward-sloped) */}
      <path
        d="M 68 -25
           L 82 -16
           L 56 -16
           Z"
        fill={GLASS_LIGHT}
        fillOpacity={0.35}
        strokeWidth={1}
      />
      {/* Door + side window (broken into upper window panel) */}
      <path
        d="M 56 -23
           L 8 -22
           L 4 -16
           L 56 -16 Z"
        fill={GLASS_LIGHT}
        fillOpacity={0.35}
        strokeWidth={1}
      />
      {/* Door post */}
      <line x1={32} y1={-23} x2={32} y2={-16} strokeWidth={0.9} />
      {/* Cabin-rear quarter window (smaller) */}
      <path
        d="M  4 -22
           L -20 -19
           L -22 -14
           L  0 -16 Z"
        fill={GLASS_LIGHT}
        fillOpacity={0.25}
        strokeWidth={0.8}
      />
      {/* Glass-frame inner reflection lines (faint) */}
      <line x1={68} y1={-25} x2={82} y2={-16} strokeWidth={0.8} opacity={0.6} />

      {/* ── Spinner & prop ── */}
      <path
        d="M 132 0
           C 138 -2, 142 -1, 145 0
           C 142 1, 138 2, 132 0 Z"
        fill="currentColor"
        fillOpacity={0.15}
      />
      {staticProp ? (
        <g>
          <line x1={148} y1={-34} x2={148} y2={34} strokeWidth={2.2} />
          <circle cx={148} cy={0} r={1.8} fill="currentColor" stroke="none" />
        </g>
      ) : (
        <g>
          {/* Prop disk — faint full circle for "spinning" feel */}
          <ellipse cx={148} cy={0} rx={2} ry={36} fill="currentColor" opacity={0.10} stroke="none" />
          <ellipse cx={148} cy={0} rx={0.6} ry={36} fill="currentColor" opacity={0.35} stroke="none" />
          <circle cx={148} cy={0} r={1.8} fill="currentColor" stroke="none" />
        </g>
      )}

      {/* ── Drafting marks (optional) — small ticks at key datums ── */}
      {drafting && (
        <g opacity={0.55} strokeWidth={0.8}>
          {/* Wing leading & trailing edge ticks */}
          <line x1={-32} y1={-38} x2={-32} y2={-34} />
          <line x1={56}  y1={-38} x2={56}  y2={-34} />
          {/* Datum vertical line through CG */}
          <line x1={0} y1={-44} x2={0} y2={-38} strokeDasharray="2 2" />
        </g>
      )}
    </g>
  );
}
