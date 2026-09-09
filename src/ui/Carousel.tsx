import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

type CarouselProps = {
  label: string;
  children: ComponentChildren;
  arrows?: boolean;
  fades?: boolean;
  prevLabel?: string;
  nextLabel?: string;
};

const arrowIcon = (direction: -1 | 1) => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {direction < 0 ? <path d="M10 3.5 5.5 8l4.5 4.5" /> : <path d="M6 3.5 10.5 8 6 12.5" />}
  </svg>
);

export function Carousel({ label, children, arrows = false, fades = false, prevLabel = 'Nach links scrollen', nextLabel = 'Nach rechts scrollen' }: CarouselProps) {
  const slides = Array.isArray(children) ? children : [children];
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let snapTimer = 0;
    let raf = 0;
    let target = 0;
    let current = 0;
    let gliding = false;
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Plain mouse wheels only scroll vertically — translate that into
    // horizontal movement while the track has room, and let the page
    // scroll once an edge is reached. Trackpads (real deltaX) and
    // pinch-zoom (ctrlKey) keep native behavior. Ticks accumulate into
    // a target that a rAF loop eases toward, dependency-free. Mandatory
    // snap pauses during the gesture and glides onto the nearest card
    // once the wheel rests.
    const step = () => {
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
      const slide = element.querySelector<HTMLElement>(':scope > .carousel-slide');
      return (slide?.offsetWidth ?? element.clientWidth) + gap;
    };
    const stop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      gliding = false;
      window.clearTimeout(snapTimer);
    };
    const frame = () => {
      raf = 0;
      const distance = target - current;
      if (Math.abs(distance) < 0.5) {
        element.scrollLeft = target;
        current = target;
        snapTimer = window.setTimeout(() => {
          const max = element.scrollWidth - element.clientWidth;
          const nearest = Math.min(max, Math.max(0, Math.round(target / step()) * step()));
          if (reduceMotion || Math.abs(nearest - target) < 2) {
            element.scrollLeft = nearest;
            element.style.scrollSnapType = '';
            return;
          }
          target = nearest;
          gliding = true;
          raf = window.requestAnimationFrame(frame);
        }, 380);
        return;
      }
      current += distance * (gliding ? 0.2 : 0.18);
      element.scrollLeft = current;
      raf = window.requestAnimationFrame(frame);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const max = element.scrollWidth - element.clientWidth;
      const base = raf ? target : element.scrollLeft;
      const next = base + delta;
      if (next < 0 || next > max) return;
      event.preventDefault();
      element.style.scrollSnapType = 'none';
      if (reduceMotion) {
        stop();
        element.scrollLeft = next;
        current = next;
        target = next;
        snapTimer = window.setTimeout(() => { element.style.scrollSnapType = ''; }, 280);
        return;
      }
      if (!raf) {
        current = element.scrollLeft;
        gliding = false;
      }
      target = next;
      window.clearTimeout(snapTimer);
      if (!raf) raf = window.requestAnimationFrame(frame);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stop();
      element.removeEventListener('wheel', onWheel);
    };
  }, []);
  useEffect(() => {
    const element = track.current;
    if (!element || !arrows) return;
    const update = () => {
      const max = element.scrollWidth - element.clientWidth;
      setAtStart(element.scrollLeft <= 4);
      setAtEnd(element.scrollLeft >= max - 4);
    };
    element.scrollLeft = 0;
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [arrows, slides.length]);
  const scrollByStep = (direction: -1 | 1) => {
    const element = track.current;
    if (!element) return;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    const slide = element.querySelector<HTMLElement>(':scope > .carousel-slide');
    const step = (slide?.offsetWidth ?? element.clientWidth) + gap;
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * step, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  return (
    <div class={arrows ? 'carousel has-arrows' : 'carousel'}>
      {arrows && <button type="button" class="carousel-arrow" aria-label={prevLabel} disabled={atStart} onClick={() => scrollByStep(-1)}>{arrowIcon(-1)}</button>}
      <div class="carousel-viewport" data-at-start={arrows ? String(atStart) : undefined} data-at-end={arrows ? String(atEnd) : undefined}>
        <div class="carousel-track" role="list" aria-label={label} ref={track}>
          {slides.map((child, index) => <div class="carousel-slide" role="listitem" key={index}>{child}</div>)}
        </div>
        {fades && <div class="carousel-fade carousel-fade-l" aria-hidden="true" />}
        {fades && <div class="carousel-fade carousel-fade-r" aria-hidden="true" />}
      </div>
      {arrows && <button type="button" class="carousel-arrow" aria-label={nextLabel} disabled={atEnd} onClick={() => scrollByStep(1)}>{arrowIcon(1)}</button>}
    </div>
  );
}
