/**
 * Lesson-facing figure card: shows the frame immediately, then lazily
 * imports the FigureRuntime chunk and the scene module. Loading/error
 * states mirror VisualizationBlock.
 */
import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { MathMarkup } from './MathMarkup';
import { SCENE_IMPORTS } from '../figures/registry';
import type { FigureSpec } from '../app/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  spec: FigureSpec;
  figureIndex: number;
  /** Dev-only lab overrides; unused in lessons. */
  style?: string | null;
  initialBeat?: number;
}

type RuntimeComponent = (props: { scene: any; spec: FigureSpec; style?: string | null; initialBeat?: number }) => JSX.Element;

export function FigureBlock({ spec, style, initialBeat }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [parts, setParts] = useState<{ Runtime: RuntimeComponent; scene: any } | null>(null);
  useEffect(() => {
    let live = true;
    const sceneImport = SCENE_IMPORTS[spec.scene];
    if (!sceneImport) { setStatus('error'); return undefined; }
    Promise.all([import('../figures/FigureRuntime'), sceneImport()])
      .then(([runtime, scene]) => {
        if (!live) return;
        setParts({ Runtime: runtime.default as RuntimeComponent, scene });
        setStatus('ready');
      })
      .catch(() => { if (live) setStatus('error'); });
    return () => { live = false; };
  }, [spec.scene]);
  return (
    <figure class="figure-card">
      <div class="figure-head">
        <strong>{spec.title}</strong>
        <MathMarkup html={spec.caption} inline />
      </div>
      {status === 'loading' ? <p role="status">Figur wird geladen.</p> : null}
      {status === 'error' ? <p role="alert">Die Figur konnte nicht geladen werden.</p> : null}
      {status === 'ready' && parts ? <parts.Runtime scene={parts.scene} spec={spec} style={style} initialBeat={initialBeat} /> : null}
    </figure>
  );
}
