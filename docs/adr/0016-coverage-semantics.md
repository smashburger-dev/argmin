# ADR-0016: Coverage-Semantik — Releaseblocker, Supplements und Human-Review-Pflichten trennen

Status: Angenommen. Datum: 2026-08-31 (Session B).

## Kontext

Der Coverage-Bericht mischte bis Session A alle Flags in einem `knownGaps`-Array: echte publikationsblockierende Gaps, optionale lokale Zusatzaktivitäten (Numbas), zurückgehaltene private Zusatzlektüren und Draft-Status wirkten gleich. Zusätzlich zwei False-Positive-Klassen: (1) Wochen-Tiers verknüpften Aufgaben nur über `legacyWeekId`, sodass w01/w05 „keine Advanced-Aktivität" meldeten, obwohl jede Themen-Kompetenz Advanced-Aufgaben besitzt (nur in anderen Wochen verankert); (2) jede Woche ohne eigenes Projekt bekam `no-project` — auch die Capstone-Phasenwochen w35-w38, in denen das Projekt real läuft. Beides machte den Bericht als Release-Steuerung unbrauchbar: 35 von 39 Wochen sahen „kaputt" aus.

## Entscheidung

Kompetenz- und Themen-Einträge führen strukturierte Felder statt eines Flag-Arrays:

- `releaseGaps` — echte publikations-/fachliche Gaps (Lektüre-, Evidence-, Variations-, Typen-, Tier-Abdeckung, `source-rights-block-publication`, Outline-Wochen, undefinierte Kompetenzreferenzen).
- `localSupplements` — `contains-local-only-activity`: sichtbar, blockiert nicht, solange gleichwertige öffentliche Evidenz existiert (Existenz wird durch die Evidence-Dimensionen gewährleistet; `source-rights-block-publication` bleibt als einziger Rechte-Flag ein echter Blocker).
- `privateSupplements` — `private-source-reference-withheld`: zurückgehaltene private Lektüre blockiert nicht, wenn vollständige öffentliche Lektüre existiert (heute überall der Fall: 0 Rechteblocker).
- `humanReviewRequired` — `draft-content`: menschliche didaktische Freigabe bleibt getrennt von fachlichen Gaps (alle Inhalte bleiben Draft bis zur Freigabe).
- `empiricalUnknowns` — Matrix-Ebene (Review-Slots, freshnessDays, Treffer-/Hint-Schwellen, Zeit- und Difficulty-Schätzungen): als Produktheuristiken ausgewiesen, nicht als Kompetenz-Flags.

Regeln im Einzelnen:

1. `private-source-reference-withheld` ist kein Releasegap bei vollständiger öffentlicher Lektüre (Feld bleibt unter privateSupplements sichtbar).
2. `contains-local-only-activity` ist kein Releasegap bei gleichwertiger öffentlicher Evidence.
3. `source-rights-block-publication` bleibt immer Releaseblocker (aktuell 0 Vorkommen).
4. `no-project` als Wochenflag ist entfernt — nicht jede Woche braucht ein Projekt; Projektpflicht ergibt sich explizit aus Kompetenz, Milestone oder Curriculum.
5. Multi-Wochen-Projekte erscheinen in ihren tatsächlichen Phasenwochen als fortgeführt (`sharedProjectIds` aus `phases.json`); der `legacyWeekId` bleibt der einzelne Anker (Projekt besitzt seine Wochenbindung, fail-closed gegen unbekannte Wochen).
6. Wochen-Tier-Abdeckung verknüpft Aufgaben BOTH über ihre Verankerungswoche als auch über die Themen-Kompetenzen der Woche — Kompetenz-Abdeckung verschwindet nicht, weil eine Definition anders verankert ist.
7. Die Zusammenfassung zählt Supplements getrennt und meldet `releaseBlockingCompetencies`/`releaseBlockingTopics` (beide 0); die Rohdaten weisen Supplements weiter einzeln aus.

Fail-closed-Gates (Public-Build, Rechteprüfung) sind unverändert; dieser ADR ändert nur Berichtssemantik, keine Build-Gates. Zusätzlich fail-closed im Compiler: Ein Checkpoint-Block, der dasselbe Dokument wie ein anderer Block referenziert, wirft (Phantom-Checkpoints, die „gelesen" statt abgerufen üben — 9 Vorkommen behoben: 4 GenAI-, 5 Research-Lektionen mit echten Abruffragen versehen).

## Konsequenien

- Zielzustand erreicht: 0 Kompetenzen ohne frische Varianten, 0 ohne öffentliche Lektüre, 0 ohne unabhängige Evidenz, 0 Outline-Wochen, 0 undefinierte Referenzen, 0 Releaseblocker (Kompetenz- und Themen-Ebene); Supplements bleiben sichtbar (3 lokale, 7 private Kompetenzen).
- Der Bericht ist als Release-Steuerung nutzbar: was unter `releaseGaps` steht, blockiert tatsächlich.
- Der Lektions-Checkpoint-Vertrag ist mechanisch erzwingbar; neue Lektionen können Phantom-Checkpoints nicht mehr unbemerkt einführen.
- Grenze: Die Supplement-Semantik setzt voraus, dass Ersatzpfade fachlich gleichwertig sind — das ist eine redaktionelle Aussage (LR-8 aus dem Rechte-Audit bleibt Human-Review).
