import { useEffect, useState } from 'preact/hooks';
import { SCENE_IMPORTS } from './registry';
import { hintSpec } from '../../assets/js/figures/kit/hints.mjs';
import FigureRuntime from './FigureRuntime';
import type { FigureSpec } from '../app/types';

export type HintEntry = { familyId: string; caseIds?: string[]; scene: string; source: string; neighborParams?: object };
export type HintInstance = { familyId: string; parameters: object; instanceId: string };

export default function HintFigure({ entry, instance, onHide }: { entry: HintEntry; instance: HintInstance; onHide: () => void }) {
  const [loaded, setLoaded] = useState<{ scene: any; spec: FigureSpec } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    setLoaded(null);
    setError(false);
    const sceneImport = SCENE_IMPORTS[entry.scene];
    if (!sceneImport) { setError(true); return undefined; }
    sceneImport().then((scene) => {
      const spec = hintSpec(entry, scene, instance) as FigureSpec;
      if (live) setLoaded({ scene, spec });
    }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [entry, instance]);
  return <figure class="figure-card figure-hint-card">
    <figcaption class="figure-head"><strong>Hinweis · Abb. · {loaded?.spec.title ?? 'Spalten als Zutaten'}</strong></figcaption>
    {error ? <p role="alert">Die Hinweisfigur konnte nicht geladen werden. Der Texthinweis bleibt verfügbar.</p> : null}
    {loaded ? <>
      {entry.source === 'neighbor' ? <p class="figure-hint">{loaded.spec.caption}</p> : null}
      <FigureRuntime key={instance.instanceId} scene={loaded.scene} spec={loaded.spec} />
    </> : !error ? <p role="status">Figur wird geladen.</p> : null}
    <button class="btn btn-ghost btn-sm figure-hide" type="button" onClick={onHide}>Figur ausblenden</button>
  </figure>;
}
