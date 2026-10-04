import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CatalogData, GlossaryEntry } from '../app/types';
import { loadGlossary } from '../adapters/content-repository';
import { MathMarkup } from './MathMarkup';

const stripMarkup = (html: string) => html.replace(/<[^>]+>/g, '');
// Group letters ignore diacritics: Ä lands in group A (NFD + strip marks).
const groupLetter = (term: string) => {
  const cleaned = stripMarkup(term).replace(/[$`]/g, '').trim();
  const first = cleaned.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
};
const foldSearch = (text: string) => text
  .toLocaleLowerCase('de')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

export function GlossaryView({ catalog, termId }: { catalog: CatalogData; termId?: string }) {
  const [entries, setEntries] = useState<GlossaryEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const targetRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let live = true;
    loadGlossary()
      .then((all) => { if (live) setEntries(all); })
      .catch(() => { if (live) setLoadError(true); });
    return () => { live = false; };
  }, []);
  const needle = foldSearch(query.trim());
  const filtered = useMemo(() => {
    if (!entries) return [];
    if (!needle) return entries;
    return entries.filter((entry) => foldSearch(`${stripMarkup(entry.term)} ${entry.english ?? ''} ${stripMarkup(entry.definitionHtml)}`).includes(needle));
  }, [entries, needle]);
  const groups = useMemo(() => {
    const map = new Map<string, GlossaryEntry[]>();
    for (const entry of filtered) {
      const letter = groupLetter(entry.term);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(entry);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'de'));
  }, [filtered]);
  const targetEntry = termId ? entries?.find((entry) => entry.termId === termId) : undefined;
  const unknownId = Boolean(termId && entries && !targetEntry);
  useEffect(() => {
    if (!targetEntry || !targetRef.current) return;
    const smooth = typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    targetRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    targetRef.current.querySelector('h3')?.focus();
  }, [targetEntry]);
  const lessonTitle = (id: string) => catalog.lessons.find((lesson) => lesson.lessonId === id)?.title ?? id;
  return (
    <section class="view glossary-view" aria-labelledby="glossary-title">
      <header class="view-header">
        <p class="eyebrow">Nachschlagen</p>
        <h1 id="glossary-title" tabIndex={-1}>Lexikon</h1>
        <p class="lede">Alle Begriffe, die die Lektionen definieren. Jeder Eintrag verweist auf die Lektion, die ihn erklärt.</p>
      </header>
      <label class="search-field glossary-filter">
        <span>Begriffe filtern</span>
        <input type="search" value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
      </label>
      {loadError && <p role="alert" class="content-error">Das Lexikon konnte nicht geladen werden.</p>}
      {!loadError && !entries && <p role="status">Lexikon wird geladen.</p>}
      {unknownId && <p role="status" class="glossary-unknown">Diesen Begriff gibt es nicht im Lexikon.</p>}
      {entries && filtered.length === 0 && !unknownId ? (
        <div class="empty-state"><p>Kein Begriff passt zu „{query.trim()}“.</p></div>
      ) : null}
      {groups.map(([letter, items]) => (
        <section class="glossary-group" key={letter} aria-labelledby={`glossary-group-${letter}`}>
          <h2 class="glossary-letter" id={`glossary-group-${letter}`}>{letter}</h2>
          {items.map((entry) => (
            <article
              key={entry.termId}
              id={`glossary-${entry.termId}`}
              ref={entry.termId === termId ? targetRef : undefined}
              class={entry.termId === termId ? 'glossary-entry is-target' : 'glossary-entry'}
            >
              <h3 tabIndex={entry.termId === termId ? -1 : undefined}>
                <MathMarkup inline html={entry.term} />
                {entry.english ? <span class="glossary-english">englisch <em>{entry.english}</em></span> : null}
              </h3>
              <div class="glossary-definition"><MathMarkup html={entry.definitionHtml} /></div>
              <p class="glossary-source">
                Erklärt in: {entry.lessonIds.map((id, index) => (
                  <span key={id}>{index > 0 ? ', ' : ''}<a href={`#/lesson/${id}`}>{lessonTitle(id)}</a></span>
                ))}
              </p>
            </article>
          ))}
        </section>
      ))}
    </section>
  );
}
