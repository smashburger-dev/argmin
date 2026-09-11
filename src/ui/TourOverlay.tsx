// Spotlight tour overlay. An SVG dim with a rounded cutout tracks the step's
// [data-tour] anchor (the shadow trick fails over the topbar/backdrop-filter
// stacking contexts, hence the mask). Step state lives in App.tsx; this
// component only measures, positions the card and reports intents.
import { createPortal } from 'preact/compat';
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Button } from './Button';
import { TOUR_STEPS } from './tour-steps';

const PAD = 8;
const CORNER = 10;
const GAP = 12;
const EDGE = 12;
const CARD_WIDTH = 360;
const SHEET_MAX = 640;
const TARGET_WAIT_MS = 1500;

interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Geometry {
  rect: Box | null;
  vw: number;
  vh: number;
}

const centered = (): Geometry => ({ rect: null, vw: window.innerWidth, vh: window.innerHeight });

const toBox = (rect: { top: number; right: number; bottom: number; left: number }): Box => (
  { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
);

// Full-viewport rect plus a clockwise rounded hole; evenodd fills only the dim.
function dimPath(rect: Box | null, vw: number, vh: number): string {
  const full = `M0 0H${vw}V${vh}H0Z`;
  if (!rect) return full;
  const x = Math.max(0, rect.left - PAD);
  const y = Math.max(0, rect.top - PAD);
  const x2 = Math.min(vw, rect.right + PAD);
  const y2 = Math.min(vh, rect.bottom + PAD);
  const r = Math.min(CORNER, (x2 - x) / 2, (y2 - y) / 2);
  return `${full}M${x + r} ${y}H${x2 - r}A${r} ${r} 0 0 1 ${x2} ${y + r}V${y2 - r}A${r} ${r} 0 0 1 ${x2 - r} ${y2}H${x + r}A${r} ${r} 0 0 1 ${x} ${y2 - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export function TourOverlay({ step, onNext, onPrev, onClose }: {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const stepDef = TOUR_STEPS[step];
  const target = stepDef?.target;
  const [geom, setGeom] = useState<Geometry>(centered);
  const [cardHeight, setCardHeight] = useState(220);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [onClose]);

  useLayoutEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const find = () => (target ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`) : null);
    const remeasure = () => {
      const el = find();
      const rect = el?.getBoundingClientRect();
      if (!el || !rect || rect.width === 0) { setGeom(centered()); return; }
      setGeom({ rect: toBox(rect), vw: window.innerWidth, vh: window.innerHeight });
    };
    let raf = 0;
    if (!target) {
      setGeom(centered());
    } else {
      let seen = false;
      let cleared = false;
      const deadline = performance.now() + TARGET_WAIT_MS;
      const tick = () => {
        const el = find();
        if (!el || el.getBoundingClientRect().width === 0) {
          seen = false;
          if (!cleared) {
            cleared = true;
            setGeom(centered());
          }
          if (performance.now() < deadline) raf = requestAnimationFrame(tick);
          return;
        }
        // One extra frame lets the router's scroll-to-top land before we
        // scroll the target back into view and read its rect.
        if (!seen) {
          seen = true;
          raf = requestAnimationFrame(tick);
          return;
        }
        document.body.style.overflow = '';
        el.scrollIntoView({ block: 'center' });
        document.body.style.overflow = 'hidden';
        setGeom({ rect: toBox(el.getBoundingClientRect()), vw: window.innerWidth, vh: window.innerHeight });
        headingRef.current?.focus();
      };
      tick();
    }
    addEventListener('resize', remeasure);
    addEventListener('scroll', remeasure, true);
    addEventListener('hashchange', remeasure);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', remeasure);
      removeEventListener('scroll', remeasure, true);
      removeEventListener('hashchange', remeasure);
      document.body.style.overflow = prevOverflow;
    };
  }, [step, target]);

  useLayoutEffect(() => {
    const height = cardRef.current?.getBoundingClientRect().height;
    if (height && Math.abs(height - cardHeight) > 1) setCardHeight(height);
  });

  if (!stepDef) return null;

  const hole: Box | null = geom.rect ? {
    top: Math.max(0, geom.rect.top - PAD),
    right: Math.min(geom.vw, geom.rect.right + PAD),
    bottom: Math.min(geom.vh, geom.rect.bottom + PAD),
    left: Math.max(0, geom.rect.left - PAD),
  } : null;

  let placement: 'anchored' | 'center' | 'sheet' = 'center';
  let style: JSX.CSSProperties | undefined;
  if (hole) {
    const { vw, vh } = geom;
    const cardWidth = Math.min(CARD_WIDTH, vw - EDGE * 2);
    const clampedLeft = Math.min(Math.max(EDGE, hole.left + (hole.right - hole.left) / 2 - cardWidth / 2), Math.max(EDGE, vw - cardWidth - EDGE));
    const belowTop = hole.bottom + GAP;
    const aboveTop = hole.top - GAP - cardHeight;
    const fitsBelow = belowTop + cardHeight <= vh - EDGE;
    const fitsAbove = aboveTop >= EDGE;
    if (vw <= SHEET_MAX) {
      // Bottom sheet, unless it would cover the highlighted element itself.
      if (fitsAbove && hole.bottom + GAP + cardHeight > vh - EDGE) {
        placement = 'anchored';
        style = { top: aboveTop, left: EDGE };
      } else {
        placement = 'sheet';
      }
    } else {
      const preferBelow = hole.top + (hole.bottom - hole.top) / 2 < vh / 2;
      // Full-height or very wide holes (the sidebar) never fit above/below;
      // they anchor the card sideways instead of falling back to the sheet.
      const fitsRight = hole.right + GAP + cardWidth <= vw - EDGE;
      const fitsLeft = hole.left - GAP - cardWidth >= EDGE;
      const sideTop = Math.min(Math.max(EDGE, hole.top + (hole.bottom - hole.top) / 2 - cardHeight / 2), Math.max(EDGE, vh - cardHeight - EDGE));
      if ((preferBelow && fitsBelow) || (!preferBelow && fitsAbove)) {
        placement = 'anchored';
        style = { top: preferBelow ? belowTop : aboveTop, left: clampedLeft };
      } else if (fitsBelow || fitsAbove) {
        placement = 'anchored';
        style = { top: fitsBelow ? belowTop : aboveTop, left: clampedLeft };
      } else if (fitsRight || fitsLeft) {
        placement = 'anchored';
        style = { top: sideTop, left: fitsRight ? hole.right + GAP : hole.left - GAP - cardWidth };
      } else {
        // Huge holes that leave no clean side: hug whichever hole edge keeps
        // most of the card outside the highlight instead of covering its middle.
        const spaceAbove = hole.top - EDGE;
        const spaceBelow = vh - EDGE - hole.bottom;
        if (Math.max(spaceAbove, spaceBelow) > 80) {
          placement = 'anchored';
          style = spaceAbove >= spaceBelow
            ? { top: Math.max(EDGE, hole.top - GAP - cardHeight), left: clampedLeft }
            : { top: Math.min(belowTop, vh - EDGE - cardHeight), left: clampedLeft };
        } else {
          placement = 'sheet';
        }
      }
    }
  }

  const last = step === TOUR_STEPS.length - 1;
  return createPortal(
    <div class="tour-layer">
      <svg class="tour-dim" viewBox={`0 0 ${geom.vw} ${geom.vh}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={dimPath(geom.rect, geom.vw, geom.vh)} fill="rgb(10 10 14 / .55)" fill-rule="evenodd" />
      </svg>
      {hole ? <div class="tour-glow" aria-hidden="true" style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }} /> : null}
      <section class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" data-placement={placement} style={style} ref={cardRef}>
        <Button variant="ghost" size="sm" class="tour-close" aria-label="Rundgang schließen" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" /></svg>
        </Button>
        <p class="tour-kicker">
          <span>Schritt {step + 1} von {TOUR_STEPS.length}</span>
          <span class="tour-dots" aria-hidden="true">{TOUR_STEPS.map((item) => <span key={item.id} class={item.id === stepDef.id ? 'is-active' : undefined} />)}</span>
        </p>
        <h2 id="tour-title" tabIndex={-1} ref={headingRef}>{stepDef.title}</h2>
        <p class="tour-body">{stepDef.body}</p>
        {step === 0 ? (
          <div class="tour-actions">
            <Button variant="primary" onClick={onNext}>Tour starten</Button>
            <Button variant="ghost" onClick={onClose}>Später</Button>
          </div>
        ) : (
          <div class="tour-actions">
            <Button variant="ghost" size="sm" onClick={onPrev}>Zurück</Button>
            <Button variant="primary" size="sm" onClick={onNext}>{last ? 'Fertig' : 'Weiter'}</Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Tour beenden</Button>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
