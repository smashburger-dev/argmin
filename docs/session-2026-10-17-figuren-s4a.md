# Session S4a: Datenschicht für scene-build

Datum: 17.10.2026. Zweig: `feature/figuren-s4a`. Basis: `feature/figuren` bei `51cbc90b`.
Worktree: `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s4a`. Browser-Port: 4403.
Implementierungscommit: `e397120` (`figuren(s4a): Antwortformat und Eigenschaftsgrader ergänzen`).

Der zuletzt genannte S2-Worktree stand auf `feature/figuren-s2` und enthielt eine fremde ADR-Änderung. S4a wurde deshalb wie beauftragt separat von `feature/figuren` angelegt. `npm ci` wurde ausgeführt. Kein Push, kein Merge.

## Ergebnis

`scene-build` hat ein versioniertes, JSON-fähiges Antwortobjekt. Der Event-Builder erstellt einen unabhängigen Snapshot; Normalisierung und JSON-Import erhalten Formularzustand und Reihenfolge der Schritte. Beschädigte Antwortobjekte werden vor der Importtransaktion abgewiesen. Die IndexedDB-Version und die Exportversion bleiben 3. Stores, Indizes und bestehende Migrationspfade wurden nicht geändert.

Der deterministische Grader akzeptiert `expectedAnswer: { kind: 'scene-properties', model: 'mixer' | 'balance' }`. Er berechnet Eigenschaften aus `parameters`, ohne einen Musterpfad zu vergleichen. `assertFamilyActivityContracts` prüft diesen Vertrag einschließlich Varianten und geerbtem Grader. Nur `deterministic` ist für diesen Typ zulässig.

Neue Kernmodule:

- `assets/js/domain/scene_answer.mjs`: Antwortvalidierung und Snapshot.
- `assets/js/core/scene_build_grader.mjs`: deterministischer Dispatch, Mixer und Waage, Ergebnisse pro Prüfstelle.
- `assets/js/core/balance_model.mjs`: reines Modell linearer Gleichungen mit exakten rationalen Zahlen.

## Antwortformat v1

Dieses Objekt liegt unverändert im Feld `answer` eines Attempts. `schemaVersion` hier bezeichnet die Antwortversion, nicht die Datenbankversion. Ein vollständiger Export verwendet weiterhin `schemaVersion: 3`.

Beispiel für die Aufgabe `2x + 3 = 7`:

```json
{
  "kind": "scene-build",
  "schemaVersion": 1,
  "form": {
    "equation": {
      "left": { "x": "1", "constant": "0" },
      "right": { "x": "0", "constant": "2" }
    }
  },
  "steps": [
    {
      "operation": "subtract",
      "side": "both",
      "term": { "x": 0, "constant": 3 }
    },
    {
      "operation": "divide",
      "side": "both",
      "term": { "x": 0, "constant": 2 }
    }
  ]
}
```

Die vier Hüllfelder sind verpflichtend; zusätzliche Hüllfelder und unbekannte Versionen werden abgewiesen. `form` ist ein Objekt, `steps` eine geordnete Liste von Objekten. Erlaubt sind JSON-Werte mit endlichen Zahlen. Grenzen: 128 Schritte bzw. Arrayeinträge, 64 Felder je Objekt, 4096 Zeichen je String und Verschachtelungstiefe 8. Funktionen, Zyklen, nicht endliche Zahlen, Sparse Arrays und besondere Objektprototypen passieren die Validierung nicht. Nullantworten sind bei den Assistenzereignissen `hint-used`, `partial-solution` und `solution-revealed` erlaubt.

Der Attempt trägt über `familyEventInput` zusätzlich `activityType: 'scene-build'`. Dadurch wird auch ein beschädigtes oder entferntes Antwort-Tag beim Import erkannt. Bestehende Antwortformen anderer Typen werden unverändert behandelt.

### Mixer

Parameter: `{ a1: [2, 1], a2: [1, 2], target: [5, 4] }`.
Antwort:

```json
{
  "kind": "scene-build",
  "schemaVersion": 1,
  "form": { "solutionSet": "unique", "portions": [2, 1] },
  "steps": []
}
```

`solutionSet` ist `unique`, `infinite` oder `none`. Bei `none` entfällt `portions`. Ansonsten sind zwei endliche Zahlen erforderlich. Portionen sind algebraische Koeffizienten und dürfen negativ oder gebrochen sein. Parameter sind ganzzahlige Zweiervektoren im Bereich ±1.000.000. Der Mixer verwendet nur den Endzustand; eine nicht leere Schrittfolge wird abgewiesen.

`solveMixer` bestimmt den Lösungsfall aus den Parametern. Für die eigentliche Zielprüfung wird `evaluate` aus `assets/js/figures/scenes/smoothie.mjs` aufgerufen. Die Simulation wird nicht nachgebaut. Bei unendlich vielen Lösungen zählt jedes gültige Koeffizientenpaar, bei unerreichbarem Ziel nur die richtige Deklaration `none`. Die Treffertoleranz 1e-9 stammt aus `evaluate`.

Rückgabe: `{ correct, errorType, verdictText, fields, simulation }`. Jede Prüfstelle enthält `{ path, correct, message }`. Beim Mixer liefert `simulation` `{ hit, mix, diff }`; falsche Zielkoordinaten markieren das Formularfeld `form.portions`.

### Waage

Parameter und Formular-Endzustand bestehen aus `left` und `right`, jeweils mit `x` und `constant`, also `ax + b = cx + d`. Zahlen sind sichere Ganzzahlen oder Strings wie `"-3/2"`; die allgemeinen Stringgrenzen der Antwort gelten für Formulareingaben. Nenner sind positiv und ungleich 0. Intern rechnet das Modell mit gekürzten BigInt-Brüchen. Zwischenkoeffizienten dürfen den sicheren Number-Bereich überschreiten; ein Test skaliert zweimal mit einer 18-stelligen Zahl und wieder zurück. Öffentliche Modellzustände enthalten nur JSON-Strings.

Operationen: `add`, `subtract`, `multiply`, `divide`. `term` ist ebenfalls `{ x, constant }`. Addition und Subtraktion erlauben lineare Terme; Multiplikation und Division nur eine konstante Zahl ungleich 0. `side` muss `both` sein. Nach jedem Schritt wird die exakte Lösungsmenge erneut geprüft. Nicht zulässige Schritte stoppen am ersten Fehler. Der Endzustand muss mit `form.equation` übereinstimmen und x auf einer der beiden Seiten allein zeigen. Ein richtiger Endwert ohne die dazugehörigen gültigen Schritte reicht nicht.

Die Waagenaufgabe verlangt eine eindeutige Ausgangslösung. `solveBalance` kann auch die Lösungsfälle `none` und `infinite` bestimmen; diese werden als Aufgabenvertrag für das Freistellen abgewiesen. `simulation.state` enthält den letzten gültigen Gleichungszustand. Es gibt keine Pfadvorgabe: erst halbieren und dann 3/2 abziehen zählt ebenso wie erst 3 abziehen und dann halbieren. x darf am Ende rechts stehen.

## Mastery, Review, Titel und Coverage

| Bereich | Vertrag und Nachweis |
|---|---|
| Mastery | Korrekte deterministische Lösung, `masteryEligible: true`, höchstens ein Hinweis, keine Offenlegung; falsche Antworten und ausgeschlossene Fälle zählen nicht. Tests nutzen die bestehende Mastery-Auswertung. |
| Offenlegung | Sperrt dieselbe Instanz. Ein neuer Seed kann wieder qualifizierte Evidenz liefern. |
| Review | `freshRouteForDefinition` behält Familie, Fall und Profil bei und setzt den Seed auf `-`. Testreferenzfamilien erzeugen über `familySubseed` neue Parameter und bestehen auch für Rand-Seeds. |
| Label | `activityTypeLabels['scene-build']` ist `Szene konstruieren`. |
| Titel | Der reine Typname wird als Titel abgewiesen. Konkrete deutsche Titel wie `Mixer auf Ziel einstellen` folgen den vorhandenen Regeln. |
| Coverage | `coverageForBundle` verwendet dieselbe Berechnung wie `coverage:build`. Testplatzierungen beider Referenzfamilien zählen jeweils als eine platzierte Aufgabe und eine geseedete Familie für ihre Kompetenz. |
| Golden-Korpus | `tests/fixtures/scene-build-golden-corpus.json` pinnt Parameter, Antwort, Löserergebnis und Simulation für eindeutigen Mixer, unendlich viele Mischungen, unerreichbares Ziel und Waage. Der bisherige Familien-Golden-Korpus bleibt unverändert und besteht. |

Die Referenzfamilien werden ausschließlich im Test registriert. S4a schaltet keine Aufgabe ohne Renderer öffentlich frei. Deshalb bleibt `content/competency-family-coverage.json` unverändert; die aktuelle öffentliche Coverage ist weiterhin gültig. Die tatsächlichen Familienregistrierungen und Platzierungen gehören zur S4b-UI.

## Verifikation

| Prüfung | Ergebnis |
|---|---|
| `node --test tests/` | 2240 bestanden, 0 fehlgeschlagen |
| `npm run test:project-runner` | bestanden |
| `node tools/compile_content.mjs` | bestanden |
| `node tools/validate_content.mjs` | bestanden |
| `npm run coverage:check` | bestanden, bestehende Matrix aktuell |
| `npm run typecheck` | bestanden |
| `node tools/build_public.mjs` | bestanden |
| `node tools/validate_content.mjs --dir build-next` | bestanden |
| `npm run build:release` | bestanden, ebenfalls Teil von `test:e2e:build` |
| `E2E_PORT=4403 npm run test:e2e -- --project=chromium --workers=4` | 96 bestanden, 26 durch die bestehende Suite übersprungen |
| `E2E_PORT=4403 npm run test:e2e:build -- --workers=4` | 95 bestanden, 27 durch die bestehende Suite übersprungen |
| Import-Roundtrip | Node-Test und echter Chromium-/IndexedDB-Test, Dev und Release, bestanden |
| `git diff --check` | bestanden |
| Neue/geänderte Funktionen, Komplexität ≤10 | bestanden |

Der vollständige `bun lint -f agent --rule 'complexity: [error, 10]'`-Lauf über die betroffenen Dateien ist nicht global grün: 21 Komplexitätsmeldungen und 5 Meldungen zu asynchronen Promise-Executors verbleiben im unveränderten Bestand. Die betroffenen 21 Funktions- bzw. Klassenblöcke wurden programmatisch mit `51cbc90b` verglichen und sind bytegleich. Neue Dateien und die tatsächlich geänderten Funktionen haben keine Lint-Fehler. Der Bestand wurde nicht nebenbei refaktoriert.

Der erste Release-E2E-Lauf fand eine reale Abhängigkeit: Der neue Grader lädt die originale Smoothie-Auswertung auch über die ungebündelte Registry. Die explizite Public-Allowlist enthält deshalb zusätzlich `smoothie.mjs` und dessen drei Abhängigkeiten `camera.mjs`, `motion.mjs`, `solids.mjs`. Der erneute vollständige Release-Lauf besteht. Keine Wildcard-Freigabe und keine direkte Bearbeitung des Release-Baums.

Es gibt keine neuen Figuren oder visuellen Änderungen. Ein neuer Kontaktbogen, neue Bildreferenzen und eine Bewegungsmessung entfallen für diese Datenschicht. Keine Datei unter `assets/js/figures/` oder `src/figures/` wurde geändert.

## Übergabe an S4b und Integrator

1. Formularwerte vor dem Grading in die oben dokumentierte Hülle übernehmen. Die Szene stellt `form` und die Modellzustände dar; Kamera- und Pointerzustände gehören nicht in die Antwort.
2. Mixer und Waage über den vorhandenen deterministischen Registry-Pfad mit `activityType: 'scene-build'` und `expected: { kind: 'scene-properties', model: ... }` registrieren. Die Testreferenzfamilien zeigen Seed- und Solver-Anbindung.
3. Fehlerstellen aus `fields` und Zustände aus `simulation` für Differenzpfeil bzw. Waagenfeedback verwenden. Die fachliche Prüfung bleibt im Kernmodell.
4. Den Attempt wie andere Familienaufgaben über `familyEventInput` und den Learning Ledger schreiben. Den tatsächlichen Grader-Ausgang und die fallbezogene Mastery-Berechtigung übernehmen.
5. Erst mit der Formular-/Szenen-UI öffentliche Platzierungen ergänzen, reale Familien in den bestehenden Familien-Golden-Korpus aufnehmen und die Coverage-Matrix regenerieren.

Keine Anfrage an S2 erforderlich. Figurencode, `ExerciseFrame`, Compiler-Figurenteil und Registry-Zeilen für Szenen blieben unangetastet.
