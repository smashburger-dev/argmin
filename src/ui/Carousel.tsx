import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

type CarouselProps = {
  label: string;
  children: ComponentChildren;
};

export function Carousel({ label, children }: CarouselProps) {
  const slides = Array.isArray(children) ? children : [children];
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    // Plain mouse wheels only scroll vertically — translate that into
    // horizontal movement while the track has room, and let the page
    // scroll once an edge is reached. Trackpads (real deltaX) and
    // pinch-zoom (ctrlKey) keep native behavior.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const max = element.scrollWidth - element.clientWidth;
      const next = element.scrollLeft + delta;
      if (next < 0 || next > max) return;
      event.preventDefault();
      element.scrollLeft = next;
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <div class="carousel">
      <div class="carousel-track" role="list" aria-label={label} ref={track}>
        {slides.map((child, index) => <div class="carousel-slide" role="listitem" key={index}>{child}</div>)}
      </div>
    </div>
  );
}
