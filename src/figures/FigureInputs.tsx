import { useState } from 'preact/hooks';
import { Button } from '../ui/Button';
import type { FigureSpec } from '../app/types';

export function compareBeat(spec: FigureSpec) {
  return spec.beats.findIndex(b => b.id === (spec.compare?.beat ?? spec.beats[1]?.id));
}

export function validExploreValue(value: unknown, field: NonNullable<FigureSpec['explore']>) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < field.min || value > field.max) return false;
  const steps = (value - field.min) / field.step;
  return Math.abs(steps - Math.round(steps)) < 1e-8;
}

// The existing F7 sources predate labels. New consumers author both labels.
function comparisonLabel(spec: FigureSpec, side: 'a' | 'b') {
  if (spec.compare?.labels) return spec.compare.labels[side];
  if (spec.scene === 'rubber-band-coefficients') return side === 'a' ? 'Ridge' : 'Lasso';
  return side.toUpperCase();
}

function numberFieldError(field: FigureSpec['explore']) {
  if (!field) return 'Dieses Zahlenfeld ist nicht verfügbar.';
  const [min, max, step] = [field.min, field.max, field.step].map(value => value.toLocaleString('de-DE', { maximumSignificantDigits: 15 }));
  return `Bitte einen Wert von ${min} bis ${max} in Schritten von ${step} eingeben.`;
}

export function FigureInputs({ spec, params, side, commit }: {
  spec: FigureSpec; params: Record<string, unknown>; side: 'a' | 'b';
  commit: (params: Record<string, unknown>, side: 'a' | 'b', beat: number) => void;
}) {
  const field = spec.explore;
  const [error, setError] = useState('');
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const input = (event.currentTarget as HTMLFormElement).elements.namedItem('parameter') as HTMLInputElement;
    const value = input.valueAsNumber;
    if (!field || !validExploreValue(value, field)) {
      setError(numberFieldError(field));
      return;
    }
    try { commit({ ...params, [field.parameter]: value }, side, 0); setError(''); }
    catch { setError('Dieser Wert kann hier nicht dargestellt werden.'); }
  };
  if (spec.kind === 'explore' && field) return <form class="figure-inputs" onSubmit={submit} noValidate>
    <label>{field.label ?? (field.parameter === 'eta' ? 'Lernrate η' : field.parameter)}
      <input name="parameter" type="number" min={field.min} max={field.max} step={field.step}
        defaultValue={String(params[field.parameter])} aria-invalid={Boolean(error)} />
    </label>
    <Button size="sm" type="submit">Übernehmen</Button>
    {error ? <p role="alert">{error}</p> : null}
  </form>;
  if (spec.kind !== 'compare' || !spec.compare) return null;
  return <div class="figure-inputs" role="group" aria-label="Vergleich">
    {(['a', 'b'] as const).map(s => <Button key={s} size="sm" variant={s === side ? 'primary' : 'ghost'}
      aria-pressed={s === side} onClick={() => commit({ ...spec.params, ...spec.compare![s] }, s, compareBeat(spec))}>
      {s.toUpperCase()}: {comparisonLabel(spec, s)}
    </Button>)}
  </div>;
}
