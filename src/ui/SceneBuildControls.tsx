import { useMemo, useState } from 'preact/hooks';
import { gradeSceneBuild } from '../../assets/js/core/scene_build_grader.mjs';
import { equationText } from '../../assets/js/figures/objects/f12-diagram.mjs';
import { FigureBlock } from './FigureBlock';
import { Button } from './Button';
import { balanceAnswer, initialSceneAnswer, portionNumber, saveSceneDraft } from './scene-build-state';
import type { BalanceStep, SceneAnswer, SceneExercise, SceneFeedback } from './scene-build-state';
import type { FigureSpec } from '../app/types';
import './scene-build.css';

type Props = { exercise: SceneExercise; answer: SceneAnswer; feedback: SceneFeedback | null; disabled: boolean; onAnswer: (answer: SceneAnswer) => void };
type FormProps = { answer: SceneAnswer; disabled: boolean; update: (answer: SceneAnswer) => void; fields: NonNullable<SceneFeedback['fields']> };

function FieldErrors({ fields, path }: { fields: FormProps['fields']; path: string }) {
  const errors = fields.filter((field) => !field.correct && field.path.startsWith(path));
  return <>{errors.map((field, i) => <p key={i} class="scene-field-error" role="status">{field.message}</p>)}</>;
}

function MixerForm({ answer, update, disabled, fields }: FormProps) {
  const [text, setText] = useState(() => answer.form.portions?.map(String) ?? ['0', '0']);
  const change = (i: number, value: string) => {
    const next = [...text]; next[i] = value; setText(next);
    update({ ...answer, form: { ...answer.form, portions: next.map(portionNumber) } });
  };
  return <fieldset class="scene-form" disabled={disabled}>
    <legend>Deine Mischung</legend>
    <label>Lösungsfall<select value={answer.form.solutionSet} aria-invalid={fields.some((f) => !f.correct && f.path === 'form.solutionSet')}
      onChange={(e) => update({ ...answer, form: { ...answer.form, solutionSet: e.currentTarget.value } })}>
      <option value="unique">Genau eine Lösung</option><option value="infinite">Unendlich viele Lösungen</option><option value="none">Keine Lösung</option>
    </select></label>
    <FieldErrors fields={fields} path="form.solutionSet" />
    <div class="scene-fields">{text.map((value, i) => <label key={i}>Portionen a{i === 0 ? '₁' : '₂'}
      <input value={value} inputMode="text" maxLength={40} disabled={answer.form.solutionSet === 'none'}
        aria-invalid={fields.some((f) => !f.correct && f.path === 'form.portions')}
        onInput={(e) => change(i, e.currentTarget.value)} /></label>)}</div>
    <p>Auch −1,5 oder −3/2 sind erlaubt. Negative Portionen sind algebraische Koeffizienten.</p>
    <FieldErrors fields={fields} path="form.portions" />
  </fieldset>;
}

function LearningRateForm({ exercise, answer, update, disabled, fields }: FormProps & { exercise: SceneExercise }) {
  const etas = Array.isArray(exercise.parameters.etaValues) ? exercise.parameters.etaValues as number[] : [];
  return <fieldset class="scene-form" disabled={disabled}>
    <legend>Lernrate für diesen Trainingslauf</legend>
    <label>Lernrate η<select value={String(answer.form.eta ?? '')} aria-invalid={fields.some((f) => !f.correct && f.path === 'form.eta')}
      onChange={(event) => update({ ...answer, form: { ...answer.form, eta: Number(event.currentTarget.value) } })}>
      {etas.map((eta) => <option key={eta} value={eta}>{eta}</option>)}
    </select></label>
    <p>Wähle eine Lernrate und prüfe den vollständigen Lauf. Mehrere Werte können die Kriterien erfüllen.</p>
    <FieldErrors fields={fields} path="form.eta" />
  </fieldset>;
}

type TagTask = {
  lines: { lineId: string; line: number; sourceLine: string }[];
  lineIds: string[];
  selectionOptions: { names: { name: string; label: string }[]; objects: { objectId: string; label: string }[] };
};

function TagForm({ exercise, answer, update, disabled, fields }: FormProps & { exercise: SceneExercise }) {
  const task = exercise.parameters.tagTask as TagTask;
  const tags = answer.form.tags ?? [];
  const [pending, setPending] = useState<Record<string, { name: string; objectId: string }[]>>({});
  const rowsFor = (lineId: string) => pending[lineId] ?? tags.find((state) => state.lineId === lineId)?.bindings ?? [];
  const changeBinding = (lineId: string, index: number, property: 'name' | 'objectId', value: string) => {
    const rows = rowsFor(lineId).map((row) => ({ ...row }));
    rows[index] = { ...(rows[index] ?? { name: '', objectId: '' }), [property]: value };
    setPending({ ...pending, [lineId]: rows });
    update({ ...answer, form: { ...answer.form, tags: tags.map((state) => state.lineId === lineId ? { ...state, bindings: rows } : state) } });
  };
  const addBinding = (lineId: string) => {
    const rows = [...rowsFor(lineId), { name: '', objectId: '' }];
    setPending({ ...pending, [lineId]: rows });
    update({ ...answer, form: { ...answer.form, tags: tags.map((state) => state.lineId === lineId ? { ...state, bindings: rows } : state) } });
  };
  const removeBinding = (lineId: string, index: number) => {
    const rows = rowsFor(lineId).filter((_, rowIndex) => rowIndex !== index);
    setPending({ ...pending, [lineId]: rows });
    update({ ...answer, form: { ...answer.form, tags: tags.map((state) => state.lineId === lineId ? { ...state, bindings: rows } : state) } });
  };
  return <fieldset class="scene-form trace-tag-form" disabled={disabled}>
    <legend>Bindungen nach den Programmzeilen</legend>
    <p>Wähle alle Bindungen im angezeigten Zustand, auch wenn sie schon vorher bestanden. Namen und Objekte sind getrennte Kandidatenlisten.</p>
    {task.lines.map((line) => <section class="trace-tag-state" key={line.lineId}>
      <h4>{line.line > 0 ? `Zeile ${line.line}` : 'Startzustand'}: <code>{line.sourceLine || 'Startzustand'}</code></h4>
      {rowsFor(line.lineId).map((binding, index) => <div class="scene-fields trace-tag-row" key={index}>
        <label>Name<select value={binding.name} onChange={(event) => changeBinding(line.lineId, index, 'name', event.currentTarget.value)}>
          <option value="">Auswählen …</option>{task.selectionOptions.names.map((item) => <option key={item.name} value={item.name}>{item.label}</option>)}
        </select></label>
        <label>Objekt<select value={binding.objectId} onChange={(event) => changeBinding(line.lineId, index, 'objectId', event.currentTarget.value)}>
          <option value="">Auswählen …</option>{task.selectionOptions.objects.map((item) => <option key={item.objectId} value={item.objectId}>{item.label}</option>)}
        </select></label>
        <Button variant="ghost" onClick={() => removeBinding(line.lineId, index)}>Entfernen</Button>
      </div>)}
      <Button variant="ghost" disabled={rowsFor(line.lineId).length >= task.selectionOptions.names.length} onClick={() => addBinding(line.lineId)}>Bindung ergänzen</Button>
      {fields.some((field) => !field.correct && field.path.startsWith(`form.tags.${line.lineId}`))
        ? <p class="scene-field-error" role="status">Prüfe die Bindungen in diesem Zustand.</p> : null}
    </section>)}
  </fieldset>;
}

const OP_NAMES: Record<string, string> = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
function BalanceForm({ exercise, answer, update, disabled, fields }: FormProps & { exercise: SceneExercise }) {
  const [operation, setOperation] = useState('subtract');
  const [side, setSide] = useState('both');
  const [term, setTerm] = useState({ x: '0', constant: '0' });
  const add = () => update(balanceAnswer(exercise, [...answer.steps, { operation, side, term: { ...term } }]));
  const invalid = fields.some((f) => !f.correct && f.path.startsWith('steps.'));
  return <fieldset class="scene-form" disabled={disabled}>
    <legend>Dein nächster Umformungsschritt</legend>
    <div class="scene-fields">
      <label>Operation<select value={operation} onChange={(e) => setOperation(e.currentTarget.value)}>
        <option value="add">Plus</option><option value="subtract">Minus</option><option value="multiply">Mal</option><option value="divide">Geteilt durch</option>
      </select></label>
      <label>Auf welcher Seite?<select value={side} onChange={(e) => setSide(e.currentTarget.value)}>
        <option value="both">Beide Seiten</option><option value="left">Nur links</option><option value="right">Nur rechts</option>
      </select></label>
      <label>Koeffizient von x<input value={term.x} maxLength={24} onInput={(e) => setTerm({ ...term, x: e.currentTarget.value })} /></label>
      <label>Konstante Zahl<input value={term.constant} maxLength={24} onInput={(e) => setTerm({ ...term, constant: e.currentTarget.value })} /></label>
    </div>
    <p>Der Term ist Koeffizient · x + Zahl. Für „minus 3“: 0 und 3. Brüche als -3/2, kein Dezimalkomma.</p>
    <div class="actions">
      <Button variant="secondary" disabled={invalid || answer.steps.length >= 128} onClick={add}>Schritt anwenden</Button>
      <Button variant="ghost" disabled={!answer.steps.length} onClick={() => update(balanceAnswer(exercise, answer.steps.slice(0, -1)))}>Letzten Schritt entfernen</Button>
    </div>
    <FieldErrors fields={fields} path="steps" />
    <FieldErrors fields={fields} path="form.equation" />
    <BalanceHistory steps={answer.steps} />
  </fieldset>;
}

function BalanceHistory({ steps }: { steps: BalanceStep[] }) {
  if (!steps.length) return null;
  return <ol class="scene-history" aria-label="Deine Umformungen">{steps.map((step, i) => <li key={i}>
    {OP_NAMES[step.operation]} ({step.term.x}x + {step.term.constant}), {step.side === 'both' ? 'beide Seiten' : step.side === 'left' ? 'nur links' : 'nur rechts'}
  </li>)}</ol>;
}

function ActivityForm({ exercise, answer, update, disabled, fields, restart }: FormProps & { exercise: SceneExercise; restart: number }) {
  const balance = exercise.expectedAnswer?.model === 'balance';
  const learningRate = exercise.expectedAnswer?.kind === 'pick-learning-rate';
  const tagging = exercise.expectedAnswer?.kind === 'tag-after-line';
  if (tagging) return <TagForm key={restart} exercise={exercise} answer={answer} disabled={disabled} update={update} fields={fields} />;
  if (learningRate) return <LearningRateForm key={restart} exercise={exercise} answer={answer} disabled={disabled} update={update} fields={fields} />;
  if (balance) return <BalanceForm key={restart} exercise={exercise} answer={answer} disabled={disabled} update={update} fields={fields} />;
  return <MixerForm key={restart} answer={answer} disabled={disabled} update={update} fields={fields} />;
}

function taskSpec(exercise: SceneExercise, answer: SceneAnswer, preview: SceneFeedback, balance: boolean, learningRate: boolean): FigureSpec {
  if (learningRate) {
    const losses = (preview.simulation as { steps?: { loss: number }[] } | null)?.steps?.map((step) => step.loss) ?? [0, 0];
    return { schemaVersion: 1, kind: 'task', engine: 'argmin-figure', scene: 'learning-rate-run',
      title: 'Verlustverlauf des Trainings', caption: 'Prüfe den vollständigen Lauf für die gewählte Lernrate.', hint: 'Vergleiche Verlust und Endabstand.',
      params: { losses }, beats: [{ id: 'state', caption: 'Jeder Punkt zeigt den nach einem Update neu berechneten Verlust.' }] };
  }
  const tagTask = exercise.parameters.tagTask as TagTask | undefined;
  if (tagTask) return { schemaVersion: 1, kind: 'task', engine: 'argmin-figure', scene: 'python-trace-tag',
    title: 'Programmzustände zuordnen', caption: 'Ordne Bindungen den sichtbaren Zeilenzuständen zu.', hint: 'Namen und Objekte werden unabhängig ausgewählt.',
    params: { tagTask }, beats: [{ id: 'state', caption: 'Die Szene zeigt ausschließlich die quelltextbasierten Programmzeilen.' }] };
  return {
    schemaVersion: 1, kind: 'task', engine: 'argmin-figure', scene: balance ? 'balance-solve' : 'mix-to-target',
    title: balance ? 'Deine Waage' : 'Deine Linearkombination', caption: balance ? equationText(answer.form.equation) : 'Die Szene zeigt deine eingegebenen Portionen.', hint: 'Prüfe den Formularzustand.',
    params: { parameters: exercise.parameters, answer, simulation: preview.simulation, fields: preview.fields },
    beats: [{ id: 'state', caption: balance ? 'Jeder gültige Schritt verändert beide Seiten. Der letzte gültige Zustand bleibt bei Fehlern stehen.' : 'Der Differenzpfeil verbindet deine Summe mit dem Ziel.' }],
  };
}

export default function SceneBuildControls({ exercise, answer, feedback, disabled, onAnswer }: Props) {
  const [saveError, setSaveError] = useState(false);
  const [restart, setRestart] = useState(0);
  const preview = useMemo(() => gradeSceneBuild(exercise, answer), [exercise, answer]);
  const fields = feedback?.fields ?? (preview.errorType === 'non-equivalent-step' ? preview.fields : []);
  const update = (next: SceneAnswer) => {
    onAnswer(next);
    void saveSceneDraft(exercise, next).then(() => setSaveError(false), () => setSaveError(true));
  };
  const spec = useMemo(() => taskSpec(exercise, answer, preview,
    exercise.expectedAnswer?.model === 'balance', exercise.expectedAnswer?.kind === 'pick-learning-rate'),
  [exercise, answer, preview]);
  return <div class="scene-build-control">
    <FigureBlock spec={spec} figureIndex={0}
      onRestart={() => { if (!disabled) { update(initialSceneAnswer(exercise)); setRestart((n) => n + 1); } }}
      stepContent={<>
        <ActivityForm exercise={exercise} answer={answer} disabled={disabled} update={update} fields={fields} restart={restart} />
        {saveError ? <p role="alert">Der Entwurf konnte nicht lokal gespeichert werden.</p> : null}
      </>} />
  </div>;
}
