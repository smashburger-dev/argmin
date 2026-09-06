import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

interface MathFieldElement extends HTMLElement {
  value: string;
  getValue?: (format?: string) => string;
}

export function MathInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  const field = useRef<MathFieldElement | null>(null);

  useEffect(() => {
    let active = true;
    const path = ['vendor', 'mathlive', 'mathlive.min.mjs'].join('/');
    const source = new URL(path, document.baseURI).href;
    void import(/* @vite-ignore */ source)
      .then(() => { if (active) setLoaded(true); })
      .catch(() => { if (active) setLoaded(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (field.current && field.current.value !== value) field.current.value = value;
  }, [loaded, value]);

  const handleInput = (event: Event) => {
    const target = event.currentTarget as MathFieldElement;
    onChange(target.getValue?.('ascii-math') || target.value || '');
  };

  if (!loaded) {
    return <label class="answer-field"><span>Mathematischer Term</span><input aria-label="Mathematischer Term" value={value} onInput={(event) => onChange(event.currentTarget.value)} placeholder="x^2+x-6" autocomplete="off" /></label>;
  }
  return <label class="answer-field"><span>Mathematischer Term</span>{h('math-field', {
    ref: (element: MathFieldElement | null) => { field.current = element; },
    value,
    'aria-label': 'Mathematischer Term',
    'virtual-keyboard-mode': 'onfocus',
    onInput: handleInput,
  })}<small>SymPy prüft algebraische Äquivalenz, nicht die Schreibweise.</small></label>;
}
