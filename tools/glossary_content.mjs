import { renderInlineMarkdown } from './markdown_content.mjs';

// Glossary pipeline (authoring-guide §9 „Lexikon"): the only source is the
// `## Begriffe auf einen Blick` section of lesson markdowns. The compiled
// bundle carries a `glossary` section, loaded lazily like sources/tools.

const GLOSSARY_HEADING = /^## Begriffe auf einen Blick\s*$/m;
const GLOSSARY_LINE = /^- \*\*([^*]+)\*\*(?: \(englisch \*([^*]+)\*\))?: (.+)$/;

export function parseGlossarySection(markdown) {
  const start = markdown.search(GLOSSARY_HEADING);
  if (start === -1) return [];
  const section = markdown.slice(start).split('\n').slice(1);
  const entries = [];
  for (const line of section) {
    if (line.startsWith('## ')) break;
    const match = line.match(GLOSSARY_LINE);
    if (!match) continue;
    entries.push({ term: match[1].trim(), english: match[2]?.trim() ?? null, definition: match[3].trim() });
  }
  return entries;
}

export function glossaryTermId(term) {
  return term
    .toLocaleLowerCase('de')
    .replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')
    .replace(/[$`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sortKey = (term) => term.replace(/[$`]/g, '');

export function buildGlossary(lessons) {
  const byId = new Map();
  for (const { lessonId, markdownSources } of lessons) {
    for (const source of markdownSources || []) {
      for (const entry of parseGlossarySection(source)) {
        const termId = glossaryTermId(entry.term);
        const existing = byId.get(termId);
        if (!existing) {
          byId.set(termId, { termId, term: entry.term, english: entry.english, definition: entry.definition, lessonIds: [lessonId] });
          continue;
        }
        if (existing.term !== entry.term) {
          throw new Error(`Glossar-ID-Kollision ${termId}: „${existing.term}“ vs „${entry.term}“ (${lessonId})`);
        }
        if (existing.definition !== entry.definition || existing.english !== entry.english) {
          throw new Error(`Glossar-Begriff „${entry.term}“ abweichend definiert (${lessonId})`);
        }
        if (!existing.lessonIds.includes(lessonId)) existing.lessonIds.push(lessonId);
      }
    }
  }
  return [...byId.values()]
    .sort((a, b) => sortKey(a.term).localeCompare(sortKey(b.term), 'de'))
    .map(({ termId, term, english, definition, lessonIds }) => ({
      termId, term: renderInlineMarkdown(term), english, definitionHtml: renderInlineMarkdown(definition), lessonIds,
    }));
}
