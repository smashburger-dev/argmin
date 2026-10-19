import { useEffect, useLayoutEffect, useMemo, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import { Button } from '../ui/Button';

export interface SelectionTarget {
  id: string;
  itemId: string;
  primKey?: string;
  label: string;
  description: string;
}

function targetElement(stage: HTMLElement, target: SelectionTarget) {
  const item = [...stage.querySelectorAll('[data-item]')].find(e => e.getAttribute('data-item') === target.itemId);
  if (!target.primKey) return item;
  return [...(item?.querySelectorAll('[data-prim]') ?? [])].find(e => e.getAttribute('data-prim') === target.primKey);
}

export function FigureSelection({ scene, model, beat, mode, stageRef }: {
  scene: { selectionTargets?: (model: unknown, beat: number) => SelectionTarget[] };
  model: unknown; beat: number; mode: string; stageRef: RefObject<HTMLDivElement>;
}) {
  const targets = useMemo(() => mode === 'lesson' ? scene.selectionTargets?.(model, beat) ?? [] : [], [scene, model, beat, mode]);
  const context = useMemo(() => ({ model, beat, mode }), [scene, model, beat, mode]);
  const [selection, setSelection] = useState<{ context: typeof context; id: string } | null>(null);
  const selected = selection?.context === context ? selection.id : null;
  const select = (id: string) => setSelection({ context, id });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !targets.length) return;
    const click = (event: MouseEvent) => {
      if (stage.dataset.dragged === 'true') return;
      const element = event.target as Element;
      const target = targets.find(t => targetElement(stage, t)?.contains(element));
      if (target) select(target.id);
    };
    stage.addEventListener('click', click);
    return () => stage.removeEventListener('click', click);
  }, [stageRef, targets]);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const target = targets.find(t => t.id === selected);
    const element = target && targetElement(stage, target);
    element?.setAttribute('data-selected', 'true');
    return () => element?.removeAttribute('data-selected');
  }, [stageRef, targets, selected]);
  if (!targets.length) return null;
  return <div class="figure-selection">
    <div class="figure-inputs" role="group" aria-label="Auswahl">
      {targets.map(target => <Button key={target.id} size="sm" variant="ghost" aria-pressed={selected === target.id}
        onClick={() => select(target.id)}>{target.label}</Button>)}
    </div>
    <p role="status">{targets.find(target => target.id === selected)?.description}</p>
  </div>;
}
