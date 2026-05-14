import type { Flaps } from '../physics';
import { FLAP_SETTINGS, PRESETS } from '../physics';

interface Props {
  flaps: Flaps;
  setFlaps: (f: Flaps) => void;
  theta: number;
  setTheta: (t: number) => void;
  thrust: number;
  setThrust: (t: number) => void;
  bank: number;
  setBank: (b: number) => void;
  onPreset: (name: string) => void;
  onReset: () => void;
}

const BANK_PRESETS = [0, 10, 30, 60];
const MAX_THRUST = 1100;

function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  marks,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  marks?: { at: number; label?: string }[];
}) {
  return (
    <div>
      <label className="flex items-baseline justify-between mb-1.5 gap-2">
        <span className="text-sm font-semibold text-fg">{label}</span>
        <span className="num text-base text-fg">
          {formatValue ? formatValue(value) : value.toFixed(0)}
          <span className="text-fg-mute text-xs ml-1 font-normal">{unit}</span>
        </span>
      </label>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {marks && marks.length > 0 && (
          <div className="relative h-3 text-[9px] text-fg-mute num">
            {marks.map((m, i) => {
              const pct = ((m.at - min) / (max - min)) * 100;
              return (
                <span
                  key={i}
                  style={{ left: `${pct}%` }}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                >
                  {m.label ?? m.at}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ControlPanel({
  flaps,
  setFlaps,
  theta,
  setTheta,
  thrust,
  setThrust,
  bank,
  setBank,
  onPreset,
  onReset,
}: Props) {
  return (
    <div className="p-4 sm:p-5 space-y-5">
      <Slider
        label="Pitch (yoke)"
        unit="°"
        value={theta}
        min={-10}
        max={20}
        step={0.5}
        onChange={setTheta}
        formatValue={(v) => (v > 0 ? '+' : '') + v.toFixed(1)}
        marks={[
          { at: -10, label: '↓ nose' },
          { at: 0, label: 'level' },
          { at: 20, label: 'nose ↑' },
        ]}
      />

      <Slider
        label="Throttle"
        unit="%"
        value={thrust}
        min={0}
        max={MAX_THRUST}
        step={10}
        onChange={setThrust}
        formatValue={(v) => `${Math.round((v / MAX_THRUST) * 100)}`}
        marks={[
          { at: 0, label: 'cut' },
          { at: MAX_THRUST / 2, label: '50%' },
          { at: MAX_THRUST, label: 'full' },
        ]}
      />

      <div>
        <Slider
          label="Bank (aileron)"
          unit="°"
          value={bank}
          min={0}
          max={75}
          step={1}
          onChange={setBank}
          marks={[
            { at: 0, label: 'level' },
            { at: 30 },
            { at: 60 },
          ]}
        />
        <div className="mt-2 flex gap-1.5">
          {BANK_PRESETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBank(b)}
              className={`btn ${bank === b ? 'is-active' : ''}`}
              aria-pressed={bank === b}
            >
              {b}°
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-fg block mb-1.5">Flaps</label>
        <div className="flex gap-1.5">
          {FLAP_SETTINGS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFlaps(f)}
              className={`btn flex-1 ${f === flaps ? 'is-active' : ''}`}
              aria-pressed={f === flaps}
            >
              {f}°
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-app">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-fg">Presets</span>
          <button type="button" onClick={onReset} className="btn-ghost btn text-xs">
            ↺ Reset
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onPreset(p.name)}
              className="btn text-xs"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
