import { useMemo, useState } from 'preact/hooks';
import type { CatalogData } from '../app/types';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { learnerExerciseLabel, minutesLabel } from './learner-labels';
import { MathMarkup } from './MathMarkup';

interface SearchHit {
  id: string;
  href: string;
  title: string;
  meta?: string;
  detail?: string;
  /** Detail contains inline markup (exercise scenario titles), render via MathMarkup. */
  detailMarkup?: boolean;
}

const MIN_QUERY_LENGTH = 2;
const GROUP_LIMIT = 8;

/** Plain `includes` over title/description/objectives — a few hundred catalog
 *  documents are sub-millisecond, so no index is needed. */
function collect<T>(items: T[], map: (item: T) => SearchHit | null): { hits: SearchHit[]; total: number } {
  const all: SearchHit[] = [];
  for (const item of items) {
    const hit = map(item);
    if (hit) all.push(hit);
  }
  return { hits: all.slice(0, GROUP_LIMIT), total: all.length };
}

export function SearchView({ catalog }: { catalog: CatalogData }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLocaleLowerCase('de');
  const groups = useMemo(() => {
    if (needle.length < MIN_QUERY_LENGTH) return [];
    const matches = (...parts: Array<string | undefined>) =>
      parts.some((part) => part?.toLocaleLowerCase('de').includes(needle));
    return [
      {
        label: 'Kompetenzen',
        ...collect(catalog.competencies, (competency) => matches(competency.title, competency.description)
          ? { id: competency.competencyId, href: `#/competency/${competency.competencyId}`, title: competency.title, detail: competency.description }
          : null),
      },
      {
        label: 'Module',
        ...collect(catalog.learningModules || [], (module) => matches(module.title, module.description)
          ? { id: module.moduleId, href: `#/module/${module.moduleId}`, title: module.title, detail: module.description, meta: minutesLabel(module.estimatedMinutes) }
          : null),
      },
      {
        label: 'Lektionen',
        ...collect(catalog.lessons, (lesson) => matches(lesson.title, ...(lesson.objectives || []))
          ? { id: lesson.lessonId, href: `#/lesson/${lesson.lessonId}`, title: lesson.title, detail: lesson.objectives[0], meta: minutesLabel(lesson.estimatedMinutes) }
          : null),
      },
      {
        label: 'Aufgaben',
        ...collect(catalog.exercises, (exercise) => {
          if (!exercise.familyId || !exercise.caseId) return null;
          // Titles can carry inline markup; match the stripped text and the
          // topic-bearing familyId, render the original via MathMarkup.
          const plain = exercise.title.replace(/<[^>]+>/g, ' ');
          if (!matches(plain, exercise.familyId)) return null;
          return {
            id: exercise.definitionId,
            href: routeForDefinition(exercise),
            title: learnerExerciseLabel(exercise),
            detail: exercise.title,
            detailMarkup: true,
            meta: minutesLabel(exercise.estimatedMinutes),
          };
        }),
      },
      {
        label: 'Projekte',
        ...collect(catalog.projects, (project) => matches(project.title, project.description)
          ? { id: project.projectId, href: `#/project/${project.projectId}`, title: project.title, detail: project.description }
          : null),
      },
    ].filter((group) => group.total > 0);
  }, [catalog, needle]);
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const shown = groups.reduce((sum, group) => sum + group.hits.length, 0);
  return (
    <section class="view" aria-labelledby="search-title">
      <header class="view-header">
        <p class="eyebrow">Katalog</p>
        <h1 id="search-title" tabIndex={-1}>Suche</h1>
        <p class="lede">Titel, Beschreibungen und Lernziele des gesamten Katalogs — lokal, ohne Netz.</p>
      </header>
      <div role="search">
        <label class="search-field omni-search">
          <span class="visually-hidden">Katalog durchsuchen</span>
          <input
            type="search"
            placeholder="Begriff eingeben, z. B. Matrix, Bruch, Commit …"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </div>
      {needle.length < MIN_QUERY_LENGTH ? (
        <p class="plan-note">Mindestens zwei Zeichen eingeben, um Kompetenzen, Module, Lektionen, Aufgaben und Projekte zu finden.</p>
      ) : groups.length === 0 ? (
        <div class="empty-state">
          <h2>Keine Treffer</h2>
          <p>Für „{query.trim()}“ ist nichts im Katalog. Ein allgemeinerer Begriff oder eine andere Schreibweise hilft.</p>
        </div>
      ) : (
        <>
          <p class="plan-note" role="status">{total} Treffer{total > shown ? ` — die ersten ${shown} werden gezeigt` : ''}</p>
          {groups.map((group, index) => (
            <section class="activity-section" aria-labelledby={`search-group-${index}`} key={group.label}>
              <div class="section-heading">
                <div><h2 id={`search-group-${index}`}>{group.label}</h2></div>
                <span>{group.hits.length < group.total ? `${group.hits.length} von ${group.total}` : `${group.total}`}</span>
              </div>
              <div class="lesson-list" role="list">
                {group.hits.map((hit) => (
                  <div role="listitem" key={hit.id}>
                    <a href={hit.href}>
                      {hit.meta ? <span>{hit.meta}</span> : null}
                      <strong>{hit.title}</strong>
                      {hit.detail ? <p>{hit.detailMarkup ? <MathMarkup inline html={hit.detail} /> : hit.detail}</p> : null}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
