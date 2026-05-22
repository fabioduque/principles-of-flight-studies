import { describe, it, expect } from 'vitest';
import {
  computeCL,
  computeCD,
  dynamicPressure,
  knotsToMs,
  solveFromAoA,
  solveFromPitch,
  loadFactorForBank,
  classifyStatus,
  WEIGHT_N,
  WING_AREA,
  FLAP_CONFIGS,
  K_INDUCED,
} from './physics';

describe('unit conversions', () => {
  it('converts 100 kt to ~51.44 m/s', () => {
    expect(knotsToMs(100)).toBeCloseTo(51.4444, 3);
  });
  it('dynamic pressure formula', () => {
    expect(dynamicPressure(50)).toBeCloseTo(0.5 * 1.225 * 2500, 5);
  });
});

describe('lift coefficient', () => {
  it('CL is zero at α_ZL for clean wing', () => {
    expect(computeCL(-2, 0)).toBeCloseTo(0, 6);
  });
  it('CL is zero at α_ZL for flaps 10', () => {
    expect(computeCL(-4, 10)).toBeCloseTo(0, 6);
  });
  it('CL is zero at α_ZL for flaps 30', () => {
    expect(computeCL(-7, 30)).toBeCloseTo(0, 6);
  });
  it('linear slope of 0.10/° pre-stall (clean wing)', () => {
    expect(computeCL(8, 0)).toBeCloseTo(1.0, 6);
  });
  it('peaks at CL_max exactly at the critical AoA', () => {
    const c = FLAP_CONFIGS[0];
    expect(computeCL(c.alphaStall, 0)).toBeCloseTo(c.CLmax, 6);
  });
  it('peak is rounded (no plateau) — CL strictly below CL_max just before stall', () => {
    const c = FLAP_CONFIGS[0];
    // 2° below the peak the rounded curve should still be measurably below CLmax
    expect(computeCL(c.alphaStall - 2, 0)).toBeLessThan(c.CLmax - 0.01);
  });
  it('drops post-stall by 0.09 per degree well past stall', () => {
    const c = FLAP_CONFIGS[0];
    // Past the post-stall rounding zone (4°) the drop is linear at -0.09/°
    const CL = computeCL(c.alphaStall + 6, 0);
    expect(CL).toBeCloseTo(c.CLmax - 0.09 * 6, 4);
  });
  it('post-stall has a floor of 0.4', () => {
    expect(computeCL(40, 0)).toBeCloseTo(0.4, 6);
  });
  it('higher flap setting raises CL at same AoA (pre-stall)', () => {
    expect(computeCL(5, 30)).toBeGreaterThan(computeCL(5, 0));
  });
});

describe('drag coefficient', () => {
  it('equals CD0 when CL is zero', () => {
    expect(computeCD(0, 0)).toBeCloseTo(0.027, 6);
    expect(computeCD(0, 30)).toBeCloseTo(0.085, 6);
  });
  it('adds induced drag k·CL²', () => {
    const CL = 1.0;
    expect(computeCD(CL, 0)).toBeCloseTo(0.027 + K_INDUCED, 6);
  });
});

describe('status classification', () => {
  it('detects stall when α ≥ α_stall', () => {
    expect(classifyStatus(16, 0, 0)).toBe('stalled');
    expect(classifyStatus(20, 0, 0)).toBe('stalled');
  });
  it('detects near-stall just below α_stall', () => {
    expect(classifyStatus(15, 0, 0)).toBe('near-stall');
  });
  it('detects climbing when γ > 1°', () => {
    expect(classifyStatus(2, 5, 0)).toBe('climbing');
  });
  it('detects descending when γ < -1°', () => {
    expect(classifyStatus(2, -5, 0)).toBe('descending');
  });
  it('reports level inside ±1° γ band', () => {
    expect(classifyStatus(2, 0.5, 0)).toBe('level');
  });
});

describe('solveFromAoA — wing exploration (γ = 0)', () => {
  it('γ is exactly 0 (level flight path is assumed)', () => {
    const s = solveFromAoA(2, 90, 600, 0);
    expect(s.gamma).toBe(0);
  });
  it('θ equals α when γ = 0', () => {
    const s = solveFromAoA(5, 80, 700, 10);
    expect(s.theta).toBe(5);
  });
  it('at α=2°, 90 kt, flaps 0 → near-trim n ≈ 1', () => {
    const s = solveFromAoA(2, 90, 600, 0);
    expect(s.alpha).toBeCloseTo(2, 5);
    expect(s.n).toBeGreaterThan(0.95);
    expect(s.n).toBeLessThan(1.15);
    expect(s.status).toBe('level');
  });
  it('lift increases with α (pre-stall)', () => {
    const low = solveFromAoA(2, 90, 600, 0);
    const high = solveFromAoA(8, 90, 600, 0);
    expect(high.L).toBeGreaterThan(low.L);
  });
  it('at α=16°, flaps 0 → stalled and CL ≤ CL_max', () => {
    const s = solveFromAoA(16, 60, 600, 0);
    expect(s.status).toBe('stalled');
    expect(s.CL).toBeLessThanOrEqual(FLAP_CONFIGS[0].CLmax + 1e-6);
  });
  it('at α=18°, flaps 0 → CL strictly below CL_max', () => {
    const s = solveFromAoA(18, 60, 600, 0);
    expect(s.status).toBe('stalled');
    expect(s.CL).toBeLessThan(FLAP_CONFIGS[0].CLmax);
  });
});

describe('solveFromPitch — trim model', () => {
  it('converges to sensible state in cruise (θ=2°, 95 kt, T=650, flaps 0)', () => {
    const s = solveFromPitch(2, 95, 650, 0);
    expect(Number.isFinite(s.gamma)).toBe(true);
    expect(Number.isFinite(s.alpha)).toBe(true);
    expect(s.alpha).toBeCloseTo(s.theta - s.gamma, 5);
    // not stalled
    expect(s.status).not.toBe('stalled');
  });
  it('θ = 1° at 95 kt resolves to near-level flight, not stalled', () => {
    const s = solveFromPitch(1, 95, 650, 0);
    expect(s.status).not.toBe('stalled');
    expect(s.alpha).toBeLessThan(5);
    expect(Math.abs(s.n - 1)).toBeLessThan(0.1);
  });
  it('lift equals W·cos(γ) at trim (perpendicular balance)', () => {
    const s = solveFromPitch(3, 90, 600, 0);
    const Wcos = 7428 * Math.cos((s.gamma * Math.PI) / 180);
    expect(s.L).toBeCloseTo(Wcos, 0);
  });
  it('θ readout equals input pitch exactly', () => {
    const s = solveFromPitch(7, 80, 500, 10);
    expect(s.theta).toBe(7);
  });
  it('does not throw across full thrust range', () => {
    expect(() => solveFromPitch(5, 80, 0, 0)).not.toThrow();
    expect(() => solveFromPitch(5, 80, 1100, 0)).not.toThrow();
  });
});

describe('load factor in level turns', () => {
  it('n=1 at 0° bank', () => {
    expect(loadFactorForBank(0)).toBeCloseTo(1, 6);
  });
  it('n≈1.155 at 30° bank', () => {
    expect(loadFactorForBank(30)).toBeCloseTo(1.1547, 4);
  });
  it('n≈1.414 at 45° bank', () => {
    expect(loadFactorForBank(45)).toBeCloseTo(Math.SQRT2, 4);
  });
  it('n=2 at 60° bank', () => {
    expect(loadFactorForBank(60)).toBeCloseTo(2, 4);
  });
});

describe('sanity — magnitudes', () => {
  it('weight equals 7428 N', () => {
    expect(WEIGHT_N).toBe(7428);
  });
  it('wing area equals 14.86 m²', () => {
    expect(WING_AREA).toBe(14.86);
  });
});

describe('trim AoA vs flaps — the pitch-down effect', () => {
  it('adding flaps at same V lowers the trim AoA', async () => {
    const { trimAlpha } = await import('./physics');
    const clean = trimAlpha(95, 0);
    const partial = trimAlpha(95, 10);
    const full = trimAlpha(95, 30);
    expect(partial).toBeLessThan(clean);
    expect(full).toBeLessThan(partial);
  });
  it('trim α at 95 kt clean is roughly 1.4°', async () => {
    const { trimAlpha } = await import('./physics');
    expect(trimAlpha(95, 0)).toBeCloseTo(1.42, 1);
  });
});

describe('solveFromPitchThrottleBank', () => {
  it('wings level cruise at θ=2°, T=720, φ=0 → near level, n≈1', async () => {
    const { solveFromPitchThrottleBank } = await import('./physics');
    const s = solveFromPitchThrottleBank(2, 720, 0, 0);
    expect(Math.abs(s.gamma)).toBeLessThan(2);
    expect(s.n).toBeGreaterThan(0.95);
    expect(s.n).toBeLessThan(1.05);
  });
  it('engine out best-glide: pitch ≈ 0°, T=0 → ~68 kt at ~-4.5° glide angle', async () => {
    const { solveFromPitchThrottleBank } = await import('./physics');
    const s = solveFromPitchThrottleBank(0, 0, 0, 0);
    expect(s.gamma).toBeLessThan(-3);
    expect(s.gamma).toBeGreaterThan(-6);
    expect(s.V_kts).toBeGreaterThan(60);
    expect(s.V_kts).toBeLessThan(80);
  });
  it('bank=60° raises load factor to ≈2', async () => {
    const { solveFromPitchThrottleBank } = await import('./physics');
    const s = solveFromPitchThrottleBank(4, 900, 60, 0);
    expect(s.n).toBeGreaterThan(1.8);
    expect(s.n).toBeLessThan(2.2);
  });
});

describe('stall speed scales with bank', () => {
  it('Vs clean roughly matches POH (~45-50 kt)', async () => {
    const { stallSpeed } = await import('./physics');
    const Vs = stallSpeed(0, 0);
    expect(Vs).toBeGreaterThan(40);
    expect(Vs).toBeLessThan(55);
  });
  it('Vs at 60° bank is ~sqrt(2) × wings-level Vs', async () => {
    const { stallSpeed } = await import('./physics');
    expect(stallSpeed(0, 60) / stallSpeed(0, 0)).toBeCloseTo(Math.SQRT2, 1);
  });
  it('flaps 30 lowers Vs', async () => {
    const { stallSpeed } = await import('./physics');
    expect(stallSpeed(30, 0)).toBeLessThan(stallSpeed(0, 0));
  });
});

describe('reactive trim sliders', () => {
  it('trim V from α and trim α from V are inverses', async () => {
    const { trimVFromAlpha, trimAlpha } = await import('./physics');
    const V = trimVFromAlpha(2, 0);
    expect(trimAlpha(V, 0)).toBeCloseTo(2, 5);
  });
  it('trim α derived from a thrust setting recovers consistent T', async () => {
    const { trimAlphaFromThrust, trimThrustFromAlpha } = await import('./physics');
    const a = trimAlphaFromThrust(700, 0);
    expect(trimThrustFromAlpha(a, 0)).toBeCloseTo(700, 0);
  });
  it('higher airspeed gives lower trim AoA', async () => {
    const { trimAlpha } = await import('./physics');
    expect(trimAlpha(60, 0)).toBeGreaterThan(trimAlpha(100, 0));
  });
  it('higher trim AoA gives lower trim airspeed', async () => {
    const { trimVFromAlpha } = await import('./physics');
    expect(trimVFromAlpha(2, 0)).toBeGreaterThan(trimVFromAlpha(8, 0));
  });
});
