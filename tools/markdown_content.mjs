import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

// KaTeX renders in the browser via auto-render, so the raw TeX has to reach
// the DOM unharmed. markdown-it would otherwise resolve CommonMark escapes
// (`\\` → `\`, `\%` → `%`) inside math and read `=`/`---` lines in a
// multi-line `$$` block as setext/hr markup, splitting the span. Math is
// therefore lifted out before rendering and written back into the HTML.

// A backslash run of odd length before pos marks the token as escaped.
const isEscaped = (text, pos) => {
  let run = 0;
  for (let i = pos - 1; i >= 0 && text[i] === '\\'; i -= 1) run += 1;
  return run % 2 === 1;
};

// Line ranges ([start, end)) of fenced code blocks: up to 3 spaces indent,
// >= 3 backticks or tildes, closer same char at least as long.
function fencedRegions(source) {
  const regions = [];
  let fence = null;
  let pos = 0;
  while (pos < source.length) {
    const nl = source.indexOf('\n', pos);
    const end = nl === -1 ? source.length : nl + 1;
    const line = source.slice(pos, end);
    if (fence === null) {
      const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      // A backtick fence may not carry backticks in its info string.
      if (open && !(open[1][0] === '`' && line.slice(open[0].length).includes('`'))) {
        fence = { char: open[1][0], length: open[1].length, start: pos };
      }
    } else {
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*\n?$/.exec(line);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        regions.push([fence.start, end]);
        fence = null;
      }
    }
    pos = end;
  }
  if (fence !== null) regions.push([fence.start, source.length]);
  return regions;
}

// Sorted, disjoint [start, end) ranges the math scan must not enter, in
// either direction: fenced code blocks plus inline code spans outside them.
function blockedRegions(source) {
  const regions = fencedRegions(source);
  const fenceEndAt = (pos) => regions.find(([start, end]) => pos >= start && pos < end)?.[1] ?? -1;
  let i = 0;
  while (i < source.length) {
    const fenceEnd = fenceEndAt(i);
    if (fenceEnd !== -1) { i = fenceEnd; continue; }
    if (source[i] !== '`' || isEscaped(source, i)) { i += 1; continue; }
    let run = i;
    while (source[run] === '`') run += 1;
    const length = run - i;
    // The closer is the next backtick run of exactly this length; a blank
    // line ends the would-be span just like the paragraph does.
    let close = -1;
    for (let pos = run; pos < source.length; pos += 1) {
      const skip = fenceEndAt(pos);
      if (skip !== -1) { pos = skip - 1; continue; }
      if (source[pos] === '\n' && source[pos + 1] === '\n') break;
      if (source[pos] !== '`') continue;
      let end = pos;
      while (source[end] === '`') end += 1;
      if (end - pos === length) { close = pos; break; }
      pos = end - 1;
    }
    if (close === -1) { i = run; continue; }
    regions.push([i, close + length]);
    i = close + length;
  }
  return regions.sort((a, b) => a[0] - b[0]);
}

// Masks every math span with a placeholder and returns the raw segments in
// scan order: `$$` multiline before `$` single-line, `\[…\]` and `\(…\)`
// handled likewise. Unpaired delimiters stay literal.
function extractMath(source) {
  const blocked = blockedRegions(source);
  const blockedAt = (pos) => blocked.find(([start, end]) => pos >= start && pos < end)?.[1] ?? -1;

  // Mirrors KaTeX auto-render's findEndOfMath: braces nest, a backslash
  // swallows the next character; `$` and `\(…\)` stop at the line end.
  const findClose = (right, from, singleLine) => {
    let depth = 0;
    for (let pos = from; pos < source.length; pos += 1) {
      const skip = blockedAt(pos);
      if (skip !== -1) { pos = skip - 1; continue; }
      const ch = source[pos];
      if (depth <= 0 && source.startsWith(right, pos)) return pos;
      if (ch === '\\') pos += 1;
      else if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      else if (singleLine && ch === '\n') return -1;
    }
    return -1;
  };

  const segments = [];
  let masked = '';
  let i = 0;
  const stash = (end) => {
    masked += `zzMATHSEGMENT${segments.length}zz`;
    segments.push(source.slice(i, end));
    i = end;
  };
  while (i < source.length) {
    const skip = blockedAt(i);
    if (skip !== -1) { masked += source.slice(i, skip); i = skip; continue; }
    const ch = source[i];
    if (ch === '$' && !isEscaped(source, i)) {
      const display = source[i + 1] === '$';
      const close = findClose(display ? '$$' : '$', i + 1 + Number(display), !display);
      if (close !== -1) { stash(close + 1 + Number(display)); continue; }
      masked += display ? '$$' : '$';
      i += 1 + Number(display);
      continue;
    }
    if (ch === '\\' && !isEscaped(source, i)) {
      const right = source[i + 1] === '[' ? '\\]' : source[i + 1] === '(' ? '\\)' : null;
      const close = right === null ? -1 : findClose(right, i + 2, right === '\\)');
      if (close !== -1) { stash(close + 2); continue; }
    }
    masked += ch;
    i += 1;
  }
  return { masked, segments };
}

// TeX lands in text nodes: escape markup chars so DOMParser cannot read
// `&`-entities or tags out of it.
const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export function renderMarkdown(source) {
  if (typeof source !== 'string') throw new TypeError('Markdown muss ein String sein');
  const { masked, segments } = extractMath(source);
  const html = markdown.render(masked);
  return html.replace(/zzMATHSEGMENT(\d+)zz/g, (match, id) => {
    const segment = segments[Number(id)];
    return segment === undefined ? match : escapeHtml(segment);
  });
}
