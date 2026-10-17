/**
 * Dev-only figure laboratory: renders the smoothie figure large for
 * inspection. Mounted only under import.meta.env.DEV in App.tsx, so the
 * whole module is tree-shaken out of release builds. Hash query param:
 * beat=<0..5> start beat at end state. Inline styles keep this dev route
 * out of shipped CSS. Theme comes from the normal app theme.
 */
import { useEffect, useState } from 'preact/hooks';
import { FigureBlock } from '../ui/FigureBlock';
import { getLesson } from '../adapters/content-repository';
import type { FigureSpec } from '../app/types';

const LAB_LESSON = 'l-linalg-systems';

function labBeat(): number {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const beat = Number(params.get('beat'));
  return Math.min(5, Math.max(0, Number.isFinite(beat) ? Math.trunc(beat) : 0));
}

export function FigureLab() {
  const [spec, setSpec] = useState<FigureSpec | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    getLesson(LAB_LESSON)
      .then((lesson) => { if (live) setSpec(lesson.blocks.find((block) => block.fig)?.fig ?? null); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, []);
  return (
    <section class="view" aria-labelledby="lab-title">
      <h1 id="lab-title" tabIndex={-1}>Figurenlabor</h1>
      {error ? <p role="alert">Die Figur konnte nicht geladen werden.</p> : null}
      {!error && !spec ? <p role="status">Figur wird geladen.</p> : null}
      {spec ? <FigureBlock spec={spec} figureIndex={1} initialBeat={labBeat()} /> : null}
    </section>
  );
}
