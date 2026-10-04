import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { GlossaryEntry } from '../app/types';
import { loadGlossary } from '../adapters/content-repository';
import { MathMarkup } from './MathMarkup';
import { Button } from './Button';

// Short definition popup inside a lesson (§9 „Lexikon"): glossary links stay
// on the page, the popover anchors under the link on wide screens and docks
// as a bottom sheet on narrow ones.

type PopoverState = { termId: string; anchor: HTMLElement };

export function useGlossaryPopover() {
  const [state, setState] = useState<PopoverState | null>(null);
  const onClickCapture = (event: MouseEvent) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#/glossary/"]');
    if (!link) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    const termId = link.getAttribute('href')!.replace('#/glossary/', '');
    setState((current) => (current && current.anchor === link ? null : { termId, anchor: link }));
  };
  const close = () => setState(null);
  const popover = state ? <GlossaryPopover termId={state.termId} anchor={state.anchor} onClose={close} /> : null;
  return { popover, onClickCapture };
}

function GlossaryPopover({ termId, anchor, onClose }: { termId: string; anchor: HTMLElement; onClose: () => void }) {
  const [entry, setEntry] = useState<GlossaryEntry | null>(null);
  const [error, setError] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let live = true;
    loadGlossary()
      .then((all) => { if (live) setEntry(all.find((item) => item.termId === termId) ?? null); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [termId]);
  useLayoutEffect(() => {
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(min-width: 641px)').matches) {
      setPos(null);
      return;
    }
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const dialog = dialogRef.current;
      const width = Math.min(dialog?.offsetWidth || 352, 352);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const height = dialog?.offsetHeight || 0;
      const fitsBelow = rect.bottom + 8 + height <= window.innerHeight - 12;
      setPos({ top: fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - height - 8), left });
    };
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', schedule, { capture: true, passive: true });
    addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', schedule, { capture: true });
      removeEventListener('resize', schedule);
    };
  }, [anchor, entry]);
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('h2, button')?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dialogRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    addEventListener('keydown', onKey, true);
    addEventListener('mousedown', onDown);
    return () => {
      removeEventListener('keydown', onKey, true);
      removeEventListener('mousedown', onDown);
      const active = document.activeElement;
      const focusInside = (dialogRef.current?.contains(active) ?? false) || active === document.body || active === null;
      if (focusInside && anchor.isConnected) anchor.focus();
    };
  }, [anchor, onClose]);
  return createPortal(
    <section
      class="glossary-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby="glossary-popover-term"
      ref={dialogRef}
      style={pos ? { top: `${pos.top}px`, left: `${pos.left}px` } : undefined}
    >
      <Button variant="ghost" size="sm" class="glossary-popover-close" aria-label="Schließen" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" /></svg>
      </Button>
      <h2 id="glossary-popover-term" tabIndex={-1}>
        {entry ? <MathMarkup inline html={entry.term} /> : 'Begriff'}
        {entry?.english ? <span class="glossary-english">englisch <em>{entry.english}</em></span> : null}
      </h2>
      {error ? <p role="alert">Begriff konnte nicht geladen werden.</p>
        : entry ? <div class="glossary-definition"><MathMarkup html={entry.definitionHtml} /></div>
        : <p role="status">Wird geladen…</p>}
      <a class="text-link" href={`#/glossary/${termId}`}>Im Lexikon öffnen</a>
    </section>,
    document.body,
  );
}
