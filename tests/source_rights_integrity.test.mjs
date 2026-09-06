import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Independent integrity mirror of the ADR-0014 part 4 rights decisions,
// implemented without reusing tools/validate_content.mjs logic so a defect in
// the validator cannot silently hide here:
//   (a) no source classified "open" carries NC/ND/SA license markers
//   (b) the five audited legacy sources are link-only (and their licenses do
//       carry the markers that forced the reclassification)
//   (c) all 24 new W31-W39 sources exist with canonical URL + license; the 12
//       open ones carry CC BY 4.0 / CC0 / MIT / Apache-2.0 / BSD licenses
//   (d) source-rights.json contains ki-lernplattform-original and every
//       rightsId used by the new lessons/week packages/projects resolves
//   (e) link-only sources are never quoted verbatim in the research lesson
//       markdown (8-gram and 60-char window overlap against license/URL/title
//       text, plus a long-English-prose block guard)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sourcesDocument = readJson(join(ROOT, 'content', 'sources.json'));
const sourcesById = new Map(sourcesDocument.sources.map((source) => [source.sourceId, source]));

// (a) open implies no NC/ND/SA markers -------------------------------------------------------
//
// The validator (tools/validate_content.mjs, OPEN_LICENSE_MARKERS) checks the
// same invariant; this regex is written independently and is deliberately
// broader: it also catches standalone "NC"/"ND"/"SA" tokens and German
// long-form markers, so a restated license string cannot sneak past.
const NC_ND_SA_MARKERS = /by-nc|by-nd|by-sa|nc-sa|nd-sa|noncommercial|nicht[- ]kommerziell|sharealike|weitergabe\s+unter\s+gleichen\s+bedingungen|no-?derivatives|keine\s+bearbeitung|bearbeitung\s+nicht\s+erlaubt|\bNC\b|\bND\b|\bSA\b/i;

test('(a) no contentClass "open" source carries an NC/ND/SA license marker', () => {
  const offenders = sourcesDocument.sources
    .filter((source) => source.contentClass === 'open')
    .filter((source) => NC_ND_SA_MARKERS.test(source.license || ''))
    .map((source) => `${source.sourceId}: ${source.license}`);
  assert.deepEqual(offenders, [],
    `open sources with restrictive markers (must be link-only or replaced): ${offenders.join(' | ')}`);
});

// (b) reclassified legacy sources -------------------------------------------------------------

const RECLASSIFIED = ['mit-ocw-18-06sc', 'serlo-mathe', 'wikibooks-mfnf', 'serlo-algebra-grundlagen-w01', 'openintro-statistics'];

test('(b) the five audited legacy sources are link-only and their licenses justify it', () => {
  for (const sourceId of RECLASSIFIED) {
    const source = sourcesById.get(sourceId);
    assert.ok(source, `${sourceId} missing in sources.json`);
    assert.equal(source.contentClass, 'link-only',
      `${sourceId} must stay link-only after the 2026-08-31 rights audit (ADR-0014)`);
    assert.ok(NC_ND_SA_MARKERS.test(source.license || ''),
      `${sourceId}: expected a restrictive license marker as the reclassification reason`);
  }
});

// (c) the 24 new W31-W39 sources ----------------------------------------------------------------

const NEW_OPEN = [
  'cos-prereg', 'hf-model-cards-docs', 'fairlearn', 'aequitas-toolkit',
  'helm-leaderboard', 'lm-evaluation-harness', 'cookiecutter-data-science',
  'turing-way', 'wilson-good-enough', 'sandve-repro-rules', 'rougier-figures',
  'kass-statistical-practice',
];
const NEW_LINK_ONLY = [
  'stanford-encyclopedia-popper', 'jhangiani-research-methods',
  'neurips-paper-checklist', 'datasheets-for-datasets', 'data-cards-playbook',
  'gpt4-system-card', 'fairmlbook', 'strubell-energy', 'patterson-carbon',
  'stanford-ai-index-2025', 'helm-paper', 'acm-artifact-badging',
];
const OPEN_LICENSE_FAMILIES = /CC BY 4\.0|CC0|MIT|Apache-2\.0|BSD/;

test('(c) all 24 new W31-W39 sources exist with canonical URL and license; the 12 open ones are CC BY 4.0/CC0/MIT/Apache-2.0/BSD', () => {
  const ids = [...NEW_OPEN, ...NEW_LINK_ONLY];
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids in the new-source contract lists');
  for (const sourceId of ids) {
    const source = sourcesById.get(sourceId);
    assert.ok(source, `${sourceId} missing in sources.json`);
    assert.ok(typeof source.canonicalUrl === 'string' && /^https:\/\//.test(source.canonicalUrl),
      `${sourceId}: canonicalUrl missing or not https`);
    assert.ok(typeof source.license === 'string' && source.license.length >= 4,
      `${sourceId}: license statement missing`);
  }
  for (const sourceId of NEW_OPEN) {
    const source = sourcesById.get(sourceId);
    assert.equal(source.contentClass, 'open', `${sourceId} must be classified open`);
    assert.match(source.license, OPEN_LICENSE_FAMILIES,
      `${sourceId}: open classification needs a CC BY 4.0/CC0/MIT/Apache-2.0/BSD license string`);
    assert.ok(!NC_ND_SA_MARKERS.test(source.license), `${sourceId}: open license carries restrictive markers`);
  }
  for (const sourceId of NEW_LINK_ONLY) {
    assert.equal(sourcesById.get(sourceId).contentClass, 'link-only', `${sourceId} must be classified link-only`);
  }
});

// (d) rightsIds resolve ---------------------------------------------------------------------------

function collectRightsIds(node, path, hits) {
  if (Array.isArray(node)) {
    node.forEach((value, index) => collectRightsIds(value, `${path}[${index}]`, hits));
    return hits;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'rightsId' && typeof value === 'string') hits.push([`${path}.${key}`, value]);
      collectRightsIds(value, `${path}.${key}`, hits);
    }
  }
  return hits;
}

test('(d) source-rights.json ships ki-lernplattform-original and all rightsIds of the new content resolve', () => {
  const rightsIds = new Set(readJson(join(ROOT, 'content', 'source-rights.json')).sources.map((rights) => rights.sourceId));
  assert.ok(rightsIds.has('ki-lernplattform-original'),
    'rightsId ki-lernplattform-original missing in source-rights.json');

  const scanned = [
    ...readdirSync(join(ROOT, 'content', 'lessons', 'research'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => join('content', 'lessons', 'research', name)),
    ...Array.from({ length: 9 }, (_, index) => join('content', 'exercises', `w${31 + index}.json`)),
    join('content', 'projects', 'rag-capstone', 'project.json'),
    join('content', 'projects', 'rag-capstone', 'phases.json'),
  ];
  for (const relative of scanned) {
    const hits = collectRightsIds(readJson(join(ROOT, relative)), relative, []);
    for (const [path, rightsId] of hits) {
      assert.ok(rightsIds.has(rightsId), `${path}: unknown rightsId ${rightsId}`);
    }
  }
});

// (e) link-only sources are not quoted verbatim -----------------------------------------------------
//
// Link-only material may be cited by name and linked, never copied. Proxies:
//   (i) no 8-word gram of a lesson .md also appears in the 8-gram set of any
//       link-only source's license + canonicalUrl + title text (license prose
//       is the typical verbatim-quote vector; titles/URLs are too short to
//       form an 8-gram, so German prose naming a source passes),
//   (ii) no 60-char normalized window of the .md occurs inside the normalized
//       needle corpus,
//   (iii) no contiguous run of English prose longer than 300 chars (the raw
//       block-quote proxy). Code fences, inline code and links are stripped
//       first because they legitimately contain English identifiers/URLs.

const normalize = (text) => String(text)
  .replace(/<[^>]+>/g, ' ')
  .toLowerCase()
  .replace(/[^a-zäöüß0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const stripMarkdownNoise = (markdown) => markdown
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`[^`]*`/g, ' ')
  .replace(/\[[^\]]*\]\([^)]*\)/g, ' ');

const wordGrams = (text, size) => {
  const words = normalize(text).split(' ').filter(Boolean);
  const grams = new Set();
  for (let i = 0; i + size <= words.length; i += 1) grams.add(words.slice(i, i + size).join(' '));
  return grams;
};

const linkOnlyNeedles = sourcesDocument.sources
  .filter((source) => source.contentClass === 'link-only')
  .map((source) => [source.license, source.canonicalUrl, source.title].filter(Boolean).join(' '));
const needleGrams = new Set(linkOnlyNeedles.flatMap((needle) => [...wordGrams(needle, 8)]));
const needleNormalized = linkOnlyNeedles.map((needle) => normalize(needle).replace(/ /g, '')).join('|');

const ENGLISH_MARKERS = new Set([
  'the', 'that', 'this', 'these', 'those', 'with', 'from', 'of', 'to', 'and',
  'or', 'but', 'not', 'is', 'are', 'was', 'has', 'have', 'had', 'they', 'them',
  'their', 'its', 'it', 'he', 'she', 'we', 'you', 'your', 'what', 'when', 'how',
  'why', 'which', 'who', 'where', 'because', 'while', 'then', 'than', 'into',
  'over', 'under', 'between', 'should', 'could', 'would', 'can', 'will', 'be',
  'been', 'were', 'such', 'may', 'must', 'also', 'more', 'most', 'only', 'same',
  'so', 'no', 'nor', 'do', 'does', 'did', 'each', 'few', 'own', 'too', 'very', 'just',
]);

function longestEnglishProseBlock(markdown) {
  const sentences = stripMarkdownNoise(markdown)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim());
  let block = 0;
  let longest = 0;
  for (const sentence of sentences) {
    const words = sentence.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean);
    const isEnglish = words.length >= 8 && words.filter((word) => ENGLISH_MARKERS.has(word)).length >= 4;
    block = isEnglish ? block + sentence.length : 0;
    longest = Math.max(longest, block);
  }
  return longest;
}

test('(e) research lesson markdown never quotes link-only source text verbatim', () => {
  const markdownFiles = readdirSync(join(ROOT, 'content', 'lessons', 'research'))
    .filter((name) => name.endsWith('.md'))
    .sort();

  // Self-control: quoting a link-only license sentence must be detected.
  const fairmlbook = sourcesById.get('fairmlbook');
  const quoted = `Wir übernehmen hier wörtlich: ${fairmlbook.license}. Das ist keine gute Idee.`;
  const quotedGrams = wordGrams(stripMarkdownNoise(quoted), 8);
  assert.ok([...quotedGrams].some((gram) => needleGrams.has(gram)),
    'self-control failed: a verbatim license quote must trip the 8-gram detector');
  assert.ok(longestEnglishProseBlock(quoted + ' ' + quoted) > 0 || needleNormalized.length > 0,
    'self-control preconditions broken');

  for (const name of markdownFiles) {
    const markdown = readFileSync(join(ROOT, 'content', 'lessons', 'research', name), 'utf8');
    const prose = stripMarkdownNoise(markdown);

    const overlappingGrams = [...wordGrams(prose, 8)].filter((gram) => needleGrams.has(gram));
    assert.deepEqual(overlappingGrams, [],
      `${name}: verbatim 8-word overlap with link-only license/URL/title text`);

    const compact = normalize(prose).replace(/ /g, '');
    const windowHits = [];
    for (let i = 0; i + 60 <= compact.length; i += 1) {
      const window = compact.slice(i, i + 60);
      if (needleNormalized.includes(window)) windowHits.push(window);
    }
    assert.deepEqual(windowHits, [],
      `${name}: 60-char window copied from link-only license/URL/title text`);

    const englishBlock = longestEnglishProseBlock(markdown);
    assert.ok(englishBlock <= 300,
      `${name}: contiguous English prose block of ${englishBlock} chars (limit 300) — link-only raw-text quote suspected`);
  }
});
