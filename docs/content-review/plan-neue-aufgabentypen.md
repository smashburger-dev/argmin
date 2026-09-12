# Plan: Neue Aufgabentypen

> **Status (2026, nach v0.6): UMGESETZT.** `multiple-choice`, `diagnostic-rationale`
> und `worked-example-fading` sind implementiert und platziert — allerdings mit
> abweichenden Verträgen: `correctIds` statt `correctIndices`, `kind: 'choice-indices'`/
> `'diagnosis'`/`'gaps'`, alles über den `deterministic`-Dispatch (keine separaten
> Grader-IDs). Dieser Text bleibt als Planungsartefakt; verbindlich sind
> `docs/authoring-guide.md` §4 und `tests/activity_types.test.mjs`.

Planungsdokument für die German KI-Lernplattform v0.7+. Keine Implementierung in v0.6.

## Status quo

`schemas/exercise-family.schema.json:72-75` erlaubt genau neun `activityType`s:

1. `numeric`
2. `single-choice`
3. `vector`
4. `algebraic-expression`
5. `python-code`
6. `short-rationale`
7. `parsons`
8. `code-trace`
9. `predict-output`

`multiple-choice` mit mehreren richtigen Antworten ist nicht vorgesehen. Außerdem gibt es keinen Typ für `worked-example-fading` oder `diagnostic-rationale`.

## Bedarf

- **Parson-Probleme**: Der Bedarf nach Code-Sequenzierung ist durch `parsons` mit `expected.kind: ordered-lines` abgedeckt. Es fehlen aber UI-Feedback-Regeln und Erklärungen zur Parson-Metrik (E1 G-14).
- **Mehrere richtige Konzepte**: Derzeit lässt sich ein Mehrfachkonzept-Test nur über `single-choice` abbilden, wenn der Future-Grader Mehrfachselektion versteht (z. B. `expected.kind: choices` plus `correctIndices`). Der Aktivitätstyp muss dafür erweitert werden.
- **Predict-then-verify**: Visualisierungen und Demos können über `predict-output` oder `short-rationale` an einen Block gehängt werden (z. B. "Welche Steigung erwarten Sie?"). Derzeit gibt es aber keinen eigenen `visualization-predict`-Block-Typ.
- **Completion / Fading**: Worked Examples haben keinen mechanismischen Typ, um ausgegraute Lücken in `cases` zu definieren (R1, R3).
- **Diagnose-Feedback**: Fehlerdiagnose bei Code-Traces braucht oft einen begründeten Distraktor statt einer reinen Zahl/Antwort (R4).

## Vorgeschlagene neue Typen

### 1. `multiple-choice`

**Purpose**
Mehrere richtige Optionen auswählen; nützlich für `c-ml-linear`, `c-linalg-independence`, `c-error-journal` und `c-research-responsible-ai`, wo Lernende mehrere gültige Aussagen identifizieren müssen.

**Schema / exercise-family changes**
- `schemas/exercise-family.schema.json:72-75`: `multiple-choice` zur `activityType`-Enum hinzufügen.
- `schemas/exercise-family-cases.schema.json`: `expected.kind: 'choice-indices'` mit `correctIndices: [integer]` und `minCorrectCount`/`maxCorrectCount` ergänzen.
- `hint`-Strategie: "Wählen Sie mindestens 2 Optionen aus." und distraktorbasierte `feedbackRules` pro Partial-Score.

**graderId and grader changes**
- Neuer Grader `multichoice-exact` in `assets/js/core/graders.js` oder Erweiterung von `deterministic`.
- Input: `{ selected: number[] }`.
- Ausgabe: `correct: true/false/partial`, `score: 0..1`, `errorType: 'wrong-choice' | 'missing-choice' | 'extra-choice'`.
- Unterstützt `allOrNothing`, `per-correct` und `allow-partial`.

**UI changes**
- `ExerciseView.tsx`: `MultiChoiceWidget` mit Checkboxes statt Radio-Buttons.
- Bei `per-correct` visuell Partial-Score anzeigen; bei `allOrNothing` erst nach Submit Lösung revealen.

**Sample content**
```json
{
  "activityType": "multiple-choice",
  "graderId": "multichoice-exact",
  "cases": [{
    "caseId": "linalg-independent-set",
    "prompt": "Welche der folgenden Vektoren in R^2 sind linear unabhängig?",
    "options": ["[1,0] und [0,1]", "[1,0] und [2,0]", "[1,1] und [1,-1]", "[0,0] und [1,2]"],
    "expected": { "kind": "choice-indices", "correctIndices": [0,2] }
  }]
}
```

**Risks**
- Authoring-Komplexität steigt (korrekte Kombinationen mappen).
- `feedbackRules` müssen pro Teilmenge unterschiedliche `errorType`s liefern.

**Estimated effort**
M: Schema-Update, Grader, Widget, 2–3 Beispiel-Familien, Tests.

### 2. `worked-example-fading` (oder `completion` innerhalb von cases)

**Purpose**
Ein Worked Example wird schrittweise abgedeckt: Lernender muss nur den nächsten Transformationsschritt ausfüllen (R1, R3, E1 G-15).

**Schema / exercise-family changes**
- Neuer optionaler Blocktyp in `schemas/lesson.schema.json`: `worked-example-fading`.
- Neuer `activityType` `worked-example-fading` in `exercise-family.schema.json`.
- Case-Format `expected.kind: 'partial-expression'` mit `fadeIndices: [integer]` in der Prompt-Template, die vom Renderer durch Input-Felder ersetzt werden.

**graderId and grader changes**
- Neuer Grader `algebraic-fading` in `assets/js/core/graders.js` (baut auf `algebraic-expression` auf, aber erlaubt fehlende Teilschritte).
- Vergleich: `fadeAnswer[step]` gegen `referenceSolution[step]`.
- `errorType`: `wrong-term`, `missing-factor`, `wrong-sign`.

**UI changes**
- Neuer `WorkedExampleFadingBlock.tsx`: rendert die vollständige Lösung mit Lücken (Input im MathJax-String).
- Staging: alle Lücken auf einmal oder schrittweise freigeben.

**Sample content**
```json
{
  "caseId": "equation-fade-first-step",
  "prompt": "Löse: $2x + 5 = 11$.\\n\\n$2x + 5 \\fbox{?} 11$\\n$2x = \\fbox{?}$\\n$x = \\fbox{?}$",
  "expected": {
    "kind": "partial-expression",
    "steps": ["=", "6", "3"]
  }
}
```

**Risks**
- Prompt-Templates brauchen stabiles Parsing (MathJax + Input-Platzhalter).
- Case-Objekte werden größer; Referenzlösungen müssen mit Prompt synchron gehalten werden.

**Estimated effort**
L: Schema, Grader, UI-Widget, Authoring-Tooling, 5+ Beispiele.

### 3. `diagnostic-rationale`

**Purpose**
Lernender begründet, warum eine gegebene Antwort/Programmausgabe falsch ist, bevor er die Korrektur liefert (R2: retrieve before reveal, R4: typical errors).

**Schema / exercise-family changes**
- `activityType: 'diagnostic-rationale'` in `exercise-family.schema.json`.
- Case-Format: `expected.kind: 'diagnosis'`, `diagnosticCodes: [...]` in `assets/js/core/graders.js`/`content/explanations/...`.
- Erklärungskarten (`content/explanations/foundations/*.json`) erhalten `diagnosticCodes`, die dem Case zugeordnet werden.

**graderId and grader changes**
- Neuer Grader `diagnosis-match` (fuzzy: Keyword-Match oder `manual-rubric`).
- Für deterministische Diagnosen: `expected.diagnosisCode` plus Freitextprüfung (mindestens N Wörter und ein erwartetes Keyword).
- Verbindet sich mit `diagnosticCodes` in Explanation-Cards.

**UI changes**
- `DiagnosticRationaleWidget`: Textarea mit Hinweis, typischen Fehlerkategorien anzuwählen.
- Nach Submit: zugeordnete `content/explanations/...` rendern.

**Sample content**
```json
{
  "caseId": "off-by-one-diagnose",
  "prompt": "Ein Test erwartet für Zeile 2 die Nummer 3, der Code gibt 2 aus. Erkläre, welches Indexmodell vermutlich vergessen wurde, bevor du den Fix angibst.",
  "expected": {
    "kind": "diagnosis",
    "diagnosisCode": "off-by-one",
    "mustContain": ["nullbasiert", "Header", "Index"]
  }
}
```

**Risks**
- Manuelle Bewertung (`manual-rubric`) macht Mastery-Ehrlichkeit schwierig (R14).
- Freitext-Keyword-Matching kann Lernende überraschen; es braucht sorgfältige `typicalErrors` und `feedbackRules`.

**Estimated effort**
M/L: Schema, Grader, UI, Explanation-Mapping, 3–5 Pilotfamilien.

## Was in v0.6 nicht kommt

Für v0.6 sind nur inhaltliche Korrekturen (P0) und kleine Katalog-Polish (P2) vorgesehen. Neue Aufgabentypen, Grader-Widgets und UI-Blöcke werden nicht implementiert. Das Dokument dient ausschließlich der Planung und Priorisierung für v0.7+.

## Implementierungs-Reihenfolge

1. **`multiple-choice` zuerst**: Schema-Änderung ist minimal, der Grader ist eine deterministische Erweiterung und ML/Linalg haben sofortigen Bedarf. Geringstes UI-Risiko.
2. **`diagnostic-rationale` als zweites**: Setzt die `diagnosticCodes`-Taxonomie voraus (P2-Backlog). Passt gut zu R14-Feedback-Verbesserungen.
3. **`worked-example-fading` zuletzt**: Abhängig von Lesson-Block-Änderungen und größerem Authoring-Aufwand. Erst nachdem `multiple-choice` und `diagnostic-rationale` stabil laufen.
