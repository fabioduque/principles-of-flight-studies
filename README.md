# Cessna 152 — lift curve & load factor

An interactive single-page web app for PPL(A) students. Demonstrates the four
forces of flight, lift coefficient vs angle of attack across flap settings,
and load factor in turns and climbs, calibrated to textbook Cessna 152 numbers.

The app is fully client-side. After `npm run build` the contents of `dist/`
can be served from any static host (or opened with a local file server —
`base: './'` in `vite.config.ts` makes relative paths work).

## Quick start

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # production build → dist/
npm run preview  # serve the built dist/
npm test         # vitest run (physics unit tests)
```

Requires Node 18 or newer.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS for layout and spacing
- Framer Motion for smooth vector and aircraft animations
- Recharts for the C<sub>L</sub> vs α plot
- Vitest for unit testing the physics module
- No backend, no runtime dependencies on a server

## Project layout

```
src/
  physics.ts                  # pure functions, fully unit-tested
  physics.test.ts             # 31 tests covering CL, CD, force balance, n
  components/
    AircraftSilhouette.tsx    # inline SVG silhouette (gear retracted)
    FlightDiagram.tsx         # aircraft + force vectors + reference lines + arcs
    ControlPanel.tsx          # flap radios, mode toggle, sliders, presets
    CLChart.tsx               # CL vs α with all three flap curves
    LoadFactorPanel.tsx       # n formula + level-turn chart + limits
    Readouts.tsx              # metric cards for computed values
  App.tsx                     # state orchestration, layout, theme
```

## Physics model

All formulas live in `src/physics.ts` as pure functions, so they can be tested
in isolation and reused.

### Constants

| Symbol | Value | Description |
| --- | --- | --- |
| S | 14.86 m² | Wing area |
| W | 7428 N (1670 lb) | Max gross weight |
| AR | 7.32 | Aspect ratio |
| e | 0.75 | Oswald efficiency |
| ρ | 1.225 kg/m³ | Sea-level ISA density |

### Lift coefficient

`computeCL(α, flaps)` is piecewise:

- For α < α<sub>stall</sub>: C<sub>L</sub> = min(slope · (α − α<sub>ZL</sub>), C<sub>L</sub> max)
- For α ≥ α<sub>stall</sub>: C<sub>L</sub> = max(C<sub>L</sub> max − 0.09 · (α − α<sub>stall</sub>), 0.4)

Per-flap configuration:

| Flaps | α<sub>ZL</sub> | slope (/°) | α<sub>stall</sub> | C<sub>L</sub> max | C<sub>D0</sub> |
| --- | --- | --- | --- | --- | --- |
| 0° | −2° | 0.10 | 16° | 1.50 | 0.027 |
| 10° | −4° | 0.10 | 14° | 1.70 | 0.045 |
| 30° | −7° | 0.10 | 12° | 2.10 | 0.085 |

### Drag

`computeCD(C_L, flaps) = C_D0 + k · C_L²` where `k = 1 / (π · AR · e)`.

### Force balance

- Dynamic pressure: `q = ½ ρ V²`
- Lift: `L = q · S · C_L`
- Drag: `D = q · S · C_D`
- Flight-path angle: `γ = asin((T − D) / W)` — iterated when pitch is the
  input variable because drag depends on α = θ − γ. The iteration uses
  damping (factor 0.4) for numerical stability at extreme inputs.
- Load factor: `n = L / W`. In wings-level steady flight n ≈ cos(γ).

### Input modes

- **Set AoA:** α is the independent variable. C<sub>L</sub>, C<sub>D</sub>, L, D
  follow directly. γ is solved from the along-axis balance, then θ = α + γ.
- **Set Pitch:** θ is the independent variable. The model iterates γ until
  `γ = asin((T − D(α=θ−γ)) / W)` converges.

## Force vector conventions (the bit students get wrong)

Drawn from the centre of gravity in `FlightDiagram.tsx`:

1. **Lift (blue)** — perpendicular to the **relative wind** (flight path),
   pointing "up" relative to the wing. **Not** perpendicular to the horizon.
   **Not** perpendicular to the fuselage.
2. **Weight (red)** — straight down toward Earth, **independent of pitch or
   flight path**. Magnitude constant at 7428 N.
3. **Thrust (green)** — along the longitudinal axis of the aircraft. Rotates
   with the pitch attitude, **not** with the flight path.
4. **Drag (amber)** — opposite to the flight path (along the relative wind,
   pointing aft).

Arrow lengths scale linearly with magnitude (weight = 130 px). Animation uses
spring transitions so changes feel physical.

## Assumptions and limitations

Surfaced in-app under "Model assumptions" and worth restating here:

- Lift slope, α<sub>ZL</sub>, α<sub>stall</sub> and C<sub>L</sub> max are
  textbook approximations chosen for pedagogical clarity, not POH data.
- Real C152 stalls are gentler thanks to wing washout (the spanwise twist
  that delays root stall); this is not modelled.
- Thrust is treated as static. Real propeller thrust falls with airspeed —
  the cruise/climb tradeoff is approximate.
- Steady-state, straight, wings-level flight only. Turns, pull-ups, gusts,
  and ground effect are not modelled.
- Sea-level ISA conditions only. Density altitude is not modelled.
- The silhouette is drawn with gear retracted for visual clarity. The C152
  has fixed tricycle gear.
- C172RG-style retracted-gear silhouette has no aerodynamic effect on the
  physics — the C152 drag polars are still in use.

## C152 normal-category limits

- Positive load-factor limit: **+4.4 g**
- Negative load-factor limit: **−1.76 g**

Shown live in the load-factor panel with markers for 30°, 45° and 60° banks.

## Accessibility

- All interactive controls are keyboard-accessible (native sliders, radios,
  buttons). Focus states inherit from Tailwind defaults.
- Charts carry descriptive `aria-label` text plus printed legends.
- The C<sub>L</sub> chart distinguishes flap settings by **line style**
  (solid / dashed / dotted) in addition to colour.
- Auto / light / dark theme switch in the header; auto follows
  `prefers-color-scheme`.
