# ADR-0005: IndexedDB für Fortschritt und Artefakte, Migration von localStorage

Status: Angenommen. Datum: 2026-08-24. Nachträge: schemaVersion 2 am 2026-08-25, schemaVersion 3 am 2026-08-29.

## Entscheidung
`ProgressStore` (`assets/js/core/progress_store.js`) nutzt IndexedDB `ki-lernplattform` mit `schemaVersion` 3. Stores: `weeks`, `attempts`, `journal`, `reviewQueue`, `settings`, `meta`, `plans` und `drafts`. `attempts` bleibt die Ereigniswahrheit; `reviewQueue` ist ein daraus ableitbarer Cache. `plans` speichert bestätigte persönliche Pläne. `drafts` speichert lokale Arbeitsstände und den aktuellen Aufgabenzyklus. Der mit ADR-0007 aufgeschobene Store `notebooks` wird nicht angelegt.

**localStorage-Migration:** Der Schlüssel `ki-roadmap-progress-v1` aus `KI_Lernroadmap.html` wird einmal gelesen und als Phasen-Selbstmarkierung in `weeks` übernommen. Der localStorage-Eintrag bleibt unangetastet.

**SchemaVersion 2 (2026-08-25):** `reviewQueue` wurde mit `exerciseId` und `nextDueAt`-Index ergänzt. Die Queue bleibt ableitbarer Cache.

**SchemaVersion 3 (2026-08-29):** `attempts` erhält eindeutige `eventId`, lokale `installationId`, `eventType`, `activityId`, `activityVersion`, `definitionId`, `instanceId`, `cycleId`, `competencyIds`, `contentVersion`, `occurredAt`, `recordedAt`, `evidenceEligible` und `exclusionCode`. Bestehende v1/v2-Datensätze werden idempotent normalisiert. Bekannte Übungen erhalten Kompetenzen aus `content/legacy/exercise-competency-map.json`; unbekannte bleiben sichtbar und tragen `legacy-unmapped`. Nicht rekonstruierbare alte Fassungen heißen ausdrücklich `legacy-unknown` und `pre-v3`.

Importe der Versionen 1, 2 und 3 werden vor jeder Schreibtransaktion vollständig geprüft. V1/V2 werden auf v3 normalisiert. Ein Import ersetzt alle acht Stores in einer einzigen Transaktion, behält die lokale Installation-ID und berechnet `reviewQueue` neu. Doppelte v3-Event-IDs sind ungültig.

## Alternativen
- Nur localStorage weiter: zu klein für Attempt-Historie/Journal; keine strukturierten Abfragen.
- OPFS/Datei-Download als Speicher: Export/Import gibt es zusätzlich (JSON), aber primärer Speicher bleibt IndexedDB.
- Server-Datenbank: widerspricht lokaler Offline-Plattform.

## Getesteter Integrationsweg
Die CDP-Abnahme erzeugt eine synthetische v1-Datenbank, öffnet sie mit Schema 3 und prüft acht Stores, unveränderte Attempt-Anzahl, Legacy-Event-IDs, Kompetenzmapping, Inhaltsfassungen und die neu berechnete Review-Queue. Danach werden Plan und Draft gespeichert, ein v3-Export zweimal importiert und Event-Eindeutigkeit sowie Verlustfreiheit geprüft.

## Lizenz / Offline / Bundle
Eigener Code (MIT-Note der Plattform); IndexedDB nativ offline; kein Bundle.

## Wartungszustand / Aufwand / Rückbau
Browser-API, wartungsfrei; Aufwand mittel (Migrationslogik + Export/Import + Reset je Woche/Übung). Rückbau: Store entfernen → Plattform fällt auf localStorage der alten Roadmap zurück; Export-Dateien bleiben nutzbar.

## Sicherheits- und Datenschutznotiz
Alles bleibt standardmäßig lokal. Secrets gehören nicht in Client, Worker, Export oder Draft. Eine angezeigte Lösung disqualifiziert nur ihre `instanceId`; ein neuer Seed oder expliziter Zyklus kann frische Evidence liefern. Lokale Reports und Exporte sind Selbstlern-Nachweise, keine fremdverifizierten Zertifikate.
