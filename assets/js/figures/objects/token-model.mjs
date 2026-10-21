// Word boundaries are never crossed. The marker is a symbol, not literal text.
export const wordSymbols = word => [...word, '</w>'];

export function applyMerge(symbols, [left, right]) {
  const out = [];
  for (let i = 0; i < symbols.length; i += 1) {
    if (symbols[i] === left && symbols[i + 1] === right) {
      out.push(left + right); i += 1;
    } else out.push(symbols[i]);
  }
  return out;
}

export const applyMerges = (word, merges) => merges.reduce((symbols, pair) => applyMerge(symbols, pair), wordSymbols(word));
const comparePair = (a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;

export function pairCounts(words) {
  const counts = new Map();
  for (const symbols of words) {
    for (let i = 0; i + 1 < symbols.length; i += 1) {
      const pair = symbols.slice(i, i + 2), key = JSON.stringify(pair);
      counts.set(key, { pair, count: (counts.get(key)?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || comparePair(a.pair, b.pair));
}

export function learnBpe(corpus, budget) {
  if (!Array.isArray(corpus) || corpus.some(w => typeof w !== 'string' || !/^[a-z]+$/.test(w))) throw new Error('Expected lowercase ASCII words');
  if (!Number.isInteger(budget) || budget < 0 || budget > 100) throw new Error('Invalid merge budget');
  let words = corpus.map(wordSymbols);
  const merges = [], rounds = [];
  for (let i = 0; i < budget; i += 1) {
    const counts = pairCounts(words), best = counts[0];
    if (!best || best.count < 2) break;
    const after = words.map(symbols => applyMerge(symbols, best.pair));
    rounds.push({ before: words, counts, best: best.pair, count: best.count, after });
    merges.push(best.pair); words = after;
  }
  return { corpus, merges, rounds, words };
}

export function chunkWindows(text, size, overlap) {
  if (typeof text !== 'string' || !Number.isInteger(size) || !Number.isInteger(overlap)) throw new Error('Invalid chunk parameters');
  if (size < 1 || overlap < 0 || overlap >= size) throw new Error('Chunk stride must be positive');
  const symbols = [...text], step = size - overlap, windows = [];
  for (let start = 0; start < symbols.length; start += step) {
    const end = Math.min(symbols.length, start + size);
    windows.push({ start, end, text: symbols.slice(start, end).join('') });
  }
  return { symbols, size, overlap, step, windows, count: windows.length };
}
