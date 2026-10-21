import { label, plate, lerp } from './s8b-diagram.mjs';

// Fixed keys are indexed by original character/marker slots. A merged token
// occupies its first slot and spans the consumed slots; the others stay hidden.
export function tokenBand(id, original, symbols, y) {
  const widths = original.map(s => s === '</w>' ? 20 : 8);
  const total = widths.reduce((a, b) => a + b + 1, -1);
  const starts = widths.map((_, i) => (100 - total) / 2 + widths.slice(0, i).reduce((a, b) => a + b + 1, 0));
  let cursor = 0;
  const cells = new Map();
  for (const symbol of symbols) {
    const span = [...symbol.replace('</w>', '')].length + (symbol.includes('</w>') ? 1 : 0);
    const width = widths.slice(cursor, cursor + span).reduce((a, b) => a + b + 1, -1);
    cells.set(cursor, { symbol, width }); cursor += span;
  }
  return original.flatMap((_, i) => {
    const cell = cells.get(i), x = starts[i], width = cell?.width ?? widths[i];
    return [
      { ...plate(`${id}-box-${i}`, [x, y], [x + width, y + 12]), alpha: cell ? 1 : 0, visible: Boolean(cell) },
      { ...label(`${id}-text-${i}`, x + width / 2, y + 8, cell?.symbol ?? '', 'hi', 'middle'), alpha: cell ? 1 : 0, visible: Boolean(cell) },
    ];
  });
}

export function blendBand(before, after, t) {
  return before.map((a, i) => {
    const b = after[i], p = { ...b, alpha: lerp(a.alpha, b.alpha, t) };
    if (a.t === 'rect') {
      p.from = a.from.map((v, j) => lerp(v, b.from[j], t));
      p.to = a.to.map((v, j) => lerp(v, b.to[j], t));
    } else {
      p.x = lerp(a.x, b.x, t);
      p.runs = t < 0.5 ? a.runs : b.runs;
      if (b.alpha === 0) p.alpha = Math.max(0, 1 - 2 * t);
      else if (JSON.stringify(a.runs) !== JSON.stringify(b.runs)) p.alpha *= Math.abs(1 - 2 * t);
    }
    p.visible = p.alpha > 0.01;
    return p;
  });
}
