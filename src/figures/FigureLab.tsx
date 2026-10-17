/**
 * Dev-only figure laboratory: renders the smoothie figure once per style in
 * a 2x2 grid so the four looks can be compared. Mounted only under
 * import.meta.env.DEV in App.tsx, so the whole module is tree-shaken out of
 * release builds. Hash query params: beat=<0..5> start beat at end state,
 * stil=<a1..a4> single large figure instead of the grid. Inline styles keep
 * this dev route out of shipped CSS. Theme comes from the normal app theme.
 */
import { useEffect, useState } from 'preact/hooks';
import { FigureBlock } from '../ui/FigureBlock';
import { getLesson } from '../adapters/content-repository';
import { FIGURE_STYLES, FIGURE_STYLE_IDS } from './styles';
import type { FigureStyleId } from './styles';
import type { FigureSpec } from '../app/types';

const LAB_LESSON = 'l-linalg-systems';

function labParams(): { beat: number; styles: FigureStyleId[] } {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const beat = Number(params.get('beat'));
  const stil = params.get('stil');
  const styles = stil && stil in FIGURE_STYLES ? [stil as FigureStyleId] : FIGURE_STYLE_IDS;
  return { beat: Math.min(5, Math.max(0, Number.isFinite(beat) ? Math.trunc(beat) : 0)), styles };
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
  const { beat, styles } = labParams();
  const single = styles.length === 1;
  return (
    <section class="view" aria-labelledby="lab-title">
      <h1 id="lab-title" tabIndex={-1}>Figurenlabor</h1>
      {error ? <p role="alert">Die Figur konnte nicht geladen werden.</p> : null}
      {!error && !spec ? <p role="status">Figur wird geladen.</p> : null}
      {spec ? (
        <div style={{ display: 'grid', gridTemplateColumns: single ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          {styles.map((id) => (
            <div key={id}>
              <p style={{ margin: '0 0 4px' }}>
                <code>{id}</code> · {FIGURE_STYLES[id].name}
              </p>
              <FigureBlock spec={spec} figureIndex={1} style={id} initialBeat={beat} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
