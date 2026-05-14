// Drop-in wrapper that adds an "expand" button to a card. When clicked,
// the card content renders again in a fullscreen modal with mouse-wheel
// zoom + drag-to-pan. The modal does NOT trap the keyboard so the global
// keyboard-piloting bindings (WASD / arrows / R/F / T/G / X / K) remain
// active inside it — handy for live demos and lectures.

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

interface Props {
  title: string;
  aside?: React.ReactNode;
  /** Render-prop returning the chart/diagram content. Called once inline
   *  and again inside the modal — must be safe to re-mount. */
  children: (mode: 'inline' | 'modal') => React.ReactNode;
  /** Fires whenever the modal opens or closes. Used by the parent to
   *  force-collapse the pilot console so the user can still see live
   *  state and keep keyboard-piloting under the modal. */
  onOpenChange?: (open: boolean) => void;
}

export function ZoomableCard({ title, aside, children, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  // Only signal transitions — NOT the initial mount-with-open=false. Otherwise
  // four cards would each fire onOpenChange(false) on mount, pushing the
  // parent's counter to -4 before the user clicks anything.
  useEffect(() => {
    if (!open) return;
    onOpenChange?.(true);
    return () => onOpenChange?.(false);
  }, [open, onOpenChange]);
  return (
    <>
      <div className="card flex flex-col h-full relative">
        <div className="card-header">
          <span className="card-header-title">{title}</span>
          <div className="flex items-center gap-2">
            {aside && <span className="card-header-aside">{aside}</span>}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center w-6 h-6 transition-colors hover:bg-soft"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-elev)' }}
              title="Expand"
              aria-label="Expand chart"
            >
              <ExpandIcon />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">{children('inline')}</div>
      </div>
      {open && (
        <ZoomModal title={title} onClose={() => setOpen(false)}>
          {children('modal')}
        </ZoomModal>
      )}
    </>
  );
}

function ExpandIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 5 V2 H5 M10 5 V2 H7 M2 7 V10 H5 M10 7 V10 H7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M3 3 L11 11 M11 3 L3 11" />
    </svg>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ZoomModal({ title, onClose, children }: ModalProps) {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Esc closes (do NOT close on K so keyboard piloting still works).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    // Zoom toward cursor — adjust translation so the point under the cursor
    // stays fixed in the viewport.
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.min(8, Math.max(0.5, scale * factor));
    const k = newScale / scale;
    setTx((p) => cx - (cx - p) * k);
    setTy((p) => cy - (cy - p) * k);
    setScale(newScale);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setTx(d.tx + (e.clientX - d.x));
    setTy(d.ty + (e.clientY - d.y));
  }
  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
  }

  function reset() { setScale(1); setTx(0); setTy(0); }

  return (
    <div
      className="fixed top-0 inset-x-0 z-[100] flex flex-col"
      // Leave the bottom 96 px untouched so the (force-collapsed) pilot
      // console stays visible — student can monitor state and keep flying
      // with the keyboard while inspecting the chart in detail.
      style={{
        bottom: 96,
        background: 'color-mix(in srgb, var(--bg) 96%, transparent)',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* Modal cartouche */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-app" style={{ background: 'var(--bg-soft)' }}>
        <span className="card-header-title">{title}</span>
        <div className="flex items-center gap-3">
          <div
            className="num text-fg-soft"
            style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
            aria-live="polite"
          >
            {Math.round(scale * 100)}%
          </div>
          <button type="button" onClick={() => setScale((s) => Math.max(0.5, s / 1.2))} className="btn px-2 py-0.5 text-xs" title="Zoom out">−</button>
          <button type="button" onClick={reset} className="btn px-2 py-0.5 text-xs" title="Reset">{t.reset}</button>
          <button type="button" onClick={() => setScale((s) => Math.min(8, s * 1.2))} className="btn px-2 py-0.5 text-xs" title="Zoom in">+</button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 ml-2 transition-colors hover:bg-hover"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-elev)' }}
            aria-label="Close"
            title="Esc"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Zoom viewport */}
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: dragRef.current ? 'none' : 'transform 0.08s linear',
          }}
        >
          {children}
        </div>
      </div>

      {/* Hints strip */}
      <div className="px-4 py-1.5 border-t border-app flex items-center gap-4 text-fg-mute num" style={{ fontSize: 9.5, background: 'var(--bg-soft)' }}>
        <span>wheel · zoom</span>
        <span>drag · pan</span>
        <span>esc · close</span>
        <span className="ml-auto" style={{ color: 'var(--accent)' }}>
          keyboard piloting still active
        </span>
      </div>
    </div>
  );
}
