# Principles of Flight — Cessna 152

An interactive study supplement for PPL(A) students. Demonstrates the four
forces of flight, lift coefficient vs angle of attack across flap settings,
load factor in turns and climbs, and stall behaviour — calibrated to
textbook Cessna 152 numbers.

Drafting / blueprint visual aesthetic: vellum paper in light mode, prussian
blueprint in dark mode. Fully client-side; no backend; works from any
static host or directly from `file://`.

## Quick start

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # production build → dist/
npm run build:single # single-file build → dist/index.html (~700 KB)
npm run preview      # serve the built dist/
npm test             # vitest run (physics unit tests)
```

Requires Node 18 or newer.

## Sharing

- `npm run build` produces a normal split-asset `dist/` you can host on
  GitHub Pages, Netlify, Vercel, or any static host.
- `npm run build:single` inlines JS + CSS into a single ~700 KB
  `dist/index.html` that works from `file://` — share it as one file.

## Controls

- **Attitude indicator** — drag to set pitch and bank; bank presets sit on
  the bezel arc; pitch presets stack as a vertical tape.
- **Throttle slider** — engine thrust (0–1100 N representative cruise).
- **Flaps** — 0° / 10° / 30°.
- **Keyboard mode** — press **K** anywhere to toggle, or click the
  KEYBOARD pill next to the attitude indicator. Then:
  - ↑ / W — pitch −2.5° (push, nose down)
  - ↓ / S — pitch +2.5° (pull, nose up)
  - ← / A — bank −5°
  - → / D — bank +5°
  - R / F — throttle ±50 N
  - X — reset pitch & bank to 0

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS for layout and spacing
- Framer Motion for vector and aircraft animations
- Recharts for the Cₗ vs α and drag-vs-V plots
- Vitest for unit testing the physics module
- vite-plugin-singlefile for the standalone HTML build

## Physics model

All formulas live in `src/physics.ts` as pure functions, fully unit-tested.

### Constants

| Symbol | Value | Description |
| --- | --- | --- |
| S  | 14.86 m²        | Wing area |
| W  | 7428 N (1670 lb) | Max gross weight |
| AR | 7.32             | Aspect ratio |
| e  | 0.75             | Oswald efficiency |
| ρ  | 1.225 kg/m³      | Sea-level ISA density |

### Lift coefficient

`computeCL(α, flaps)` is piecewise:

- For α < α<sub>stall</sub>: C<sub>L</sub> = min(slope · (α − α<sub>ZL</sub>), C<sub>L</sub> max)
- For α ≥ α<sub>stall</sub>: C<sub>L</sub> = max(C<sub>L</sub> max − 0.09 · (α − α<sub>stall</sub>), 0.4)

Per-flap configuration:

| Flaps | α<sub>ZL</sub> | slope (/°) | α<sub>stall</sub> | C<sub>L</sub> max | C<sub>D0</sub> |
| --- | --- | --- | --- | --- | --- |
| 0°   | −2° | 0.10 | 16° | 1.50 | 0.027 |
| 10°  | −4° | 0.10 | 14° | 1.70 | 0.034 |
| 30°  | −7° | 0.10 | 12° | 2.10 | 0.085 |

### Drag

`computeCD(C_L, flaps) = C_D0 + k · C_L²` where `k = 1 / (π · AR · e)`.

### Steady-state solver

`solveFromPitchThrottleBank(θ, T, φ, flaps)` solves the coordinated-turn
balance:

- `L cos φ = W cos γ` (perpendicular balance — wing carries n·W)
- `T = D + W sin γ` (along-axis balance)
- `α = θ − γ` (geometry)

When no pre-stall equilibrium exists for the chosen inputs (over-pitched
for the available thrust), the solver declares a transient stall: α
follows θ, γ ≈ 0, V drops below Vs, and `computeCL` returns the
post-stall coefficient so lift collapses visibly below weight.

## Assumptions and limitations

- Lift slope, α<sub>ZL</sub>, α<sub>stall</sub> and C<sub>L</sub> max are
  textbook approximations chosen for pedagogical clarity, not POH data.
- Coordinated turns assumed; no slip or skid.
- Real C152 stalls are gentler thanks to wing washout (spanwise twist
  delaying root stall); this is not modelled.
- Thrust is treated as airspeed-independent. Real propeller thrust falls
  with airspeed — the cruise/climb tradeoff is approximate.
- Steady-state only — no transients (other than the stall fallback),
  gusts, or ground effect.
- Sea-level ISA only. Density altitude is not modelled.
- The silhouette is drawn with gear retracted for visual clarity. The
  C152 has fixed tricycle gear.

## C152 normal-category limits

- Positive load-factor limit: **+4.4 g**
- Negative load-factor limit: **−1.76 g**

Shown live in the load-factor panel with markers for 30°, 45° and 60° banks.

## License & attribution

© Fábio Duque. Educational tool — not for flight planning.
