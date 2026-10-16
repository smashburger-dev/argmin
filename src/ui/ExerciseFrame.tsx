import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { ExerciseContext } from './exercise-context';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { Button } from './Button';
import { MathMarkup } from './MathMarkup';

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
  /** Context override for the sidebar back button (e.g. the stay-in-challenge
   *  flow points it at #/challenge instead of lesson/module/learn). */
  backHref?: string;
  backLabel?: string;
};

function backTarget(ctx: ExerciseContext, backHref?: string, backLabel?: string) {
  const href = backHref ?? ctx.lessonHref ?? ctx.moduleHref ?? '#/learn';
  const label = backLabel ?? (ctx.lessonHref ? 'Zurück zur Lektion' : ctx.moduleHref ? 'Zum Modul' : 'Zum Lernen');
  return { href, label };
}

function crumbItems(ctx: ExerciseContext): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ href: '#/learn', label: 'Lernen' }];
  if (ctx.module) items.push({ href: ctx.moduleHref, label: ctx.module.title });
  if (ctx.lesson && ctx.lesson.title !== ctx.module?.title) items.push({ href: ctx.lessonHref, label: ctx.lesson.title });
  items.push({ label: ctx.title });
  return items;
}

function HintStack({ hints }: { hints: string[] }) {
  if (!hints.length) return null;
  return (
    <div class="hint-stack">
      {hints.map((hint) => <p key={hint}><strong>Hinweis</strong> <MathMarkup html={hint} inline /></p>)}
    </div>
  );
}

function NextStepsPanel({ ctx, done, back }: { ctx: ExerciseContext; done: boolean; back: { href: string; label: string } }) {
  return (
    <aside class="exercise-side">
      <p class="card-kicker">Weiter</p>
      <h2>Dein nächster Schritt</h2>
      <div class="actions vertical">
        <Button variant={done ? 'primary' : 'secondary'} href={ctx.nextVariantHref}>Nächste Variante</Button>
        {ctx.nextTaskHref && ctx.nextTaskTitle ? <Button variant="secondary" href={ctx.nextTaskHref}>Nächste Aufgabe: {ctx.nextTaskTitle}</Button> : null}
        <Button variant="ghost" href={back.href}>{back.label}</Button>
      </div>
      <p class="exercise-side-note">Jede neue Variante ist ein eigener Versuch.</p>
    </aside>
  );
}

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
  backHref: backHrefProp,
  backLabel: backLabelProp,
}: Props) {
  const back = backTarget(ctx, backHrefProp, backLabelProp);
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
    <section class="view exercise-view" aria-labelledby="exercise-title" data-case-id={ctx.caseId}>
      <Breadcrumbs items={crumbItems(ctx)} />
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
          {answer ? <div class="exercise-answer" data-tour="exercise-answer">{answer}</div> : null}
          <div class="actions" data-tour="exercise-check">{actions}</div>
          {feedback ? <div class="exercise-feedback" data-tour="exercise-feedback" role="status" tabIndex={-1} ref={feedbackBox}>{feedback}</div> : null}
          <HintStack hints={hints} />
          {solution}
        </div>
        <NextStepsPanel ctx={ctx} done={done} back={back} />
      </div>
    </section>
  );
}
