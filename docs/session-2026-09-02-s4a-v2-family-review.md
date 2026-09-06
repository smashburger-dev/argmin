# Session S4A-v2: Deep Family Review (2026-09-02/03)

Fortsetzung des Idle-Tasks `docs/idle-task-pre-s2b-continuation.md`, Blöcke A–F.
Branch `streamline/integration-pre-s2b` ab `9421d62`. Kein Produktionscode, kein
Content, kein Produktschema, keine Generator-Baseline verändert. Alle
Modellvorgaben des Dokuments (GPT/GLM) ignoriert nach Noa-Weisung: ein Modell,
getrennte Review-Kontexte. Echte Modellunabhängigkeit gibt es nicht; die
Unabhängigkeit der Reviews kommt aus getrennten Kontexten und adversarialen
Briefings.

## Ergebnis

- 268 Baseline-Definitionen genau einmal disponiert (267 atomic-cases +
  1 retired Composite `w05-e7`).
- 132 CognitiveFamilies in 11 FamilyGroups (v1: 256 Familien). 15
  shardübergreifende Familien. 76 Singletons (0,58), jeder einzeln begründet
  und von D1 gegen Merge geprüft.
- 9 aktive TaskArchetypes + 1 historischer (`numbas-exam-retired`, bindet
  nichts). 267 distinkte caseIds (0 geteilte; Template-Teilung ist S4C-Arbeit).
- 57 Human-Reviews und 235 Unsicherheiten vollständig disponiert, keine
  vorgetäuschte menschliche Freigabe. Entscheidungsqueue: 36 offene Punkte.
- 623 Feedbackvorkommen (275 konsumiert verhaltensstabil, 348 mit ehrlichem
  Zielpfad: 334 answer-note, 8 worked-solution, 3 generic-hint,
  2 input-validation, 1 editorial-diagnosis). Kein LLM-Grader.
- Persistenz: 262 preserve-id, 5 merge-map-required, 1 retire-blocked.
- Assembler alle Assertions grün, Selbsttest 27/27, Gate-B-Skript grün.

## Reviews (alle coral außer D4 grün, keine Criticals)

7 Domänenreviews (foundations lag vor; 6 parallel neu) + 4 Cross-Domain (D1–D4)
+ 2. `w37-e1`-Zweitprüfung + Adversarial-Review. Berichte unverändert unter
`research/streamlining/s4a-v2/reviews/`.

Bestätigte Korrekturen: 11 Family-Moves (`w02-e1`, `w01-e6`, `w31-e3`,
`w24-e3`, `w13-e4`, `w34-e2`, `w34-e3`, `w37-e3`, je mit Quellenbeleg),
3 neue Familien (`trace-training-loop-count`, `classify-column-combination`,
`classify-freeze-purpose`), 2 Vertragserweiterungen (MRR-Achse,
Token-Multimengen), 1 mergeInto-Reparatur mit Textaktualisierung (`w37-e1`),
1 caseId-Rückbenennung, Registry-Reconciliation (67 Adoptionen, 20+ Counts,
2 tote Hypothesen entfernt), Hypothesen-Hygiene mit Archiv.
Council-Entscheide ohne Shard-Eingriff: rationale-note-Ausnahme (2 Quellen),
vacuous-axis-Präzedenz, Dehnungen (`w21-e3`, `w38-e3`), Test-attitude-Grenze,
`mergeInto`-Konvention, 18/19→15. Vollprotokoll: `block-c-decisions.md`.

Eigene Vorentscheid-Revisionen: `w37-e1`-Zeiger (D3 zeigte Inkohärenz),
Hypothesen-Einfrieren (D1 wog schwerer als D2). Der Adversarial-Review fand
einen echten übersehenen Fehler (Selbsttest rot nach `--write`, ADV-F1),
sofort repariert.

## Verbleibende Noa-/Empirie-Entscheide (Auswahl)

`w37-e1`-Merge (zwei Reviews + Gegenreview liegen vor), `w05-e11/12/13`,
`w17-e2` mit `c-ml-repro`-Migration, Prozent-Grenzen, Kopier-Architekturen,
S4B-Bindungsauflagen (Bearbeitungsnachweis-IDs, Lektionszuordnungen). Vollständig
in `decision-queue.json` (3/1/31/1 nach Risiko).

## Reproduzierbare Befehle (aus `ki-lernplattform/`)

- `node research/streamlining/s4a-v2/selftest.mjs` → 27/27
- `node research/streamlining/s4a-v2/assemble-v2.mjs` → alle Assertions grün
- `node research/streamlining/s4a-v2/assemble-v2.mjs --write` → schreibt
  `migration-matrix-v2.json`, `feedback-disposition.json`,
  `decision-queue.json`, leitet Registry-Mitgliedschaften ab
- `node research/streamlining/s4a-v2/scaffold-shard.mjs --validate <domain>`
  → je 49/26/61/24/30/24/54, 0 TODOs

## Artefakte (Commit 8)

`research/streamlining/s4a-v2/` vollständig (Shards, Registry, Archetypen,
Schema, Assembler, Selbsttest, Scaffold, Family-Modell, Vergleich, Matrix,
Feedback, Queue, 13 Review-Berichte, Entscheidungsprotokoll) plus dieser Digest.
