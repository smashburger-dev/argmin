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
