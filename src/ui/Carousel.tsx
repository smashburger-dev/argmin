import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { Button } from './Button';

type CarouselProps = {
  label: string;
  children: ComponentChildren;
  prevLabel?: string;
  nextLabel?: string;
};

export function Carousel({
  label,
  children,
  prevLabel = 'Vorheriger Tag',
  nextLabel = 'Nächster Tag',
}: CarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const slides = Array.isArray(children) ? children : [children];
  const scroll = (direction: number) => {
    const element = track.current;
    const slide = element?.firstElementChild as HTMLElement | null;
    if (!element || !slide) return;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap || '0');
    element.scrollBy({ left: direction * (slide.offsetWidth + gap), behavior: 'smooth' });
  };
  return (
    <div class="carousel">
      {slides.length >= 2 && (
        <div class="carousel-controls">
          <Button variant="ghost" size="sm" aria-label={prevLabel} onClick={() => scroll(-1)}>‹</Button>
          <Button variant="ghost" size="sm" aria-label={nextLabel} onClick={() => scroll(1)}>›</Button>
        </div>
      )}
      <div class="carousel-track" role="list" aria-label={label} ref={track}>
        {slides.map((child, index) => <div class="carousel-slide" role="listitem" key={index}>{child}</div>)}
      </div>
    </div>
  );
}
