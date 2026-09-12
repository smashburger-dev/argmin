import { Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { MathInput } from './MathInput';
import { MathMarkup } from './MathMarkup';
import { Button } from './Button';

interface Fragment {
  id: string;
  text: string;
}

// S4D2: Antwort-Inputs je Aktivitätstyp,
// für Definitions- und Familienübungen gemeinsam genutzt. Arbeitet auf der
// minimalen Struktur (activityType, parameters, choices, rubric), die beide
// Instanzformen liefern.
export interface AnswerableExercise {
  activityType: string;
  prompt?: string;
  parameters: {
    variables?: Array<{ name: string; value: number | string; type?: string }>;
    fragments?: Fragment[];
    initialOrder?: string[];
    snippet?: string;
    minWords?: number;
    [key: string]: unknown;
  };
  expectedAnswer?: {
    minWords?: number;
    gaps?: Array<{ answer: string; input?: string }>;
    [key: string]: unknown;
  };
  choices?: Array<{ id: string; text: string }>;
  rubric?: Array<Record<string, unknown>> | null;
}

const GAP_TOKEN = '[[gap]]';

/** Split a fading prompt into renderable segments, balancing math spans: a
 *  [[gap]] inside a $...$ (or $$...$$) span closes the span before the input
 *  and reopens it after — the original closing delimiter is consumed when
 *  the gap ends the span. Counts $-runs, so $$ display math keeps parity. */
function splitFadingPrompt(prompt: string): string[] {
  const parts = String(prompt ?? '').split(GAP_TOKEN);
  let offset = 0;
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index] ?? '';
    offset += part.length;
    const groups = String(prompt).slice(0, offset).match(/\$+/g) || [];
    offset += GAP_TOKEN.length;
    if (groups.length % 2 === 0) continue; // marker outside math
    const close = (groups[groups.length - 1] || '').length >= 2 ? '$$' : '$';
    const next = parts[index + 1] ?? '';
    parts[index] = `${part}${close}`;
    parts[index + 1] = next.startsWith(close) ? next.slice(close.length) : `${close}${next}`;
  }
  return parts;
}

/** Worked-example fading: the prompt itself is the answer surface — text
 *  segments render through MathMarkup, every [[gap]] marker becomes an
 *  inline input. Answers are the raw strings in marker order. */
export function FadingPrompt({ exercise, onAnswer }: { exercise: AnswerableExercise; onAnswer: (answer: unknown) => void }) {
  const parts = useMemo(() => splitFadingPrompt(exercise.prompt ?? ''), [exercise.prompt]);
  const gapCount = parts.length - 1;
  const gaps = (exercise.expectedAnswer?.gaps || []) as Array<{ input?: string }>;
  const [values, setValues] = useState<string[]>(() => Array.from({ length: gapCount }, () => ''));
  const update = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    setValues(next);
    onAnswer(next);
  };
  return (
    <div class="fading-control">
      {parts.map((part, index) => (
        <Fragment key={index}>
          <MathMarkup html={part} inline />
          {index < gapCount ? (
            <input
              class="fading-gap"
              aria-label={`Lücke ${index + 1}`}
              inputMode={gaps[index]?.input === 'expression' ? 'text' : 'decimal'}
              value={values[index] ?? ''}
              onInput={(event) => update(index, event.currentTarget.value)}
              autocomplete="off"
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

export function AnswerControls({ exercise, onAnswer }: { exercise: AnswerableExercise; onAnswer: (answer: unknown) => void }) {
  const [choice, setChoice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [output, setOutput] = useState('');
  const [text, setText] = useState('');
  const [checks, setChecks] = useState<string[]>([]);
  const variables = (exercise.parameters.variables || []) as Array<{ name: string; value: number | string; type?: string }>;
  const [trace, setTrace] = useState<Record<string, string>>({});
  const fragments = (exercise.parameters.fragments || []) as Fragment[];
  const initialOrder = (exercise.parameters.initialOrder || fragments.map((fragment) => fragment.id)) as string[];
  const [order, setOrder] = useState([...initialOrder]);
  const byId = useMemo(() => new Map(fragments.map((fragment) => [fragment.id, fragment])), [fragments]);
  const excluded = fragments.filter((fragment) => !order.includes(fragment.id));

  if (exercise.activityType === 'numeric') {
    return <label class="answer-field"><span>Antwort als ganze Zahl</span><input aria-label="Antwort als ganze Zahl" inputMode="numeric" value={text} onInput={(event) => { setText(event.currentTarget.value); onAnswer(event.currentTarget.value); }} autocomplete="off" /></label>;
  }
  if (exercise.activityType === 'vector') {
    return <label class="answer-field"><span>Lösungspaar</span><input aria-label="Lösungspaar" value={text} onInput={(event) => { setText(event.currentTarget.value); onAnswer(event.currentTarget.value); }} placeholder="(1, 3)" autocomplete="off" /></label>;
  }
  if (exercise.activityType === 'algebraic-expression') {
    return <MathInput value={text} onChange={(value: string) => { setText(value); onAnswer(value); }} />;
  }
  if (exercise.activityType === 'single-choice') {
    return <fieldset class="choice-list"><legend>Antwortmöglichkeiten</legend>{(exercise.choices || []).map((item) => <label key={item.id}><input type="radio" name="answer" value={item.id} checked={choice === item.id} onChange={() => { setChoice(item.id); onAnswer(item.id); }} /><MathMarkup html={item.text} inline /></label>)}</fieldset>;
  }
  if (exercise.activityType === 'multiple-choice') {
    const toggle = (id: string, checked: boolean) => {
      const next = checked ? [...selected, id] : selected.filter((item) => item !== id);
      setSelected(next);
      onAnswer(next);
    };
    return <fieldset class="choice-list"><legend>Antwortmöglichkeiten — alle zutreffenden auswählen</legend>{(exercise.choices || []).map((item) => <label key={item.id}><input type="checkbox" name="answer" value={item.id} checked={selected.includes(item.id)} onChange={(event) => toggle(item.id, event.currentTarget.checked)} /><MathMarkup html={item.text} inline /></label>)}</fieldset>;
  }
  if (exercise.activityType === 'predict-output') {
    return <div class="predict-control">{exercise.parameters.snippet ? <pre aria-label="Programmcode">{String(exercise.parameters.snippet)}</pre> : null}<label class="answer-field"><span>Erwartete Ausgabe</span><textarea rows={4} value={output} onInput={(event) => { setOutput(event.currentTarget.value); onAnswer(event.currentTarget.value); }} spellcheck={false} /></label></div>;
  }
  if (exercise.activityType === 'short-rationale' || exercise.activityType === 'diagnostic-rationale') {
    // diagnostic-rationale nutzt denselben Renderpfad wie short-rationale —
    // nur ohne Rubrik-Selbsteinschätzung und mit String-Antwort statt Payload.
    const diagnostic = exercise.activityType === 'diagnostic-rationale';
    const minWords = diagnostic
      ? Number(exercise.expectedAnswer?.minWords ?? exercise.parameters.minWords ?? 20)
      : Number(exercise.parameters.minWords || 20);
    const rubric = (exercise.rubric || []) as Array<{ id: string; must: string }>;
    const update = (id: string, checked: boolean) => {
      const next = id === '__none__' && checked
        ? ['__none__']
        : checked
          ? [...checks.filter((item) => item !== '__none__'), id]
          : checks.filter((item) => item !== id);
      setChecks(next);
      onAnswer({ text, checks: next });
    };
    return <div class="rationale-control"><label class="answer-field"><span>{diagnostic ? 'Deine Diagnose' : 'Deine Begründung'}, mindestens {String(minWords)} Wörter</span><textarea rows={7} value={text} onInput={(event) => { const next = event.currentTarget.value; setText(next); onAnswer(diagnostic ? next : { text: next, checks }); }} /></label>{diagnostic ? null : <fieldset class="choice-list"><legend>Selbsteinschätzung nach deinem Versuch</legend>{rubric.map((item) => <label key={item.id}><input type="checkbox" value={item.id} checked={checks.includes(item.id)} onChange={(event) => update(item.id, event.currentTarget.checked)} /><MathMarkup html={item.must} inline /></label>)}<label><input type="checkbox" value="__none__" checked={checks.includes('__none__')} onChange={(event) => update('__none__', event.currentTarget.checked)} /><span>Keiner dieser Bestandteile trifft zu.</span></label></fieldset>}</div>;
  }
  if (exercise.activityType === 'worked-example-fading') {
    // Der vollständige Renderpfad sitzt in FamilyExerciseView im Prompt-Slot;
    // dieser Branch hält die Dispatch-Tabelle für andere Aufrufer vollständig.
    return <FadingPrompt exercise={exercise} onAnswer={onAnswer} />;
  }
  if (exercise.activityType === 'code-trace') {
    const hasRepr = variables.some((variable) => variable.type === 'repr');
    return <div class="trace-control"><pre aria-label="Programmcode">{String(exercise.parameters.snippet || '')}</pre><fieldset><legend>{hasRepr ? 'Werte nach der jeweiligen Zeile (Python-Schreibweise)' : 'Endwerte'}</legend>{variables.map((variable) => <label key={variable.name}><span>{variable.name}</span><input inputMode={variable.type === 'repr' ? undefined : 'numeric'} placeholder={variable.type === 'repr' ? '[1, 2]' : undefined} value={trace[variable.name] || ''} onInput={(event) => { const next = { ...trace, [variable.name]: event.currentTarget.value }; setTrace(next); onAnswer(next); }} /></label>)}</fieldset></div>;
  }
  if (exercise.activityType === 'parsons') {
    const move = (index: number, offset: number) => {
      const target = index + offset;
      if (target < 0 || target >= order.length) return;
      const next = [...order];
      const currentId = next[index];
      const targetId = next[target];
      if (currentId === undefined || targetId === undefined) return;
      next[index] = targetId;
      next[target] = currentId;
      setOrder(next);
      onAnswer(next);
    };
    const remove = (id: string) => {
      const next = order.filter((item) => item !== id);
      setOrder(next);
      onAnswer(next);
    };
    const restore = (id: string) => {
      const next = [...order, id];
      setOrder(next);
      onAnswer(next);
    };
    return <div class="parsons-control"><h2>Verwendete Zeilen</h2><ol>{order.map((id, index) => <li key={id}><code>{byId.get(id)?.text}</code><span><Button size="sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`${id} nach oben`}>↑</Button><Button size="sm" onClick={() => move(index, 1)} disabled={index === order.length - 1} aria-label={`${id} nach unten`}>↓</Button><Button size="sm" onClick={() => remove(id)}>Aussortieren</Button></span></li>)}</ol>{excluded.length > 0 && <div class="excluded-lines"><h3>Aussortiert</h3>{excluded.map((fragment) => <Button size="sm" key={fragment.id} onClick={() => restore(fragment.id)}><code>{fragment.text}</code><span>Zurückholen</span></Button>)}</div>}</div>;
  }
  return <p>Dieser Aufgabentyp öffnet im Codeworkspace.</p>;
}
