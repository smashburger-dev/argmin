import { useEffect, useState } from 'preact/hooks';
import { getVisualization } from '../adapters/content-repository';
import type { VisualizationSummary } from '../app/types';
import { VisualizationBlock } from './VisualizationBlock';

export function VisualizationView({ visualizationId }: { visualizationId: string }) {
  const [visualization, setVisualization] = useState<VisualizationSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setVisualization(null);
    setLoadError(null);
    getVisualization(visualizationId)
      .then((value) => { if (live) setVisualization(value); })
      .catch((error: Error) => { if (live) setLoadError(error.message); });
    return () => { live = false; };
  }, [visualizationId]);
  if (loadError) return <section class="view"><h1 tabIndex={-1}>Visualisierung nicht gefunden</h1><p role="alert" class="content-error">Visualisierung konnte nicht geladen werden: {loadError}</p></section>;
  if (!visualization) return <section class="view"><h1 tabIndex={-1}>Visualisierung wird geladen</h1><p role="status">Visualisierungsinhalt wird geladen.</p></section>;
  return <section class="view" aria-labelledby="visualization-title">
    <header class="view-header"><p class="eyebrow">Interaktive Visualisierung</p><h1 id="visualization-title" tabIndex={-1}>{visualization.spec.title}</h1></header>
    <VisualizationBlock id={visualizationId} spec={visualization.spec} />
    <nav class="visualization-links"><a href={`#/lesson/${visualization.lessonId}`}>Zur Lektion</a><a href="#/tools">Werkzeuge</a></nav>
  </section>;
}
