import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { ExerciseContext } from './exercise-context';
import { Breadcrumbs } from './Breadcrumbs';
import { Button } from './Button';

type Props = {
  ctx: ExerciseContext;
  eyebrow: string;
  prompt: ComponentChildren;
  snippet?: string;
  answer: ComponentChildren;
  actions: ComponentChildren;
  feedback?: ComponentChildren;
  hints: string[];
  solution?: ComponentChildren;
  done: boolean;
};

export function ExerciseFrame({
  ctx,
  eyebrow,
  prompt,
  snippet,
  answer,
  actions,
  feedback,
  hints,
  solution,
  done,
}: Props) {
  const backLabel = ctx.lessonHref ? 'Zurück zur Lektion' : ctx.moduleHref ? 'Zum Modul' : 'Zum Lernen';
  const backHref = ctx.lessonHref || ctx.moduleHref || '#/learn';
  const feedbackBox = useRef<HTMLDivElement>(null);
  const hadFeedback = useRef(false);
  useEffect(() => {
    const present = feedback !== undefined && feedback !== null && feedback !== false;
    if (present && !hadFeedback.current) {
      feedbackBox.current?.focus({ preventScroll: true });
      feedbackBox.current?.scrollIntoView({ block: 'nearest' });
    }
    hadFeedback.current = present;
  });
  return (
    <section class="view exercise-view" aria-labelledby="exercise-title">
      <Breadcrumbs items={[
        { href: '#/learn', label: 'Lernen' },
        ...(ctx.module ? [{ href: ctx.moduleHref, label: ctx.module.title }] : []),
        ...(ctx.lesson && ctx.lesson.title !== ctx.module?.title
          ? [{ href: ctx.lessonHref, label: ctx.lesson.title }]
          : []),
        { label: ctx.title },
      ]} />
      <header class="view-header">
        <p class="eyebrow">{eyebrow}</p>
        <h1 id="exercise-title" tabIndex={-1}>{ctx.title}</h1>
        {ctx.summary ? <p class="lede">{ctx.summary}</p> : null}
      </header>
      <div class="exercise-layout">
        <div class="exercise-main">
          <article class="prompt-card" data-tour="exercise-prompt">
            <div class="prompt-content">{prompt}</div>
            {snippet ? <pre><code>{snippet}</code></pre> : null}
          </article>
          <div class="exercise-answer" data-tour="exercise-answer">{answer}</div>
          <div class="actions" data-tour="exercise-check">{actions}</div>
          {feedback ? <div class="exercise-feedback" data-tour="exercise-feedback" role="status" tabIndex={-1} ref={feedbackBox}>{feedback}</div> : null}
          {hints.length > 0 && (
            <div class="hint-stack">
              {hints.map((hint) => <p key={hint}><strong>Hinweis</strong> {hint}</p>)}
            </div>
          )}
          {solution}
        </div>
        <aside class="exercise-side">
          <p class="card-kicker">Weiter</p>
          <h2>Dein nächster Schritt</h2>
          <div class="actions vertical">
            <Button variant={done ? 'primary' : 'secondary'} href={ctx.nextVariantHref}>Nächste Variante</Button>
            {ctx.nextTaskHref && ctx.nextTaskTitle ? <Button variant="secondary" href={ctx.nextTaskHref}>Nächste Aufgabe: {ctx.nextTaskTitle}</Button> : null}
            <Button variant="ghost" href={backHref}>{backLabel}</Button>
          </div>
          <p class="exercise-side-note">Jede neue Variante ist ein eigener Versuch.</p>
        </aside>
      </div>
    </section>
  );
}
