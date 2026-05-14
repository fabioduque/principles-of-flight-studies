// Aerodynamic study model for a Cessna 152 at sea level ISA, normal category.
// Values are textbook approximations chosen for pedagogical clarity, not POH numbers.

export type Flaps = 0 | 10 | 30;
export type Mode = 'aoa' | 'pitch';
export type FlightStatus =
  | 'level'
  | 'climbing'
  | 'descending'
  | 'near-stall'
  | 'stalled'
  | 'pull-up'    // n > 1: lift exceeds weight, accelerating upward
  | 'unloaded';  // n < 1: lift below weight, accelerating downward

export interface FlapConfig {
  alphaZeroLift: number;
  liftSlope: number;
  alphaStall: number;
  CLmax: number;
  CD0: number;
}

export const FLAP_CONFIGS: Record<Flaps, FlapConfig> = {
  0: { alphaZeroLift: -2, liftSlope: 0.1, alphaStall: 16, CLmax: 1.5, CD0: 0.027 },
  // Flaps 10° on a C152: small extra camber, modest drag rise. Real-world
  // ΔCD₀ ≈ 0.005–0.010 — the previous 0.045 (ΔCD₀ = 0.018) over-penalised
  // partial flaps and pushed otherwise-survivable climbs into stall.
  10: { alphaZeroLift: -4, liftSlope: 0.1, alphaStall: 14, CLmax: 1.7, CD0: 0.034 },
  30: { alphaZeroLift: -7, liftSlope: 0.1, alphaStall: 12, CLmax: 2.1, CD0: 0.085 },
};

export const WING_AREA = 14.86;
export const WEIGHT_N = 7428;
export const ASPECT_RATIO = 7.32;
export const OSWALD_E = 0.75;
export const RHO_SL = 1.225;
export const KT_TO_MS = 0.514444;
export const K_INDUCED = 1 / (Math.PI * ASPECT_RATIO * OSWALD_E);

export const POST_STALL_DROP_PER_DEG = 0.09;
export const CL_FLOOR = 0.4;

export const N_LIMIT_POS = 4.4;
export const N_LIMIT_NEG = -1.76;

export const FLAP_SETTINGS: Flaps[] = [0, 10, 30];

export function knotsToMs(knots: number): number {
  return knots * KT_TO_MS;
}

export function dynamicPressure(V_ms: number, rho = RHO_SL): number {
  return 0.5 * rho * V_ms * V_ms;
}

export function computeCL(alphaDeg: number, flaps: Flaps): number {
  const c = FLAP_CONFIGS[flaps];
  if (alphaDeg < c.alphaStall) {
    const linear = c.liftSlope * (alphaDeg - c.alphaZeroLift);
    return Math.min(linear, c.CLmax);
  }
  const postStall = c.CLmax - POST_STALL_DROP_PER_DEG * (alphaDeg - c.alphaStall);
  return Math.max(postStall, CL_FLOOR);
}

export function computeCD(CL: number, flaps: Flaps): number {
  return FLAP_CONFIGS[flaps].CD0 + K_INDUCED * CL * CL;
}

export function classifyStatus(
  alphaDeg: number,
  gammaDeg: number,
  flaps: Flaps,
  n = 1,
): FlightStatus {
  const c = FLAP_CONFIGS[flaps];
  if (alphaDeg >= c.alphaStall) return 'stalled';
  if (alphaDeg >= c.alphaStall - 2) return 'near-stall';
  // Vertical imbalance: if L is far from W·cos γ, the aircraft is in a
  // transient pull-up or unloaded state, not steady level flight.
  if (n > 1.15) return 'pull-up';
  if (n < 0.85) return 'unloaded';
  if (gammaDeg > 1) return 'climbing';
  if (gammaDeg < -1) return 'descending';
  return 'level';
}

export interface FlightState {
  alpha: number;
  theta: number;
  gamma: number;
  bankDeg: number;
  CL: number;
  CD: number;
  L: number;
  D: number;
  n: number;
  q: number;
  V_ms: number;
  V_kts: number;
  thrust: number;
  flaps: Flaps;
  mode: Mode;
  status: FlightStatus;
}

function buildState(
  alphaDeg: number,
  thetaDeg: number,
  gammaDeg: number,
  V_kts: number,
  thrust: number,
  flaps: Flaps,
  mode: Mode,
  bankDeg = 0,
): FlightState {
  const V_ms = knotsToMs(V_kts);
  const q = dynamicPressure(V_ms);
  const CL = computeCL(alphaDeg, flaps);
  const CD = computeCD(CL, flaps);
  const L = q * WING_AREA * CL;
  const D = q * WING_AREA * CD;
  return {
    alpha: alphaDeg,
    theta: thetaDeg,
    gamma: gammaDeg,
    bankDeg,
    CL,
    CD,
    L,
    D,
    n: L / WEIGHT_N,
    q,
    V_ms,
    V_kts,
    thrust,
    flaps,
    mode,
    status: classifyStatus(alphaDeg, gammaDeg, flaps, L / WEIGHT_N),
  };
}

// AoA-mode solver: the user is exploring the wing's lift curve at a chosen
// AoA. We fix γ = 0 (level flight path) so the aircraft is drawn nose-up by
// exactly α, with lift straight up, drag straight back, and thrust along the
// fuselage axis. The load factor n = L/W then makes the relationship to
// the lift curve direct: at trim α, n ≈ 1; above trim α, n > 1 (pull-up
// state); below trim α, n < 1 (unloaded).
//
// We do NOT solve `γ = asin((T-D)/W)` here because that produces wildly
// non-physical geometry whenever L ≠ W (e.g. high-α explorations: γ goes
// strongly negative and α = θ - γ flips the fuselage nose-down while the
// wing is pulling 4 g — geometrically valid for a transient maneuver but
// the wrong picture for a study aid).
export function solveFromAoA(
  alphaDeg: number,
  V_kts: number,
  thrust: number,
  flaps: Flaps,
): FlightState {
  return buildState(alphaDeg, alphaDeg, 0, V_kts, thrust, flaps, 'aoa');
}

// Pitch-mode solver: perpendicular trim model.
//
// We solve `q·S·CL(θ - γ) = W·cos(γ)` for γ. This is the perpendicular
// force balance — the lift the wing produces equals the weight component
// perpendicular to the flight path. The literal spec equation
// `γ = asin((T − D) / W)` with `α = θ − γ` has no stable pre-stall fixed
// point at typical cruise inputs (small drift in α blows up the iteration
// into stall every time), which is mathematically defensible but
// pedagogically wrong: a pilot setting θ = 1° expects level flight, not a
// fully-stalled descent.
//
// In this model, the user-set thrust does NOT change γ — it represents the
// engine setting, and the "trim thrust" needed for true steady flight is
// computed separately for display.
export function solveFromPitch(
  thetaDeg: number,
  V_kts: number,
  thrust: number,
  flaps: Flaps,
): FlightState {
  const V_ms = knotsToMs(V_kts);
  const q = dynamicPressure(V_ms);
  const c = FLAP_CONFIGS[flaps];

  const residual = (g: number): number => {
    const alpha = thetaDeg - g;
    return (
      q * WING_AREA * computeCL(alpha, flaps) -
      WEIGHT_N * Math.cos((g * Math.PI) / 180)
    );
  };

  // Bracket γ so that α stays in [α_ZL, α_stall - 0.5] (pre-stall band).
  // residual(γ_low) corresponds to large α (high lift, positive residual).
  // residual(γ_high) corresponds to low α (low lift, negative residual).
  let gLow = Math.max(thetaDeg - (c.alphaStall - 0.5), -30);
  let gHigh = Math.min(thetaDeg - c.alphaZeroLift, 30);
  if (gLow >= gHigh) {
    // Degenerate bracket — fall back to centred α
    gLow = thetaDeg - 10;
    gHigh = thetaDeg + 2;
  }

  const fLow = residual(gLow);
  const fHigh = residual(gHigh);

  let gamma: number;
  if (fLow * fHigh > 0) {
    // No sign change in bracket — clamp to the endpoint closest to zero.
    // This happens when V is so low that even at max pre-stall α the wing
    // can't carry W·cos(γ), or so high that even zero-lift α produces too
    // much lift. Use the endpoint whose residual is closer to zero.
    gamma = Math.abs(fLow) < Math.abs(fHigh) ? gLow : gHigh;
  } else {
    gamma = (gLow + gHigh) / 2;
    for (let i = 0; i < 80; i++) {
      const r = residual(gamma);
      if (Math.abs(r) < 0.01) break;
      if (r > 0) gLow = gamma;
      else gHigh = gamma;
      gamma = (gLow + gHigh) / 2;
    }
  }

  const alpha = thetaDeg - gamma;
  return buildState(alpha, thetaDeg, gamma, V_kts, thrust, flaps, 'pitch');
}

// Thrust required for steady flight at a given flight state. Useful to
// compare the engine setting against equilibrium.
export function trimThrust(state: FlightState): number {
  return state.D + WEIGHT_N * Math.sin((state.gamma * Math.PI) / 180);
}

// Realistic pilot-input solver: given pitch attitude (θ), throttle (T) and
// bank angle (φ) at a flap setting, find the steady-state α, γ and V that
// satisfy a coordinated turn:
//   L cos φ = W cos γ        (perpendicular force balance — wing carries n·W)
//   T = D + W sin γ          (along-axis force balance)
//   α = θ − γ                (geometry)
//
// Eliminating V gives a single equation in γ:
//   T/W = cos γ · CD(θ−γ) / (CL(θ−γ) · cos φ) + sin γ
//
// At φ = 0 this reduces to wings-level steady flight. For φ > 0 the wing
// has to produce L = W·cos γ / cos φ, raising CL and dropping V_stall.
//
// STALL HANDLING: if no pre-stall equilibrium exists for the chosen (θ, T, φ)
// — typically because the pilot has over-pitched beyond what the engine can
// support — we declare the wing stalled. The bisection runs in the pre-stall
// band; on "no sign change" we exit that branch, set α = θ (γ ≈ 0 as a
// transient stall geometry), and use stall airspeed Vs as a representative V.
// `computeCL` then returns the post-stall CL automatically, and the resulting
// L < W shows the lift collapse on the diagram.
export function solveFromPitchThrottleBank(
  thetaDeg: number,
  thrust: number,
  bankDeg: number,
  flaps: Flaps,
): FlightState {
  const c = FLAP_CONFIGS[flaps];
  const cosPhi = Math.max(0.01, Math.cos((bankDeg * Math.PI) / 180));

  const residual = (g: number): number => {
    const alpha = thetaDeg - g;
    const CL = computeCL(alpha, flaps);
    if (CL <= 0) return -1;
    const CD = computeCD(CL, flaps);
    return (
      (Math.cos((g * Math.PI) / 180) * CD) / (CL * cosPhi) +
      Math.sin((g * Math.PI) / 180) -
      thrust / WEIGHT_N
    );
  };

  let gLow = Math.max(thetaDeg - (c.alphaStall - 0.5), -55);
  let gHigh = Math.min(thetaDeg - (c.alphaZeroLift + 0.5), 55);
  if (gLow >= gHigh) {
    gLow = thetaDeg - 10;
    gHigh = thetaDeg + 2;
  }

  const rLow = residual(gLow);
  const rHigh = residual(gHigh);

  let gamma: number;
  let stalled = false;

  if (rLow * rHigh > 0) {
    // No pre-stall equilibrium — the airplane is over-pitched for the
    // available thrust. Declare a transient stall: α follows θ (γ≈0), V
    // collapses toward Vs. computeCL will return post-stall CL.
    stalled = true;
    gamma = 0;
  } else {
    gamma = (gLow + gHigh) / 2;
    for (let i = 0; i < 80; i++) {
      const r = residual(gamma);
      if (Math.abs(r) < 1e-5) break;
      if (r < 0) gLow = gamma;
      else gHigh = gamma;
      gamma = (gLow + gHigh) / 2;
    }
  }

  const alpha = thetaDeg - gamma;
  const CL = computeCL(alpha, flaps);
  let V_kts: number;

  if (stalled) {
    // Transient stall airspeed — drop slightly below Vs so the lift collapse
    // is visible on the diagrams (L noticeably < W).
    V_kts = 0.92 * stallSpeed(flaps, bankDeg);
  } else if (CL <= 0) {
    V_kts = 130;
  } else {
    const cosG = Math.cos((gamma * Math.PI) / 180);
    const q = (WEIGHT_N * cosG) / (WING_AREA * CL * cosPhi);
    const V_ms = Math.sqrt(Math.max(0, 2 * q) / RHO_SL);
    V_kts = V_ms / KT_TO_MS;
  }

  return buildState(alpha, thetaDeg, gamma, V_kts, thrust, flaps, 'pitch', bankDeg);
}

// Drag breakdown at level trim flight for a given airspeed and flap setting.
// In level trim L = W ⇒ CL = W/(qS). From that:
//   D_parasite = qS · CD0                (∝ V²)
//   D_induced  = qS · k · CL² = 2kW²/(ρSV²)  (∝ 1/V²)
//   D_total    = D_parasite + D_induced  (U-shape, min at L/D max)
export function dragAtTrim(V_kts: number, flaps: Flaps): {
  V_kts: number;
  parasite: number;
  induced: number;
  total: number;
} {
  const V = knotsToMs(V_kts);
  const q = dynamicPressure(V);
  const qS = q * WING_AREA;
  const CL = WEIGHT_N / qS;
  const c = FLAP_CONFIGS[flaps];
  const parasite = qS * c.CD0;
  const induced = qS * K_INDUCED * CL * CL;
  return { V_kts, parasite, induced, total: parasite + induced };
}

// Sample the drag-vs-V curve at trim for charting.
export function sampleDragCurve(flaps: Flaps, vMin = 35, vMax = 130, step = 1) {
  const out: { V: number; parasite: number; induced: number; total: number }[] = [];
  for (let v = vMin; v <= vMax + 1e-9; v += step) {
    const d = dragAtTrim(v, flaps);
    out.push({ V: Math.round(v), parasite: d.parasite, induced: d.induced, total: d.total });
  }
  return out;
}

// Stall speed (KIAS, sea-level ISA) at a given flap setting and bank angle.
// V_s = sqrt(2 · n · W / (ρ · S · CL_max)) where n = 1/cos φ in a level turn.
export function stallSpeed(flaps: Flaps, bankDeg = 0): number {
  const c = FLAP_CONFIGS[flaps];
  const cosPhi = Math.cos((bankDeg * Math.PI) / 180);
  const n = 1 / Math.max(cosPhi, 0.01);
  const V_ms = Math.sqrt((2 * n * WEIGHT_N) / (RHO_SL * WING_AREA * c.CLmax));
  return V_ms / KT_TO_MS;
}

export function loadFactorForBank(bankDeg: number): number {
  const rad = (bankDeg * Math.PI) / 180;
  return 1 / Math.cos(rad);
}

// AoA required to produce L = W at airspeed V_kts and the given flap setting,
// assuming sea-level ISA and γ ≈ 0 (so cos γ ≈ 1). This is the AoA the pilot
// would actually fly at in level cruise. Adding flaps shifts the lift curve
// up/left and lowers this trim AoA — the visible "pitch down with flaps".
export function trimAlpha(V_kts: number, flaps: Flaps): number {
  const q = dynamicPressure(knotsToMs(V_kts));
  const CL_needed = WEIGHT_N / (q * WING_AREA);
  const c = FLAP_CONFIGS[flaps];
  return CL_needed / c.liftSlope + c.alphaZeroLift;
}

// Trim airspeed for the given α: V such that q·S·CL(α) = W (level trim).
// Returns kt. Returns NaN if CL is non-positive (α below zero-lift).
export function trimVFromAlpha(alphaDeg: number, flaps: Flaps): number {
  const CL = computeCL(alphaDeg, flaps);
  if (CL <= 0) return NaN;
  const V_ms = Math.sqrt((2 * WEIGHT_N) / (RHO_SL * WING_AREA * CL));
  return V_ms / KT_TO_MS;
}

// Thrust required for level trim at the given α (T = D when γ = 0).
// In level trim T = W · CD / CL — the engine has to overcome drag while
// the wing carries weight.
export function trimThrustFromAlpha(alphaDeg: number, flaps: Flaps): number {
  const CL = computeCL(alphaDeg, flaps);
  const CD = computeCD(CL, flaps);
  if (CL <= 0) return NaN;
  return (WEIGHT_N * CD) / CL;
}

// Inverse: given a thrust setting (for level trim), find the trim α that
// makes T = D. From T = W·(CD0 + k·CL²)/CL we get k·CL² − (T/W)·CL + CD0 = 0,
// a quadratic in CL. There are normally two roots: a low-α "front-side" of
// the power curve and a high-α "back-side". We default to the front-side
// (normal cruise regime). If T is below the minimum drag value, we clamp
// to the L/D-max point.
export function trimAlphaFromThrust(thrustN: number, flaps: Flaps): number {
  const c = FLAP_CONFIGS[flaps];
  const tw = thrustN / WEIGHT_N;
  const disc = tw * tw - 4 * K_INDUCED * c.CD0;
  let CL: number;
  if (disc < 0) {
    // Below min drag: snap to (L/D)_max
    CL = Math.sqrt(c.CD0 / K_INDUCED);
  } else {
    CL = (tw - Math.sqrt(disc)) / (2 * K_INDUCED);
    if (CL <= 0) CL = Math.sqrt(c.CD0 / K_INDUCED);
  }
  return CL / c.liftSlope + c.alphaZeroLift;
}

// Minimum thrust the engine needs for level trim (occurs at L/D max).
export function minLevelThrust(flaps: Flaps): number {
  const c = FLAP_CONFIGS[flaps];
  return 2 * WEIGHT_N * Math.sqrt(K_INDUCED * c.CD0);
}

export function sampleCLCurve(
  flaps: Flaps,
  step = 0.5,
  min = -6,
  max = 24,
): { alpha: number; CL: number }[] {
  const out: { alpha: number; CL: number }[] = [];
  for (let a = min; a <= max + 1e-9; a += step) {
    out.push({ alpha: Number(a.toFixed(2)), CL: computeCL(a, flaps) });
  }
  return out;
}

export interface Preset {
  name: string;
  mode: Mode;
  alpha?: number;
  theta?: number;
  V_kts: number;
  thrust: number;
  flaps: Flaps;
}

export const PRESETS: Preset[] = [
  { name: 'Cruise', mode: 'pitch', theta: 2, V_kts: 95, thrust: 720, flaps: 0 },
  { name: 'Vy climb', mode: 'pitch', theta: 10, V_kts: 67, thrust: 1100, flaps: 0 },
  { name: 'Approach', mode: 'pitch', theta: -3, V_kts: 65, thrust: 300, flaps: 30 },
  { name: 'Engine out (glide)', mode: 'pitch', theta: -4, V_kts: 67, thrust: 0, flaps: 0 },
  { name: 'Stall', mode: 'pitch', theta: 16, V_kts: 50, thrust: 400, flaps: 0 },
];
