import type { ComponentChildren } from 'preact';

type CarouselProps = {
  label: string;
  children: ComponentChildren;
};

export function Carousel({ label, children }: CarouselProps) {
  const slides = Array.isArray(children) ? children : [children];
  return (
    <div class="carousel">
      <div class="carousel-track" role="list" aria-label={label}>
        {slides.map((child, index) => <div class="carousel-slide" role="listitem" key={index}>{child}</div>)}
      </div>
    </div>
  );
}
