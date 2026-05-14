// A drafting-style red stamp shown across charts/diagrams when the wing
// is stalled. Pulses subtly to catch attention. Placed inside a `position:
// relative` parent in the corner.

import { useI18n } from '../i18n';

interface Props {
  /** Corner placement. Defaults to top-right. */
  position?: 'tr' | 'tl' | 'br' | 'bl';
}

export function StallStamp({ position = 'tr' }: Props) {
  const { t } = useI18n();
  const placement: React.CSSProperties =
    position === 'tr' ? { top: 8, right: 8 } :
    position === 'tl' ? { top: 8, left: 8 } :
    position === 'br' ? { bottom: 8, right: 8 } :
    { bottom: 8, left: 8 };
  return (
    <div
      className="absolute z-10 pointer-events-none flex items-center gap-1.5 px-2 py-1"
      style={{
        ...placement,
        background: 'var(--c-weight)',
        color: 'var(--bg-elev)',
        border: '1.5px solid var(--c-weight)',
        boxShadow: '0 0 0 1px var(--bg-elev), 0 2px 6px rgba(0,0,0,0.25)',
        animation: 'pulse 1.4s ease-in-out infinite',
        fontFamily: "'IBM Plex Sans Condensed', system-ui",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
      }}
      aria-label="Wing stalled"
    >
      <span style={{ fontSize: 11 }}>⚠</span>
      <span>{t.stalledStamp}</span>
    </div>
  );
}
