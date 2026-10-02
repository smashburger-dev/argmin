import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../tools/markdown_content.mjs';

test('markdown compiler renders learning text while escaping raw HTML', () => {
  const html = renderMarkdown('# Algebra\n\nLöse $2x = 4$.\n\n<script>alert(1)</script>');
  assert.match(html, /<h1>Algebra<\/h1>/);
  assert.match(html, /\$2x = 4\$/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('markdown compiler rejects unsafe link protocols through markdown-it defaults', () => {
  const html = renderMarkdown('[sicher](https://example.org) [unsicher](javascript:alert(1))');
  assert.match(html, /href="https:\/\/example\.org"/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test('math spans keep TeX escapes that CommonMark would eat', () => {
  const html = renderMarkdown(String.raw`$$A=\begin{pmatrix}2&-1\\3&4\end{pmatrix}$$`);
  assert.ok(html.includes(String.raw`$$A=\begin{pmatrix}2&amp;-1\\3&amp;4\end{pmatrix}$$`));
  assert.doesNotMatch(html, /zzMATHSEGMENT/);
});

test('inline math keeps spacing, percent, norm and brace commands intact', () => {
  const html = renderMarkdown(String.raw`$8\,\%$ und $\|w\|^2$ sowie $\{a\}$ und $\max\!(x,\;0)$`);
  assert.ok(html.includes(String.raw`$8\,\%$`));
  assert.ok(html.includes(String.raw`$\|w\|^2$`));
  assert.ok(html.includes(String.raw`$\{a\}$`));
  assert.ok(html.includes(String.raw`$\max\!(x,\;0)$`));
});

test('a lone = or --- line inside $$ no longer splits the block', () => {
  const html = renderMarkdown('$$\nAB=\n\\begin{pmatrix}\n1&2\\\\\n3&4\n\\end{pmatrix}\n=\n\\begin{pmatrix}8&10\\\\2&15\\end{pmatrix}.\n$$');
  assert.ok(html.includes('$$\nAB=\n\\begin{pmatrix}\n1&amp;2\\\\\n3&amp;4\n\\end{pmatrix}\n=\n\\begin{pmatrix}8&amp;10\\\\2&amp;15\\end{pmatrix}.\n$$'));
  assert.doesNotMatch(html, /<h1>|<h2>|<hr/);
  const ruled = renderMarkdown('$$\na\n---\nb\n$$');
  assert.ok(ruled.includes('$$\na\n---\nb\n$$'));
  assert.doesNotMatch(ruled, /<hr|<h2>/);
});

test('fenced code blocks keep $ and $$ literal without swallowing math', () => {
  const html = renderMarkdown('```sh\necho $$HOME\n```\n\nC $$d$$ E');
  assert.ok(html.includes('<p>C $$d$$ E</p>'));
  assert.match(html, /<code class="language-sh">echo \$\$HOME\n<\/code>/);
  assert.doesNotMatch(html, /zzMATHSEGMENT/);
});

test('inline code spans keep $ literal for any backtick fence length', () => {
  const html = renderMarkdown('`a $ b` c $d$ und ``x $ y`` z $w$.');
  assert.ok(html.includes('<code>a $ b</code>'));
  assert.ok(html.includes('<code>x $ y</code>'));
  assert.ok(html.includes('c $d$'));
  assert.ok(html.includes('z $w$'));
});

test('unpaired $ and $$ stay literal', () => {
  const html = renderMarkdown('Der Preis liegt bei 5 $ und bleibt.\n\nOffen: $$ ohne Ende');
  assert.ok(html.includes('5 $ und bleibt'));
  assert.ok(html.includes('$$ ohne Ende'));
  assert.doesNotMatch(html, /zzMATHSEGMENT/);
});

test('math source is HTML-escaped in text nodes', () => {
  const html = renderMarkdown('$$a < b & c > d$$ und $x < y$');
  assert.ok(html.includes('$$a &lt; b &amp; c &gt; d$$'));
  assert.ok(html.includes('$x &lt; y$'));
  assert.doesNotMatch(html, /&amp;amp;|<b>/);
});

test('math inside link text still renders a working link', () => {
  const html = renderMarkdown('[Einstieg $x$](#/family/fam-one/case-one/0/intro)');
  assert.match(html, /<a href="#\/family\/fam-one\/case-one\/0\/intro">Einstieg \$x\$<\/a>/);
});
