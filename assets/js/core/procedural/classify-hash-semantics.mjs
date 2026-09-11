// Procedural family classify-hash-semantics: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// The bank keeps the curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// scenarios that probe the same concept (integrity proof via canonical
// serialization: order-invariant, change-sensitive, comparability anchor).
// parameters carry only the scenario key, so nothing answer-relevant leaks
// into instance.parameters. Mirrors genSvmMarginCapsule in
// data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

export const HASH_SEMANTICS_CAPSULES = {
  intro: {
    caseId: 'hash-semantics-baseline',
    bank: [
      {
        key: 'base',
        prompt: 'Warum wird das Golden Set der Capstone-Baseline mit einem sha256-Wert über eine kanonische Serialisierung hashfixiert?',
        correct: 'Er beweist den Zustand des Sets: gleiche Einträge in anderer Reihenfolge bleiben gleich, jede inhaltliche Änderung wird sichtbar — nur so bleiben Läufe vergleichbar.',
        wrong: [
          'Er verschlüsselt die Gold-Antworten, damit niemand die Lösungen lesen kann.',
          'Er verhindert, dass jemand das Set überhaupt ändern kann.',
          'Er berechnet die Metriken schneller, indem er statt der Fälle nur den Hash auswertet.',
        ],
        solution: 'Der Hash macht den Zustand des Sets prüfbar: Dieselben Einträge in anderer Reihenfolge ergeben denselben Wert, jede inhaltliche Änderung (Gold-Antwort, Fall, Feld) einen anderen. Steht in der Lektion „Abschlussphase“ derselbe Wert wie heute, sind die Baseline-Zahlen noch über demselben Set vergleichbar — hat er sich geändert, ist jede Vorher-Nachher-Aussage wertlos. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.',
      },
      {
        key: 'fixtures-benchmark',
        prompt: 'Die Fixtures-Datei einer Benchmark-Suite wird vor dem Lauf mit sha256 über einer kanonischen Serialisierung fixiert. Was leistet der Hash?',
        correct: 'Er dokumentiert den exakten Stand der Fixtures: Umstellen der Fälle ändert den Wert nicht, jede inhaltliche Änderung macht ihn sichtbar — so bleiben Benchmark-Läufe vergleichbar.',
        wrong: [
          'Er verschlüsselt die Fixtures, damit die erwarteten Antworten geheim bleiben.',
          'Er sperrt die Datei gegen jede spätere Bearbeitung.',
          'Er beschleunigt die Auswertung, weil nur der Hash statt der Fälle gelesen wird.',
        ],
        solution: 'Wie beim Golden Set ist der Hash ein Zustandsbeweis: Die kanonische Serialisierung macht ihn reihenfolgeinvariant, jede inhaltliche Änderung schlägt in einem anderen Wert durch. Wer später denselben Wert reproduziert, rechnet nachweisbar über denselben Fixture-Stand.',
      },
      {
        key: 'filesize-not-enough',
        prompt: 'Warum reicht es nicht, bei der Fixierung des Golden Sets einfach die Dateigröße zu protokollieren?',
        correct: 'Weil die Größe kein Zustandsbeweis ist: Gleich lange Dateien können andere Inhalte haben — nur ein Hash über der kanonischen Serialisierung macht jede inhaltliche Änderung sichtbar, ohne auf die Reihenfolge zu reagieren.',
        wrong: [
          'Weil die Dateigröße die Einträge verschlüsselt und damit unlesbar macht.',
          'Weil die Größe bei jeder Umsortierung springt und falschen Alarm gibt.',
          'Weil Metriken aus der Dateigröße berechnet werden und sie konstant bleiben muss.',
        ],
        solution: 'Größe ist eine kollisionsanfällige Eigenschaft: Zwei verschiedene Sets können gleich viele Bytes haben, und Umsortieren ändert die Größe gar nicht. Der Hash über der kanonischen Form kippt dagegen bei jeder inhaltlichen Änderung und bleibt bei reiner Umordnung stabil.',
      },
      {
        key: 'reordered-copies',
        prompt: 'Zwei Kopien desselben Golden Sets liegen in unterschiedlicher Reihenfolge vor. Was zeigt der gemeinsame Hash über der kanonischen Serialisierung?',
        correct: 'Dass der Inhalt identisch ist: Die kanonische Form sortiert die Einträge, daher erzeugt dieselbe Menge denselben Wert — Reihenfolge zählt nicht, Inhalt schon.',
        wrong: [
          'Dass beide Dateien unveränderbar geworden sind.',
          'Dass die Einträge jetzt verschlüsselt vorliegen.',
          'Dass die Reihenfolge doch relevant war und der Hash sie abbildet.',
        ],
        solution: 'Kanonische Serialisierung bedeutet: Dieselbe Menge an Einträgen erzeugt denselben Byte-Strom, egal in welcher Reihenfolge die Datei sie auflistet. Gleicher Hash heißt also gleicher Inhalt — eine reine Umsortierung ist kein inhaltlicher Unterschied.',
      },
      {
        key: 'canonical-vs-editor',
        prompt: 'Ein Prüfprotokoll soll vor dem Commit hashfixiert werden. Warum eine kanonische Serialisierung statt der Datei, wie sie gerade im Editor liegt?',
        correct: 'Weil Formatdetails wie Leerzeichen oder Schlüsselreihenfolge den Hash sonst ändern, ohne dass sich der Inhalt ändert — erst die kanonische Form macht den Wert zum verlässlichen Zustandsbeweis.',
        wrong: [
          'Weil die kanonische Form das Protokoll vor fremden Änderungen schützt.',
          'Weil nur kanonische Dateien von sha256 gelesen werden können.',
          'Weil die kanonische Serialisierung die Metriken des Protokolls berechnet.',
        ],
        solution: 'Ohne kanonische Form erzeugt jede Editor-Formatierung einen anderen Hash bei gleichem Inhalt — der Wert wäre kein Zustandsbeweis mehr, sondern ein Abbild zufälliger Formatdetails. Kanonisch heißt: eine feste Regel legt Schreibweise und Reihenfolge fest, der Hash misst nur noch den Inhalt.',
      },
      {
        key: 'vocab-drift',
        prompt: 'Das Tokenizer-Vokabular eines Projekts wird per Hash fixiert. Ein Reviewer findet später einen abweichenden Wert. Was folgt daraus?',
        correct: 'Das Vokabular wurde inhaltlich geändert — Vergleiche von Modellzahlen vor und nach der Änderung beziehen sich nicht mehr auf dasselbe Artefakt.',
        wrong: [
          'Das Vokabular ist jetzt verschlüsselt und muss erst entschlüsselt werden.',
          'Der Hash hat die Änderung verhindert, die Datei ist unverändert.',
          'Der abweichende Hash beweist, dass nur die Reihenfolge der Einträge anders ist.',
        ],
        solution: 'Der Hash sperrt nichts, er macht Änderungen sichtbar: Weicht der Wert ab, liegt ein anderer Vokabular-Stand vor. Ergebnisse, die vor und nach der Änderung erhoben wurden, sind dann nicht mehr über demselben Artefakt vergleichbar.',
      },
      {
        key: 'hash-in-protocol',
        prompt: 'Warum wird der Hash der Baseline-Fixtures im Protokoll festgehalten statt nur in der Datei selbst?',
        correct: 'Damit spätere Läufe prüfen können, ob sie noch über demselben Set rechnen: Der notierte Wert ist die Referenz, ein Abgleich macht unbemerkt geänderte Fälle sofort sichtbar.',
        wrong: [
          'Damit die Fixtures beim Lesen der Datei automatisch verschlüsselt werden.',
          'Damit der Hash die Datei vor dem Überschreiben schützt.',
          'Damit die Benchmark-Metriken direkt aus dem Protokoll-Eintrag berechnet werden.',
        ],
        solution: 'Der im Protokoll notierte Wert ist die Vergleichsreferenz: Ein späterer Lauf hasht den aktuellen Stand erneut und gleicht ab. Stimmen die Werte, ist die Vergleichbarkeit der Zahlen belegt; weichen sie ab, ist jede Vorher-Nachher-Aussage hinfällig.',
      },
      {
        key: 'lockfile',
        prompt: 'Ein Lockfile mit exakten Abhängigkeitsversionen wird hashfixiert. Was ist der fachliche Nutzen?',
        correct: 'Der Hash beweist, mit welchem Versionsstand gerechnet wurde: Jede geänderte Version erzeugt einen anderen Wert, reines Umsortieren der Einträge keinen — Builds bleiben nachprüfbar.',
        wrong: [
          'Der Hash verhindert, dass neue Paketversionen installiert werden können.',
          'Der Hash verschlüsselt die Versionsliste gegen fremde Nutzung.',
          'Der Hash installiert die Pakete schneller, weil er die Downloads zusammenfasst.',
        ],
        solution: 'Wie beim Golden Set gilt: Der Hash ist ein Zustandsbeweis über dem Versionsstand. Wer später denselben Wert reproduziert, hat nachweisbar dieselben Abhängigkeiten — ein Build lässt sich so einem exakten Stand zuordnen.',
      },
      {
        key: 'split-assignment',
        prompt: 'Die Zuordnung der Fälle zu Train- und Test-Split wird als sortierte Liste hashfixiert. Welche Eigenschaft macht das prüfbar?',
        correct: 'Jede andere Aufteilung ergibt einen anderen Hash — wer später dieselbe Split-Datei sieht, kann mit einem Wert belegen, dass die Trennung unverändert ist.',
        wrong: [
          'Der Hash hält die Split-Datei gegen Änderungen gesperrt.',
          'Der Hash macht aus der Aufteilung ein Geheimnis, das nur der Trainingslauf kennt.',
          'Der Hash verteilt die Fälle gleichmäßig auf Train und Test.',
        ],
        solution: 'Die Fixierung macht die Split-Zuordnung zu einem prüfbaren Fakt: Jede veränderte Fall-Zuordnung kippt den Wert, die sortierte kanonische Form hält ihn von der Datei-Reihenfolge frei. So bleibt nachweisbar, dass Train und Test über denselben Fällen ausgewertet wurden.',
      },
      {
        key: 'prompt-catalog',
        prompt: 'Ein Prompt-Template-Katalog wird über einer kanonischen Serialisierung hashfixiert. Wozu dient das bei der Evaluation?',
        correct: 'Es macht den Template-Stand zum prüfbaren Fakt: Steht derselbe Wert, lief die Bewertung über denselben Prompts — Template-Änderungen können Ergebnisunterschiede nicht mehr unsichtbar erklären.',
        wrong: [
          'Der Hash ersetzt die Templates durch eine kürzere, geheime Form.',
          'Der Hash verhindert, dass Prompts während des Laufs editiert werden.',
          'Der Hash bewertet die Antworten, indem er sie mit den Templates abgleicht.',
        ],
        solution: 'Prompt-Änderungen sind ein stiller Konfounder jeder Antwort-Messung. Der fixierte Hash macht den Template-Stand explizit: Ergebnisunterschiede bei gleichem Hash können nicht an den Prompts liegen, bei abweichendem Hash ist die Vergleichbarkeit gebrochen.',
      },
      {
        key: 'rubric-fixation',
        prompt: 'Der Kriterienkatalog einer manuellen Bewertung (Rubric) wird hashfixiert. Was sichert der Wert ab?',
        correct: 'Dass alle Bewertenden mit demselben Kriterienstand arbeiten: Jede geänderte Formulierung oder Gewichtung zeigt sich im abweichenden Hash — die Bewertungen bleiben vergleichbar.',
        wrong: [
          'Der Hash bewertet die Einreichungen automatisch nach den Kriterien.',
          'Der Hash verhindert nachträgliche Änderungen an den Kriterien.',
          'Der Hash verschlüsselt die Rubric, damit Bewertete sie nicht kennen.',
        ],
        solution: 'Manuelle Bewertungen sind nur vergleichbar, wenn der Kriterienstand festliegt. Der Hash über der kanonischen Form beweist genau das: Gleicher Wert heißt gleiche Kriterien, jede redaktionelle Änderung wird sichtbar.',
      },
      {
        key: 'export-import-roundtrip',
        prompt: 'Ein exportierter Lernstand wird beim Import mit dem Export-Hash verglichen. Was prüft dieser Abgleich?',
        correct: 'Ob der Inhalt unverändert übertragen wurde: Stimmen die kanonischen Serialisierungen überein, beweist der gleiche Hash denselben Stand — jede Abweichung macht eine veränderte oder beschädigte Datei sichtbar.',
        wrong: [
          'Ob die Datei während der Übertragung verschlüsselt blieb.',
          'Ob jemand den Export vor dem Import gesperrt hat.',
          'Ob der Import schneller lief als der Export.',
        ],
        solution: 'Der Export-Hash ist die Referenz des Standes: Der Import hasht die eingelesene Datei erneut über derselben kanonischen Form. Gleicher Wert beweist eine inhaltlich unveränderte Übertragung, jede Abweichung zeigt Veränderung oder Beschädigung.',
      },
      {
        key: 'compact-proof',
        prompt: 'Warum fixiert das Capstone-Protokoll den Hash des Golden Sets statt alle Gold-Antworten abzudrucken?',
        correct: 'Weil ein Hash den Zustand kompakt und prüfbar festhält: Jede inhaltliche Änderung am Set erzeugt einen anderen Wert, ohne dass das Protokoll die Antworten selbst enthalten muss.',
        wrong: [
          'Weil Gold-Antworten im Protokoll verschlüsselt werden müssen und der Hash das übernimmt.',
          'Weil der Hash die Antworten komprimiert und sie bei Bedarf wiederherstellt.',
          'Weil das Protokoll dadurch verhindert, dass das Set geändert wird.',
        ],
        solution: 'Der Hash ist ein kompakter Zustandsbeweis, keine Kompression: Aus ihm lässt sich der Inhalt nicht rekonstruieren, aber jeder Stand der Datei lässt sich gegen ihn prüfen. Das Protokoll bleibt lesbar und trotzdem verbindlich.',
      },
    ],
  },
};

export const HASH_SEMANTICS_CONTRACT = {
  familyId: 'classify-hash-semantics',
  familyGroup: 'classify-concept',
  summary: 'Ordnet Hash-Fixierung als Integritäts- und Vergleichbarkeitsregel einer Capstone-Baseline ein.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'hash-semantics-baseline', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-research-capstone'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: HASH_SEMANTICS_CONTRACT,
  capsules: HASH_SEMANTICS_CAPSULES,
  shapeError: 'Hash-Semantik-Parameter verletzen die Kapselform',
});

export const hashSemanticsCapsuleOk = FAMILY_IMPL.capsuleOk;
export const hashSemanticsCorrectText = FAMILY_IMPL.correctText;
export const genHashSemanticsCapsule = FAMILY_IMPL.genCapsule;
export const generateHashSemanticsFamily = FAMILY_IMPL.generate;
export const solveHashSemanticsFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;
