// Dependency-free page wheel easing: notched mouse wheels accumulate into a
// target that a rAF loop eases toward, so vertical page scrolling lands with
// a soft tail instead of stopping dead. Trackpads (small, high-frequency
// deltas with OS momentum), pinch-zoom, nested scrollers, keyboard input,
// and reduced-motion preferences keep native behavior.
import { createWheelIntent, wheelDeltaY } from './wheel-input';

export function initPageEase(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const motion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  const shouldEase = createWheelIntent();
  let raf = 0;
  let target = window.scrollY;
  let current = window.scrollY;

  const limit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const stop = () => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = () => {
    target = window.scrollY;
    current = window.scrollY;
  };
  const frame = () => {
    raf = 0;
    const distance = target - current;
    if (Math.abs(distance) < 0.12) {
      window.scrollTo(0, target);
      current = target;
      return;
    }
    current += distance * 0.1;
    window.scrollTo(0, current);
    raf = window.requestAnimationFrame(frame);
  };
  // Nested vertical scrollers (editor panes, dialogs, lists) that still have
  // room in the wheel direction keep native scrolling.
  const nestedTakes = (start: EventTarget | null, deltaY: number): boolean => {
    let node = start instanceof Element ? start : null;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 1) {
        const room = deltaY < 0 ? node.scrollTop : node.scrollHeight - node.clientHeight - node.scrollTop;
        if (room > 1) {
          const vertical = getComputedStyle(node).overflowY;
          if (vertical === 'auto' || vertical === 'scroll') return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  };
  const onWheel = (event: WheelEvent) => {
    const ease = shouldEase(event);
    const delta = wheelDeltaY(event, window.innerHeight);
    // Never let an old glide compete with native precision input or another
    // scroll consumer. Rebase before handing the gesture to the browser.
    if (!ease || motion?.matches || nestedTakes(event.target, delta)) {
      stop();
      sync();
      return;
    }
    if (limit() <= 0) return;
    const base = raf ? target : window.scrollY;
    const next = Math.min(limit(), Math.max(0, base + delta));
    // At a page edge there is nothing to ease — let overscroll stay native.
    if (next === base) return;
    event.preventDefault();
    target = next;
    current = window.scrollY;
    if (!raf) raf = window.requestAnimationFrame(frame);
  };
  // External jumps (keyboard, scrollbar drag, route change) rebase the glide.
  const onScroll = () => {
    if (!raf) sync();
  };
  const onRoute = () => {
    stop();
    sync();
  };
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', onRoute);
  return () => {
    stop();
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('hashchange', onRoute);
  };
}
