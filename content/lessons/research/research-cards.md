# Daten- und Modellkarten als Verträge

Diese Lektion behandelt die Karten, die ein Projekt lesbar machen: Datenkarte, Modellkarte, Systemkarte und das Forschungsprotokoll, das alles zusammenhält. Du prüfst sie auf Pflichtfelder und innere Konsistenz, hältst semantische Versionen ein und belegst Rechnungen mit echten Split-Summen, statt sie zu behaupten. Zwei kurze Checks gehören dazu: ein Secret-Scan und ein Scan auf harte Limits wie `context_limit`.

## Das Bild dahinter: der Beipackzettel

Stell dir den Beipackzettel eines Medikaments vor: Inhaltsstoffe sind die Daten, das Anwendungsgebiet der Einsatzzweck, die Dosierung Metrik und Schwelle, Nebenwirkungen und Gegenanzeigen die Grenzen. Packung und Zettel müssen zusammenpassen; das ist die Konsistenz.

Wo der Vergleich hinkt: Den Beipackzettel prüft eine Behörde, bevor das Medikament verkauft wird. Deine Karten prüfst du selbst; ein Validator erzwingt nur die Struktur, die Ehrlichkeit des Inhalts liegt bei dir.

## Warum Karten Verträge sind

Die Metapher „Karte“ hat einen konkreten Hintergrund: Eine **Datenkarte** sagt aus, woraus ein Datensatz besteht und was er nicht enthält. Eine **Modellkarte** sagt, wozu ein Modell gebaut wurde und wo seine Grenzen liegen. Beide sind Verträge zwischen dir heute und dir später (und zwischen dir und anderen), nicht bloße Dekoration. Der Validator liest sie wie ein Vertragspartner: Pflichtfeld fehlt, Vertrag ungültig.

Die vier Dokumenttypen in dieser Lektion decken vier Blickwinkel ab:

| Dokument | Beantwortet |
|---|---|
| Datenkarte | Woher stammen die Daten, wie wurden sie gesplittet, was fehlt? |
| Modellkarte | Wozu ist das Modell gedacht, wie wurde es gemessen, wo scheitert es? |
| Systemkarte | Wie interagiert das Modell mit Daten, Menschen und externen Systemen? |
| Forschungsprotokoll | Welche Frage wurde vor dem Lauf festgelegt, mit welcher Metrik und Schwelle? |

Wer ein Projekt nur aus dem Code verstehen will, verliert Zeit und riskiert falsche Annahmen. Wer Karten schreibt, sichert genau die Annahmen, die im Code nicht stehen.

## Pflichtfelder: minimal, aber unverhandelbar

Jeder Kartentyp hat Pflichtfelder; leere Strings gelten als fehlend. Ein `schema_version`-Feld gehört dazu (das Format ist Semver, also `major.minor.patch`), plus typabhängige Felder. **Pflichtfeld** heißt hier: Ohne diesen Inhalt ist das Dokument unvollständig, nicht nur knapp.

**Datenkarte:** `name`, `schema_version`, `source_type` (aus `synthetic`, `public`, `internal`, `private`), `schema_summary`, `split_summary`, `pii_screened`, `license_summary`, `known_limits`. `split_summary` muss mindestens `splits` (train/eval/test) enthalten; `pii_screened` ist ein bool.

**Modellkarte:** `name`, `schema_version`, `task_type` (`classification`, `regression`, `generation`, `retrieval`, `ranking`, `other`), `metrics_table`, `subgroups_evaluated`, `limitations`, `ethical_considerations`, `out_of_scope_uses`, `version`, `owners`. `version` ist Semver.

**Systemkarte:** `name`, `schema_version`, `intended_purpose`, `data_flow`, `stakeholders`, `metrics_at_system_level`, `risks`, `controls`. Wenn `controls` nicht leer ist, braucht jede Kontrolle `control_name` und `mitigates`.

**Forschungsprotokoll:** `name`, `schema_version`, `frage`, `metrik`, `baseline`, `erfolgsschwelle`, `abbruchregel`, `datum_prereg`, `datum_hauptlauf`; Datum in `YYYY-MM-DD`, `datum_prereg` vor `datum_hauptlauf`.

## Konsistenz zwischen den Karten

Die Karten müssen nicht nur einzeln vollständig sein, sie müssen **zueinander passen**. Vier Checks sind deterministisch:

1. **Metrik:** Der primäre Metrik-Name steht in allen vier Dokumenten wörtlich.
2. **Split-Summe:** `splits.train + splits.eval + splits.test = n_rows` in der Datenkarte; die Summe ist die einzige Belegquelle für „wir haben X Zeilen“, sonst ist jede Zahl im Protokoll nur eine Behauptung.
3. **Zweck und Out-of-scope:** `intended_purpose` der Systemkarte taucht wörtlich im Protokoll auf, und mindestens ein `out_of_scope_use` aus der Modellkarte taucht in `risks` der Systemkarte (oder `limitations` der Modellkarte) wieder auf. Karte, System und Protokoll erzählen dieselbe Geschichte.
4. **Datum:** `datum_prereg` liegt vor `datum_hauptlauf`; die Reihenfolge allein ist schon ein Konsistenzcheck.

Die Karten sind nicht abstrakte Dokumentation, sie sind ein Netz aus Verweisen. Wer nur eine Karte füllt und die anderen leer lässt, hat keinen Vertrag geschlossen, sondern eine Broschüre.

## Semver: Versionen, die etwas bedeuten

Semver ist nicht nur ein Format, es ist ein Kommunikationsvertrag. `patch` heißt „Bugfix oder Klarstellung, keine neue Bedeutung“; `minor` heißt „rückwärtskompatibel erweitert“; `major` heißt „bedeutender Bruch, Verbraucher müssen migrieren“. Wer eine Datenkarte um ein neues Split-Verhältnis erweitert und nur `patch` hochzieht, lügt implizit; `minor` ist richtig. Wer den Metrik-Vertrag bricht, muss `major` hochziehen.

Falsche Versionssprünge sind kein kleiner Fehler: Konsumenten einer Karte (z. B. dein eigenes Skript, das die Karte einliest) verlassen sich auf `major` und `minor`. Ein `patch`, der eigentlich `major` ist, bricht Code ohne Warnung.

## Secret-Scan und harte Limits

Direkt zu den Karten gehören zwei maschinelle Checks, die nichts mit Vollständigkeit zu tun haben und trotzdem Pflicht sind:

- **Secret-Scan:** Findet Token-Formen wie `ghp_…`, `sk-…`, `AKIA…`, PEM-Header, `api_key=`/`token=`/`password=` mit mehr als acht Zeichen danach sowie `eyJ…`-JWTs. False Positives sind erlaubt; wer weiß, was er da sieht, markiert den Fund als Falschalarm.
- **Kontextlimit-Scan:** Findet Zahlen wie `context_limit: 4096`, `max_context_tokens: 8192`, `context_window: 4096`. Harte Limits sind keine Schätzungen; sie begrenzen, was du senden darfst, und gehören explizit in die Karten, nicht versteckt im Code.

Die zwei Scans erzeugen Fundberichte, keine fertigen Antworten. Der Secret-Scan kann harmlose Zeichenketten fälschlich markieren; der Kontextlimit-Scan kann Zahlen aufgreifen, die keine Kontextlimits sind. Wichtig ist nicht der Fund allein, sondern dein Umgang damit: Prüfen, Klassifizieren, Dokumentieren.

## Worked Example am GenAI-Prototyp

Der GenAI-Prototyp hat keine echten Karten; die Aufgabe ist, sie zu füllen. Die Datenkarte enthält `split_summary` mit echten Counts aus dem Fixtur-Set; die Modellkarte dokumentiert `task_type: generation` und `metrics_table` mit dem echten recall-Wert des Stubs; die Systemkarte hält `data_flow` (Query → Embed → Retrieve → Answer → Block on Injection) und `controls` mit der Injektionserkennung; das Forschungsprotokoll definiert Frage, Metrik, Schwelle und Datum vor dem Hauptlauf.

Konsistenz heißt hier konkret: Der Metrik-Name `recall@5` steht im Protokoll, die Systemkarte referenziert ihn, und die Split-Summe der Datenkarte stimmt mit der `n_rows` des Fixtur-Sets überein. Version wird auf `0.1.0` gesetzt, weil die erste Ausfüllung eine echte neue Bedeutung hat; `patch` wäre falsch, weil die Karte vorher effektiv leer war.

## Typische Fehlvorstellungen

- „Ich habe eine README, das reicht.“ Eine README ist nicht vertraglich prüfbar; Karten haben ein Schema und einen Validator, und genau das macht sie verlässlich.
- „Semver ist nur für Software-Releases.“ Karten versionieren Aussagen; die Semantik von `major`, `minor`, `patch` übersetzt sich eins zu eins auf Daten und Modelle.
- „Ein Fund beim Secret-Scan heißt Leck.“ Ein Fund ist ein Verdacht, der geprüft werden muss; ein echter Fehler ist das Ignorieren des Scans, nicht das False Positive.
- „Pflichtfelder fülle ich später.“ Ohne Pflichtfelder ist die Karte ungültig, nicht unfertig; die Reihenfolge heißt: erst Pflicht, dann Ausführlichkeit.

## Wo dir das in der KI begegnet

Die Kartenformate kommen aus der Forschung: Model Cards (Mitchell et al., 2019) und Datasheets for Datasets (Gebru et al., 2018) sind die Vorlagen. Auf dem Hugging Face Hub hat heute fast jedes Modell eine Model Card; wer sie liest, weiß, was das Modell kann und wo es nicht getestet wurde.

## Direkter Check

In der [Kernaufgabe: Fehlende Pflichtfelder](#/family/formula-stat-from-table/card-audit-missing-count/0/core) zählst du fehlende und leere Pflichtfelder über Karten hinweg. Die [Kernaufgabe: Kartenprüfungs-Trace](#/family/trace-assignment-state/card-check-variable-trace/0/core) verfolgt eine Feld- und Split-Prüfung im Code; die [Kernaufgabe: validate_card](#/family/validate-required-field-raise/validate-card-fields/0/core) implementiert validate_card mit Split-Summen und Semver; die [Vertiefungsaufgabe: Geheimnis-Scan](#/family/validate-rule-catalog-scan/card-secret-scan/0/stretch) prüft Karten gegen das Protokoll und scannt auf geleakte Schlüssel und Token; die [Herausforderung](#/family/validate-rule-catalog-scan/cross-card-consistency/0/challenge) als Boss führt den Cross-Check über alle Karten und das Protokoll zu einer Widerspruchsliste zusammen.

## Begriffe auf einen Blick

- **Datenkarte**: Dokument mit Herkunft, Split, Lizenz und bekannten Lücken eines Datensatzes.
- **Modellkarte** (englisch *model card*): Dokument mit Einsatzzweck, Metriken pro Gruppe und Grenzen eines Modells.
- **Systemkarte**: Dokument mit Datenfluss, Beteiligten, Risiken und Kontrollen eines Gesamtsystems.
- **Forschungsprotokoll**: schriftliche Festlegung von Frage, Metrik, Endpunkten, Subgruppen, Baseline und Abbruchregel.
- **Pflichtfeld**: Feld, ohne das ein Kartendokument ungültig ist; leere Strings gelten als fehlend.
- **Konsistenz**: die wörtliche Übereinstimmung von Metrik, Zweck und Daten zwischen den Karten.
- **Semver**: semantische Versionierung `major.minor.patch`; `major` meldet Brüche, `minor` Erweiterungen, `patch` Klarstellungen.
- **Split (Daten)**: die Aufteilung eines Datensatzes in Trainings-, Evaluations- und Testteil.
