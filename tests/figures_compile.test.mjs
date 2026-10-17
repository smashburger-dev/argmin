import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFigureSpec, validateSourceDocument } from '../tools/compile_content.mjs';
import { scenes } from '../assets/js/figures/scenes/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(readFileSync(join(root, 'content/lessons/linear-algebra/smoothie.fig.json'), 'utf8'));
const clone = (patch = {}) => ({ ...structuredClone(spec), ...patch });

describe('figure spec contract', () => {
  it('accepts the authored smoothie figure', () => {
    assert.equal(validateSourceDocument('figure', spec, root), true);
    assert.equal(validateFigureSpec(spec, 'test:smoothie'), true);
  });

  it('fails closed on an unknown scene id', () => {
    assert.throws(() => validateFigureSpec(clone({ scene: 'keine-szene' }), 'test'), /Unbekannte Figurenszene/);
  });

  it('fails closed on beats that diverge from the scene contract', () => {
    const bad = clone();
    bad.beats = [...bad.beats.slice(0, 3), { id: 'erfunden', caption: 'Neu.' }, ...bad.beats.slice(4)];
    assert.throws(() => validateFigureSpec(bad, 'test'), /Beats/);
    const missing = clone();
    missing.beats = bad.beats.slice(0, 5);
    assert.throws(() => validateFigureSpec(missing, 'test'), /Beats/);
  });

  it('fails closed on a predict beat outside the scene', () => {
    const bad = clone();
    bad.predict.beat = 'kein-beat';
    assert.throws(() => validateFigureSpec(bad, 'test'), /Predict-Beat/);
  });

  it('fails closed when predict expected diverges from the model value', () => {
    const bad = clone();
    bad.predict.expected = 3;
    assert.throws(() => validateFigureSpec(bad, 'test'), /Predict-Erwartungswert/);
  });

  it('fails closed on a number no displayNumbers entry covers', () => {
    const bad = clone();
    bad.caption = 'Das Ziel (4, 5) braucht 17 Portionen.';
    assert.throws(() => validateFigureSpec(bad, 'test'), /displayNumbers/);
    const badBeat = clone();
    badBeat.beats[0].caption = 'Hafer liefert (2, 1) und braucht 42 Sekunden.';
    assert.throws(() => validateFigureSpec(badBeat, 'test'), /displayNumbers/);
  });

  it('accepts every number the authored spec actually shows', () => {
    const allowed = scenes[spec.scene].displayNumbers(scenes[spec.scene].model(spec.params));
    const text = [spec.title, spec.caption, spec.hint, ...spec.beats.map((b) => b.caption), spec.predict.prompt].join(' ');
    const found = new Set();
    for (const m of text.replace(/_\{[^}]*\}|_[a-zA-Z0-9]/g, ' ').replace(/−/g, '-').matchAll(/\d+/g)) {
      const value = Number(m[0]);
      if (allowed.some((c) => Math.abs(c - value) <= 1e-9)) found.add(value);
    }
    assert.ok(found.size >= 4, `expected several model numbers in the captions, got ${[...found]}`);
  });
});
