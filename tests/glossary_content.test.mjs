import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGlossary, glossaryTermId, parseGlossarySection } from '../tools/glossary_content.mjs';
import { validateGlossaryLinks } from '../tools/compile_content.mjs';
import { renderInlineMarkdown } from '../tools/markdown_content.mjs';

test('glossaryTermId bildet stabile IDs', () => {
  assert.equal(glossaryTermId('Bias (Schicht)'), 'bias-schicht');
  assert.equal(glossaryTermId('`raise … from`'), 'raise-from');
  assert.equal(glossaryTermId('Bestimmtheitsmaß $R^2$'), 'bestimmtheitsmass-r-2');
  assert.equal(glossaryTermId('Äußere Dimensionen'), 'aeussere-dimensionen');
});

test('parseGlossarySection liest Einträge mit und ohne Englisch', () => {
  const md = [
    '# Lektion', '', 'Text.', '',
    '## Begriffe auf einen Blick',
    '- **Tensor**: numerisches Array.',
    '- **Form** (englisch *shape*): Einträge pro Achse, $A_{ij}$ als Beispiel.',
    '', '## Nächster Abschnitt',
  ].join('\n');
  assert.deepEqual(parseGlossarySection(md), [
    { term: 'Tensor', english: null, definition: 'numerisches Array.' },
    { term: 'Form', english: 'shape', definition: 'Einträge pro Achse, $A_{ij}$ als Beispiel.' },
  ]);
  assert.deepEqual(parseGlossarySection('# ohne Liste\n'), []);
});

test('buildGlossary vereinigt gleiche Begriffe und wirft bei Konflikten', () => {
  const md = (term, def, eng = '') => `## Begriffe auf einen Blick\n- **${term}**${eng}: ${def}`;
  const merged = buildGlossary([
    { lessonId: 'l-a', markdownSources: [md('Batch', 'Gruppe von Beispielen.')] },
    { lessonId: 'l-b', markdownSources: [md('Batch', 'Gruppe von Beispielen.')] },
  ]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].lessonIds, ['l-a', 'l-b']);
  assert.throws(() => buildGlossary([
    { lessonId: 'l-a', markdownSources: [md('Batch', 'Gruppe von Beispielen.')] },
    { lessonId: 'l-b', markdownSources: [md('Batch', 'Andere Definition.')] },
  ]), /abweichend definiert/);
  assert.throws(() => buildGlossary([
    { lessonId: 'l-a', markdownSources: [md('Batch', 'Gruppe von Beispielen.')] },
    { lessonId: 'l-b', markdownSources: [md('Batch', 'Gruppe von Beispielen.', ' (englisch *lot*)')] },
  ]), /abweichend definiert/);
  assert.throws(() => buildGlossary([
    { lessonId: 'l-a', markdownSources: [md('Bias (Schicht)', 'Verschiebungsvektor.')] },
    { lessonId: 'l-b', markdownSources: [md('Bias-Schicht', 'Verschiebungsvektor.')] },
  ]), /Kollision/);
});

test('validateGlossaryLinks scheitert an ungültigen oder leeren IDs', () => {
  const glossary = [{ termId: 'form' }];
  const lesson = (html) => [{ lessonId: 'l-x', blocks: [{ html }] }];
  assert.doesNotThrow(() => validateGlossaryLinks(lesson('<a href="#/glossary/form">Form</a>'), glossary));
  assert.throws(() => validateGlossaryLinks(lesson('<a href="#/glossary/Form">Form</a>'), glossary), /Unbekannter Glossarbegriff/);
  assert.throws(() => validateGlossaryLinks(lesson('<a href="#/glossary/">Form</a>'), glossary), /Unbekannter Glossarbegriff/);
});

test('renderInlineMarkdown lässt Math unversehrt und ohne <p>', () => {
  const html = renderInlineMarkdown('Eintrag $a_{ij}$ der Matrix, Zeilenumbruch $a \\\\ b$ im TeX.');
  assert.match(html, /\$a_\{ij\}\$/);
  assert.match(html, /\$a \\\\ b\$/);
  assert.doesNotMatch(html, /<p>/);
});
