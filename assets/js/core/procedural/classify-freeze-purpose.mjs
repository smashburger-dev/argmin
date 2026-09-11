// Procedural family classify-freeze-purpose: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// The bank keeps the curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// scenarios on why a hash freeze exists: comparability of runs, loud failure
// on silent goal shifts, and the explicit non-purposes (speed, copyright,
// secrecy). parameters carry only the scenario key, so nothing
// answer-relevant leaks into instance.parameters. Mirrors
// genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

export const FREEZE_PURPOSE_CAPSULES = {
  'freeze-purpose': {
    difficulty: 'intro',
    bank: [
      {
        key: 'base',
        prompt: 'Warum wird das Golden Set einer Capstone-Pipeline per Hash eingefroren, bevor Optimierung beginnt?',
        correct: 'Damit nach jeder Optimierung dieselbe Prüfung greift: Alte und neue Läufe bleiben vergleichbar, und eine still geänderte Prüfmenge fällt per Hash-Abgleich auf.',
        wrong: [
          'Um Laufzeit zu sparen — der Hash-Abgleich beschleunigt die Auswertung des Golden Sets deutlich.',
          'Aus Urheberrecht: Die Fragen im Golden Set dürfen nur in unveränderter Form gespeichert werden.',
          'Damit niemand die Testfragen lesen und auswendig lernen kann.',
        ],
        solution: 'Der Hash hält die Prüfmenge stabil: Nach jeder Optimierung greift exakt dieselbe Evaluation, und Werte bleiben über Zeit vergleichbar. Wird das Golden Set trotzdem geändert, scheitert die Freeze-Prüfung sichtbar — so wird aus einer stillen Zielverschiebung eine dokumentierte Entscheidung. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.',
      },
      {
        key: 'zielverschiebung',
        prompt: 'Ein Team passt nach einer Optimierung still das Golden Set an die neue Pipeline an. Was macht der Hash-Freeze aus dieser Aktion?',
        correct: 'Eine sichtbare Entscheidung — der Hash-Abgleich schlägt an, statt die Zielverschiebung still geschehen zu lassen.',
        wrong: [
          'Er verhindert die Änderung technisch — die Datei ist gesperrt.',
          'Er ignoriert sie, solange die Messwerte besser werden.',
          'Er löscht das veränderte Set automatisch.',
        ],
        solution: 'Der Hash verhindert nichts — er macht sichtbar. Wer das Set ändert, bricht die Freeze-Prüfung und muss die Änderung als Entscheidung dokumentieren: neue Version, neues Manifest. Genau das unterscheidet Absicht von stiller Zielverschiebung.',
      },
      {
        key: 'hash-beweis',
        prompt: 'Was beweist ein sha256-Hash über dem Golden Set — und was nicht?',
        correct: 'Er beweist die Identität des Inhalts — nicht dessen Qualität oder Vollständigkeit.',
        wrong: [
          'Er beweist, dass das Set gute und relevante Fragen enthält.',
          'Er beweist die Vollständigkeit der Themenabdeckung.',
          'Er beweist, dass niemand das Set gelesen hat.',
        ],
        solution: 'Ein Hash ist ein Fingerabdruck: Gleicher Inhalt ergibt gleichen Hash, anderer Inhalt fällt auf. Über Güte, Abdeckung oder Geheimhaltung sagt er nichts — dafür braucht es Review und Evaluationsdesign.',
      },
      {
        key: 'aenderung-erlaubt',
        prompt: 'Darf das Golden Set nach dem Freeze noch geändert werden?',
        correct: 'Ja — aber der Hash-Abgleich schlägt an; die Änderung braucht eine neue Version und ein neues Manifest.',
        wrong: [
          'Nein — der Hash sperrt die Datei technisch.',
          'Ja — und alte Messwerte bleiben trotzdem vergleichbar.',
          'Nein — jede Änderung ist nach dem Freeze verboten.',
        ],
        solution: 'Der Freeze ist ein Vertrag, kein Schloss: Änderungen sind erlaubt, aber nie still. Neue Version plus neues Manifest markieren den Schnitt — und machen klar, dass Werte vor und nach dem Schnitt verschiedene Messstellen hatten.',
      },
      {
        key: 'vergleichbarkeit',
        prompt: 'Warum bleiben alte und neue Messwerte dank des Freeze vergleichbar?',
        correct: 'Weil nach jeder Optimierung exakt dieselbe Prüfmenge greift — der Messstab wandert nicht.',
        wrong: [
          'Weil der Hash die Pipeline-Auswertung beschleunigt.',
          'Weil alte Werte automatisch neu gerechnet werden.',
          'Weil der Freeze jede weitere Optimierung verbietet.',
        ],
        solution: 'Vergleichbarkeit braucht einen festen Messstab: Dieselben Fragen, dieselben Erwartungen, derselbe Hash. Jede Änderung am Set würde „vorher/nachher“ zu einem Vergleich zweier verschiedener Tests machen.',
      },
      {
        key: 'nicht-performance',
        prompt: 'Warum ist Laufzeitersparnis kein Motiv für den Hash-Freeze?',
        correct: 'Ein Hash-Abgleich kostet Laufzeit statt sie zu sparen — das Motiv ist Messbarkeit und Ehrlichkeit, nicht Performance.',
        wrong: [
          'Weil Hashes nur bei sehr großen Dateien Zeit sparen.',
          'Weil der Freeze gar keinen Hash verwendet.',
          'Weil Laufzeit in Evaluationen grundsätzlich keine Rolle spielt.',
        ],
        solution: 'Der Abgleich ist eine zusätzliche Prüfung pro Lauf — er kostet etwas und liefert dafür Vertrauen in die Vergleichbarkeit. Wer den Freeze als Optimierung liest, verwechselt Messinstrument mit Bremse.',
      },
      {
        key: 'nicht-geheimnis',
        prompt: 'Warum schützt der Freeze die Testfragen nicht vor Auswendiglernen?',
        correct: 'Der Hash macht Änderungen erkennbar — er verhindert weder Lesen noch Merken; Geheimhaltung ist nicht sein Zweck.',
        wrong: [
          'Weil der Hash die Fragen verschlüsselt.',
          'Weil das Golden Set ohnehin für niemanden einsehbar ist.',
          'Weil Auswendiglernen die Messung nicht beeinflusst.',
        ],
        solution: 'Ein Hash ist kein Schutz vor Augen: Wer Zugriff auf den Projektordner hat, liest die Fragen. Der Freeze garantiert Identität des Prüfstands — Vertraulichkeit wäre eine andere Maßnahme an anderer Stelle.',
      },
      {
        key: 'baseline-fixiert',
        prompt: 'Warum ist eine Baseline-Accuracy nur gegen ein eingefrorenes Golden Set sinnvoll?',
        correct: 'Weil „besser als die Baseline“ nur heißt: besser auf derselben Prüfmenge — wandert das Set, vergleicht die Zahl zwei verschiedene Tests.',
        wrong: [
          'Weil Baselines sonst nicht gespeichert werden können.',
          'Weil eingefrorene Sets mehr Fragen enthalten.',
          'Weil Baselines ohne Freeze formal unzulässig sind.',
        ],
        solution: 'Eine Baseline ist ein Bezugspunkt: Sie funktioniert nur, wenn beide Seiten auf denselben Prüfstand zeigen. Ohne Freeze wäre „+3 Punkte“ vielleicht einfach „leichtere Fragen“ — der Hash schließt diese Auslegung aus.',
      },
      {
        key: 'freeze-zeitpunkt',
        prompt: 'Warum wird das Golden Set vor der Optimierung eingefroren und nicht danach?',
        correct: 'Weil sonst jede Optimierung die Prüfmenge mitverändern könnte — der Freeze fixiert das Ziel, bevor Verbesserungen gemessen werden.',
        wrong: [
          'Weil nach der Optimierung niemand mehr Zeit dafür hat.',
          'Weil Hashes vor der Optimierung billiger zu rechnen sind.',
          'Weil die Optimierung das Set sonst löscht.',
        ],
        solution: 'Der Zeitpunkt ist der Sinn des Freeze: Erst das Ziel fixieren, dann dagegen optimieren. Wer danach friert, friert ein Ziel ein, das die Optimierung bereits gesehen hat — und verliert genau die Vergleichbarkeit, die der Freeze herstellen soll.',
      },
      {
        key: 'stille-zielverschiebung',
        prompt: 'Was ist eine „stille Zielverschiebung“ in einer Evaluation?',
        correct: 'Eine undokumentierte Änderung der Prüfmenge, die alte und neue Werte unvergleichbar macht, ohne dass es auffällt.',
        wrong: [
          'Eine Änderung, die der Hash technisch verhindert.',
          'Eine Verbesserung der Pipeline ohne neue Version.',
          'Ein Rechenfehler im Hash-Algorithmus.',
        ],
        solution: 'Still heißt: niemand entscheidet es, niemand merkt es. Das Golden Set wandert, die Zahlen steigen, und niemand kann mehr sagen, ob das Modell besser wurde oder der Test leichter. Der Hash-Freeze macht aus dem stillen Vorgang eine hörbare Prüfung.',
      },
      {
        key: 'manifest-aufgabe',
        prompt: 'Welche Aufgabe hat das Manifest im Freeze-Mechanismus?',
        correct: 'Es bindet Dateinamen an ihre sha256-Hashes — der Abgleich prüft gelieferte Dateien gegen diesen fixierten Soll-Stand.',
        wrong: [
          'Es dokumentiert Änderungen in freier Textform.',
          'Es verschlüsselt das Golden Set gegen Zugriff.',
          'Es ersetzt die Evaluation der Pipeline.',
        ],
        solution: 'Das Manifest ist die prüfbare Form des Freeze: Name → Hash, maschinell nachrechenbar. Ein Protokolltext kann abweichen — ein Hash-Vergleich nicht. Die Evaluation selbst bleibt davon unberührt.',
      },
      {
        key: 'assert-frozen',
        prompt: 'Was macht assert_frozen(), wenn eine gelistete Datei vom eingefrorenen Stand abweicht?',
        correct: 'Es macht die Abweichung hörbar — die Prüfung schlägt sichtbar fehl, statt still weiterzulaufen.',
        wrong: [
          'Es stellt den alten Stand automatisch wieder her.',
          'Es ignoriert kleine Abweichungen unter einem Schwellenwert.',
          'Es sperrt das Repository für weitere Änderungen.',
        ],
        solution: 'Die Funktion ist ein Alarm, kein Reparaturmechanismus: Abweichung → sichtbarer Fehlschlag. Wer ändern will, muss bewusst neu versionieren — genau die gewollte Reibung zwischen stiller und dokumentierter Änderung.',
      },
      {
        key: 'dokumentiert-besser-als-still',
        prompt: 'Warum ist eine dokumentierte Zieländerung besser als eine stille?',
        correct: 'Weil sie als Entscheidung sichtbar wird — mit neuer Version, neuem Manifest und einem klaren Schnitt zwischen altem und neuem Messstab.',
        wrong: [
          'Weil dokumentierte Änderungen die Metrik automatisch verbessern.',
          'Weil nur dokumentierte Sets gehasht werden können.',
          'Weil stille Änderungen technisch unmöglich sind.',
        ],
        solution: 'Der Freeze verbietet nichts — er erzwingt Ehrlichkeit: Neue Version und Manifest markieren den Schnitt, und jeder Leser weiß, dass Werte vorher und nachher verschiedene Prüfstände hatten. Stille Verschiebungen zerstören genau dieses Wissen.',
      },
    ],
  },
};

export const FREEZE_PURPOSE_CONTRACT = {
  familyId: 'classify-freeze-purpose',
  familyGroup: 'classify-concept',
  summary: 'Ordnet den Zweck eines eingefrorenen Prüfstands in einer deterministischen Auswertung ein.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'freeze-purpose', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-capstone-pipeline', 'c-genai-security'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: FREEZE_PURPOSE_CONTRACT,
  capsules: FREEZE_PURPOSE_CAPSULES,
  shapeError: 'Freeze-Purpose-Parameter verletzen die Kapselform',
  keyBy: 'caseId',
});

export const freezePurposeCapsuleOk = FAMILY_IMPL.capsuleOk;
export const freezePurposeCorrectText = FAMILY_IMPL.correctText;
export const genFreezePurposeCapsule = FAMILY_IMPL.genCapsule;
export const generateFreezePurposeFamily = FAMILY_IMPL.generate;
export const solveFreezePurposeFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;
