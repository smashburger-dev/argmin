# Challenge-Autoring-Rubrik

Stand: 2026-09-13. Ergänzt `docs/authoring-guide.md` um die verbindlichen
Regeln für Fälle im Schwierigkeitsprofil `challenge`. Gilt für statische
Familienfälle in `content/families/*.json` und für prozedurale
Falldefinitionen in `assets/js/core/procedural/*.mjs` (plus den übrigen
JS-first-Familien). Ist ein Fall challenge-tauglich, trägt der JSON-
Fallkörper `challengeEligible: true`; der Compiler prüft die
Pflichtbedingungen (`E_CHALLENGE_CONTRACT` in `tools/compile_content.mjs`).

## 1. Was eine Challenge ist

Eine Challenge verlangt **mindestens zwei getrennte Reasoning-Stufen mit
echten Zwischenergebnissen**: Das Zwischenergebnis der ersten Stufe ist
Voraussetzung der zweiten, und wer nur die erste Stufe schafft, hat ein
verteidigbares, aber unvollständiges Teilergebnis. Beispiele für echte
Stufenpaare:

- Ungleichung mit Parameter: Fallunterscheidung über den Koeffizienten
  (Stufe 1) → Lösungsmenge je Fall zusammensetzen (Stufe 2).
- Forward-Contract: Shape- und Werte-Guards bauen (Stufe 1) → die
  Forward-Rechnung contract-konform verdrahten (Stufe 2).
- Retrieval-Evaluation: Ranking-Funktion korrekt implementieren
  (Stufe 1) → Metrik über einer Menge von Anfragen aggregieren und
  begründete Grenzfälle abdecken (Stufe 2).

**Länge entsteht durch mehr Teilschritte, nicht durch größere Zahlen.**
Ein Vier-Terme-Vereinfachen mit Koeffizienten bis 12 ist keine Challenge,
sondern ein längerer Core-Fall — die Tier-Eskalation in
`transform-expression-simplify-canonical/combine-like-terms` ist das
Referenz-Gegenbeispiel (Audit: NOT-SUITABLE). Umgekehrt darf eine
Challenge kurz sein, wenn die Stufen echt getrennt sind.

Challenge heißt nicht „unlösbar ohne Hilfe": Die Mastery-Policy erlaubt
höchstens einen Hinweis für den Nachweis — die Aufgabe muss also mit
EINEM Strategiehinweis lösbar bleiben.

## 2. Der Vertrag

Ein Fall ist challenge-fähig, wenn ALLE Zeilen erfüllt sind; der Autor
setzt danach `challengeEligible: true` am Fallkörper.

| Bedingung | Regel | Wo geprüft |
|---|---|---|
| `difficultyProfile` | `challenge` | Schema + `E_CHALLENGE_CONTRACT` |
| `masteryEligible` | `true` | `E_CHALLENGE_CONTRACT`; Grader-Ausgänge mit `masteryEligible: false` (z. B. `manual-rubric`, `diagnostic-rationale`) sind nie challenge-fähig |
| `hints` | ≥ 2 autorisierte Hinweise, gestaffelt (§3) | `E_CHALLENGE_CONTRACT` |
| `fullSolution` | ≥ 2 Blöcke: erkennbare, leerzeilengetrennte Lösungsabschnitte (Text und/oder Code), die den Reasoning-Stufen entsprechen — kein Zeichen-Minimum, kein Monoblock | `E_CHALLENGE_CONTRACT` erzwingt den Floor „≥ 2 Absätze ODER ≥ 80 Zeichen"; die Rubrik verlangt die Stufen-Struktur |
| `sourceLineage` | nicht leer, Konvention §5 | `E_CHALLENGE_CONTRACT` |
| `competencyIds` | ≥ 2 effektive Kompetenzen (Fall oder Vertrag) — eine Challenge verbindet Kompetenzen statt eine zu wiederholen | `E_CHALLENGE_CONTRACT` (für Nicht-Code-Typen) |

Zusätzlich das **Struktur-Minimum je Aktivitätstyp**:

| activityType | Minimum |
|---|---|
| `python-code` | `expected.requiredFunctions` ≥ 2 ODER ≥ 8 `__check(`-Aufrufe im **generierten** Testblock (Basis + Seed-Ziehungen — nicht das JSON-Exemplar zählt, siehe Befund 2 im Audit) |
| `worked-example-fading` | `expected.gaps` ≥ 4 |
| `multiple-choice` | `expected.correctIds` ≥ 2 (ohnehin Schema-Pflicht) |
| `single-choice`, `numeric`, `algebraic-expression`, übrige | `competencyIds` ≥ 2 UND `hints` ≥ 2; bei Choice zusätzlich R14: ≥ 2 plausible Distraktoren auf Fehlkonzepte und `fullSolution`, die jede Option begründet |

Der Compiler erzwingt den Vertrag in `validateChallengeContracts`
(`tools/compile_content.mjs`) inklusive instantiate-Smoke-Check auf dem
challenge-Profil; bei `contract: null`-Docs (prozedurale Familien) wird
die **generierte** Instanz bemessen, nicht das JSON-Exemplar. Was der
Validator nicht prüft, bleibt Rubrik-Pflicht im Review: die
Stufen-Struktur der fullSolution (Absätze ≠ Stufen sind prüfbar,
Inhalt nicht), die Hint-Staffelung und die Reasoning-Tiefe aus §1.

## 3. Hint-Design

Zwei Pflicht-Hinweise, streng gestaffelt:

1. **Hinweis 1 = Strategie.** Benennt den Zerlegungspunkt oder die
   Teilziel-Frage („Trenne erst den Sonderfall, in dem der Koeffizient
   verschwindet"), nie eine Zahl, nie Code, nie die Antwortform.
2. **Hinweis 2 = Zwischenschritt.** Liefert EIN echtes Zwischenergebnis
   oder den konkreten nächsten Handgriff („Zähle nur die Pivotzeilen
   nach dem Tausch"), lässt den zweiten Reasoning-Schritt beim
   Lernenden.

Weitere Hinweise (3+) sind erlaubt und bleiben auf derselben Leiter:
Strategie → Zwischenschritt → Fehlervermeidung. **Kein Hinweis verrät
die Lösung** — die Mastery-Policy wertet „korrekt mit höchstens einem
Hinweis" als Nachweis; ein leaker Hint macht den Fall billig statt
schwer. Faustprobe: Wer nur Hinweis 1 liest, muss noch beide Stufen
selbst gehen; wer Hinweis 2 liest, muss noch die letzte Stufe gehen.

Laufzeit-Realität beachten (Befund 1 im Audit): `familyHint` liefert
Stufe 1 = `summary` des Familienvertrags und Stufe 2 = Aktivitäts- oder
`hints[0]`. Bis die Leiter durchgereicht wird, gehört der
entscheidende Zwischenschritt in `hints[0]` und die `summary` muss als
echter Strategie-Hinweis taugen — sie IST Hinweis 1 zur Laufzeit. Bei
`single-choice`/`numeric`/`parsons` verdeckt der Aktivitäts-Hinweis den
autorisierten: Choice-Fälle brauchen ihre Strategie in der `summary`.

## 4. Solver-Regel und Generator-Pflichten

- `expected` wird **nie** hartkodiert. Jeder Challenge-Fall hat einen
  Referenzsolver (`expected.referenceSolver`, `solve()` der Familie oder
  den `__want`-Kanon im Testblock wie bei `validate-goalshift-flag-rules`).
  Der Solver ist die Autorität; der Testcode prüft gegen ihn.
- **≥ 200 Seeds** Property-Test je Generator-Fall (`node --test tests/`),
  fehlgeschlagene Seeds werden als Regressions-Test fixiert — wie in
  `authoring-guide.md` §3, für Challenges nicht verhandelbar, weil der
  zweite Reasoning-Schritt genau dort bricht, wo der Parameter-Raum
  Grenzfälle erzeugt.
- **Invarianten als Docstring am Generator UND im Test erzwungen**:
  z. B. „Ungleichung hat im gezogenen Bereich beide Fälle real", „Matrix
  hat Rang < min(m,n) bei erkennbarer Zeilenabhängigkeit". Ohne
  Invarianten erzeugt der Seed stille Trivialfälle — eine Challenge, die
  bei manchen Seeds nur eine Stufe hat, betrügt das Label.
- Der dokumentierte Exemplar-Testblock muss dem generierten Block
  entsprechen; Drift zwischen JSON-Doku und Generator ist ein
  Review-Fehler (Fall `detect-goal-shift`: 7 dokumentierte vs. 2
  generierte `__check`).
- Ein `challengeEligible`-Fall mit `propertyTest: false` braucht ein
  kuratiertes Placement mit `difficulty: 'challenge'` — ohne Placement
  erreicht ihn nur die Direkt-Route.

## 5. sourceLineage-Konvention

`sourceLineage` ist eine Liste von Herkunfts-Token (`w01-e2`,
`c1-authored`, `f-*-…`, `generated`). Zwei Verhältnisse sind zu
unterscheiden:

- **„abgeleitet von"** (`w<NN>-e<N>`-Token): Der Fall setzt ein konkretes
  Bestandsproblem fort — gleiche Aufgabenskelett-Idee, neue Instanz oder
  härtere Stufe. Pflicht: die Quelle muss die Challenge-Struktur hergeben;
  ein Core-Fall mit größeren Zahlen bleibt abgeleitet, wird aber keine
  Challenge.
- **„inspiriert von"** (Konzept-Verweis in `sourceLineage` + eigene
  Aufgabe): Nur die Idee stammt aus der Quelle; Formulierung, Zahlen und
  Lösungsweg sind eigenständig (vgl. `authoring-guide.md` §2 — private
  Quelltexte werden nie übernommen).
- `c1-authored`/`generated` steht für ohne Vorlage neu autorisiert —
  bei Challenges die Regel, weil echte Zweistufigkeit selten aus
  Ein-Schritt-Vorlagen abgeleitet werden kann.

## 6. Drei exemplarische Case-Spezifikationen

Schriftliche Skizzen — die Implementierung folgt den Generator-Regeln aus
`authoring-guide.md` §3/§7. Sie zielen auf die dünn besetzte
Math/Linalg-Lane (Audit §4.2).

### 6.1 Algebra-Archetyp: Ungleichung mit Parameter (Fallunterscheidung)

- **Prompt-Gerüst**: „Bestimme alle `x`, für die `a·x + b < c·x + d`
  gilt, in Abhängigkeit von `a, c ∈ ℤ`. Gib die Lösungsmenge
  fallweise an."
- **Parameter-Raum**: `a, c ∈ [−6, 6]`, `b, d ∈ [−9, 9]`, Seed zieht
  `k = a − c` aus {negativ, null, positiv} — alle drei Regime müssen im
  200-Seed-Lauf vorkommen (Invariante im Test gezählt).
- **Invarianten**: bei `k = 0` ist die Entscheidung ein reiner
  Konstantenvergleich (Lösung `ℝ` oder `∅`); bei `k ≠ 0` echte
  Intervallantwort mit korrekter Richtungsumkehr bei `k < 0`; der
  Trennwert `(d − b)/k` bleibt ein kurzer Bruch (Nenner |k| ≤ 12).
- **Solver-Logik**: `solveParamIneq(a, b, c, d)` bildet `k`, `m = d − b`,
  verzweigt nach Vorzeichen von `k`, liefert `{fall, intervall}` —
  `expected` ist `{kind: 'set-description'}`-artig und wird nur aus dem
  Solver gespeist.
- **Hints**: H1 „Der Koeffizient vor `x` nach dem Zusammenfassen
  entscheidet, wie viele Fälle es gibt." H2 „Für `k < 0` dreht das
  Ungleichheitszeichen beim Teilen um — prüfe `k = 0` gesondert."
- **Warum ≥ 2 Stufen**: Stufe 1 erkennt die Fallstruktur (`k`-Vorzeichen),
  Stufe 2 setzt die Lösungsmenge je Fall zusammen inkl. Richtungsumkehr —
  das `k = 0`-Ergebnis ist ein echtes Zwischenergebnis, das ohne Stufe 1
  nicht formulierbar ist.

### 6.2 Kombinatorik-Archetyp: Zählproblem mit n

- **Prompt-Gerüst**: „Auf wie viele Arten lassen sich `k` unterscheidbare
  Token auf `n` Slots verteilen, wenn Slot `s` mindestens ein Token
  tragen muss und die Reihenfolge in den Slots nicht zählt? Gib den
  Term in `n, k` an und werte ihn für die gezogene Instanz aus."
- **Parameter-Raum**: `n ∈ [3, 7]`, `k ∈ [n, n + 4]`, Sonderslot
  `s ∈ [0, n − 1]` symmetrisch (nur Benennung); Optional-Flag, ob
  Wiederholung erlaubt ist, als zweiter gedrehter Parameter.
- **Invarianten**: `k ≥ n` (sonst leere Bedingung — Generator verwirft);
  Ergebnis ganzzahlig < 10⁶ (kopfrechenbarer Zahlbereich bleibt im
  Auswerteteil); der allgemeine Term ist ein Binomial- oder
  Differenzenausdruck, den der Referenzsolver in beiden Formen als
  äquivalent akzeptiert (Probe-Äquivalenzgrader).
- **Solver-Logik**: `solveConstrainedCount(n, k, s)` berechnet den
  geschlossenen Wert über die kanonische Zerlegung (Pflicht-Slot
  besetzen → Rest verteilen) UND via Brute-Force-Zählung für
  `n ≤ 5` als Kreuzprobe im Test.
- **Hints**: H1 „Teile das Problem: erst die Pflichtbelegung des Slots,
  dann die freie Verteilung des Rests." H2 „Nach der Pflichtbelegung
  zählst du `k − 1` Token auf `n` Slots ohne Nebenbedingung."
- **Warum ≥ 2 Stufen**: Stufe 1 isoliert die Nebenbedingung zu einer
  reduzierten Zählaufgabe (Zwischenergebnis: das Rest-Problem), Stufe 2
  wendet die Standardformel an und wertet aus. Wer Stufe 1 überspringt,
  zählt systematisch falsch — der Distraktorraum ist bekannt
  (`binomial(n+k-1, k)` ohne Abzug).

### 6.3 Linalg-Archetyp: Dimensions-/Rangfrage mit Parametern

- **Prompt-Gerüst**: „`A ∈ ℝ^{m×n}` hat Rang `r`. Bestimme
  `dim ker A` und `dim im A` und entscheide, ob `Ax = b` für jedes `b`
  lösbar ist — in Abhängigkeit davon, ob `r = m`, `r = n` oder `r <
  min(m, n)` gilt."
- **Parameter-Raum**: `m, n ∈ [2, 5]`, `r ∈ [1, min(m, n)]`; der Seed
  zieht das Regime (`r = m < n`, `r = n < m`, `r = m = n`, `r < min`)
  mit erzwungener Mindestabdeckung aller vier Regime im Property-Test.
- **Invarianten**: Dimensions-Satz `dim ker + dim im = n` gilt in jeder
  Instanz (Test-Invariante, nicht nur Beispiel); die Lösbarkeitsfrage
  kippt genau bei `r = m` — Instanzen mit `r = m` UND `r = n` sind als
  getrennte Regime gezogen, weil sie verschiedene Antworten erzwingen.
- **Solver-Logik**: `solveRankDims(m, n, r)` liefert
  `{nullity, rank, alwaysSolvable}` aus dem Dimensions-Satz;
  `expected` wird nur daraus gebaut; der Test prüft zusätzlich gegen
  eine konkret konstruierte Matrix des Regimes (Rank-Rechnung als
  Kreuzprobe).
- **Hints**: H1 „Der Dimensions-Satz koppelt Kern und Bild an `n` —
  bestimme erst beide Dimensionen, bevor du über Lösbarkeit
  entscheidest." H2 „Lösbarkeit für jedes `b` heißt: die Spalten
  spannen den ganzen Zielraum auf — vergleiche `r` mit `m`, nicht mit
  `n`."
- **Warum ≥ 2 Stufen**: Stufe 1 wendet den Dimensions-Satz an
  (Zwischenergebnis: das Paar `(dim ker, dim im)`), Stufe 2 übersetzt
  Rang in Surjektivität — eine eigene Schlussweise, die am
  Zwischenergebnis hängt, nicht an den Zahlen.

## 7. Anti-Patterns

- **Single-Choice mit Mehrfachkonzept-Behauptung**: Der Prompt stapelt
  Konzepte („Vertrag + Rang + Solve"), der Grader wertet eine Auswahl.
  Zulässig nur mit R14-Struktur (Fehlkonzept-Distraktoren, FS begründet
  jede Option); sonst bleibt es ein Konzept-Fall, keine Challenge.
- **Challenge-Label auf „größere Zahlen"**: Dieselbe Reasoning-Stufe
  mit mehr Termen/größeren Koeffizienten (Referenz:
  `combine-like-terms`, Tier-Eskalation `vars 2→4, coef 5→12`). Mehr
  Rechenaufwand ≠ mehr Reasoning. Solche Fälle gehören auf `stretch`.
- **Hints, die die Lösung leaken**: Ein Hinweis mit dem Zwischen- oder
  Endergebnis („also ist `k = 0` der Fall `ℝ`") macht die Challenge zur
  Lektüre — die Mastery-Policy (≤ 1 Hinweis) wird damit zur Gratis-
  Mastery. Hints staffeln, nie verkünden.
- **Harte Längen statt Struktur**: Mindestzeichen für `fullSolution`,
  Mindestwörter im Prompt oder „viele" `__check` ohne Bezug zu den
  Reasoning-Stufen messen Aufwand, nicht Tiefe. Alle Minima dieser
  Rubrik zählen **Struktur** (Blöcke, gestaffelte Hints, Checks gegen
  den Referenzsolver), nie Volumen.
- **Seed-Trivialfälle**: Parameter-Räume, in denen die zweite Stufe
  manchmal wegfällt (z. B. `k` nie null gezogen), ohne Invarianten-Test.
  Der Property-Test muss die Regime-Abdeckung erzwingen.
