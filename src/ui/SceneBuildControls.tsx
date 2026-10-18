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

function taskSpec(exercise: SceneExercise, answer: SceneAnswer, preview: SceneFeedback, balance: boolean): FigureSpec {
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
  const balance = exercise.expectedAnswer?.model === 'balance';
  const fields = feedback?.fields ?? (preview.errorType === 'non-equivalent-step' ? preview.fields : []);
  const update = (next: SceneAnswer) => {
    onAnswer(next);
    void saveSceneDraft(exercise, next).then(() => setSaveError(false), () => setSaveError(true));
  };
  const spec = useMemo(() => taskSpec(exercise, answer, preview, balance), [exercise, answer, preview, balance]);
  return <div class="scene-build-control">
    <FigureBlock spec={spec} figureIndex={0}
      onRestart={() => { if (!disabled) { update(initialSceneAnswer(exercise)); setRestart((n) => n + 1); } }}
      stepContent={<>
        {balance ? <BalanceForm key={restart} exercise={exercise} answer={answer} disabled={disabled} update={update} fields={fields} />
          : <MixerForm key={restart} answer={answer} disabled={disabled} update={update} fields={fields} />}
        {saveError ? <p role="alert">Der Entwurf konnte nicht lokal gespeichert werden.</p> : null}
      </>} />
  </div>;
}
