# Changelog

## 0.8.7 — 2026-09-24

Ergebnis-Anzeige verschlankt, Varianten und Mathe-Darstellung repariert.

Für Lernende: **Das Urteil nach „Antwort prüfen“ ist jetzt schlicht eine farbige Zeile** — grün bei richtig, rot bei falsch, mit feiner Kontur und optisch zentriertem Text. Die graue Kartenbox um das Ergebnis fällt weg, ebenso die Zeile „Fehlertyp: …“ unter dem Urteil: Der Fehlertyp war ein technischer Vermerk, der im Lernkontext nur störte. Er wird weiterhin mit jedem Versuch gespeichert — er steht im Fortschritts-Journal und hilft bei Fehlermeldungen, nur eben nicht mehr im sichtbaren Feedback. Gilt für alle Aufgabenarten (Auswahl, Zahlen, Trace-Tabellen, Python, Kontrollpunkte in Lektionen).

**„Nächste Variante“ liefert jetzt wirklich andere Aufgaben.** Bei Konzeptfragen mit hinterlegten Varianten (z. B. die Potenzgesetz-Diagnose) zeigte jeder Seed denselben Fall — die Variantenauflösung lief an den statischen Auswahl-Familien vorbei. Jetzt wechseln Aufgabenstellung und Antwortmenge mit dem Seed; die Auswertung bleibt deterministisch und ID-basiert. Zusätzlich rotiert die Reihenfolge der Antwortoptionen statischer Fälle mit dem Seed.

**Mathematische Formeln werden überall gesetzt.** Formeln in Aufgabentext, Antwortoptionen, Lösung und Hinweisen laufen durch KaTeX; Hinweise mit Formeln erschienen zuvor als Rohtext mit sichtbaren `$`-Markierungen. Die Konzeptfrage zur Potenzgesetz-Diagnose nutzt Formelsatz ($2^3 \cdot 2^4$ statt Code-Ticks), und einzelne Stellen mit ungesetzter Notation (z. B. `e^{z}` in einer Lösung) sind bereinigt.

## 0.8.6 — 2026-09-22

Ehrlichkeits- und Robustheits-Release: zwölf verifizierte Bugs gefixt, acht spürbare Verbesserungen.

Neu für Lernende: **Python-Aufgaben erklären sich jetzt selbst.** Statt nur „Der Code lief nicht fehlerfrei" zeigt das Feedback die echten Testergebnisse (welcher Test scheiterte und warum), Ausgaben und die technische Fehlermeldung — aufgeklappt, damit lange Tracebacks nichts zerreißen. Bei Python-Aufgaben gibt es außerdem „Nur ausführen": Code ausprobieren ohne Bewertung — der Lauf zählt nicht als Versuch.

**Hinweise sind jetzt ehrlich.** Vor dem Klick steht da, wenn ein Hinweis den Kompetenzbeleg kostet; Buttons ohne verfügbaren Hinweis tauchen gar nicht erst auf (vorher: stiller toter Klick). Und wer die Lösung schon einmal angesehen hat — auch in einer früheren Sitzung — bekommt nicht mehr fälschlich „Kann als Kompetenzbeleg zählen" versprochen.

**Die Challenge-Serie zählt nur noch echte Tages-Siege:** gelöste Aufgaben aus dem jeweiligen Tages-Set, nicht mehr jeder Versuch mit Challenge-Kennzeichen. Der Tag wechselt um lokale Mitternacht statt mitten in der Nacht nach Weltzeit.

**Zwei Tabs bleiben synchron** — Fortschritt, den du in einem Fenster machst, erscheint sofort im anderen, ohne Neu laden.

**Suche** (in der Navigation): findet Kompetenzen, Lektionen, Aufgaben, Module und Projekte — überall aus dem Katalog, lokal im Browser.

**Offline-Paket** lädt jetzt schon beim ersten Besuch zuverlässig (vorher kam „bitte neu laden"); dazu eine Statuszeile, die Speicherbelegung und dauerhafte Sicherung ehrlich anzeigt. Die Review-Warteschlange zeigt an, wenn mehr fällig ist als das Wochenbudget vorsieht, und mischt die Reihenfolge tagesdeterministisch über Kompetenzen statt strikt nach Fälligkeit.

Für Beitragende: `RUNTIME_CACHE` ist jetzt versioniert (`argmin-runtime-<pyodideVersion>`) — ein Vendor-Bump serviert die alte Laufzeit nicht mehr endlos cache-first; `activate()` räumt alte Runtime-Caches mit auf. Der Precache fällt von 836 auf 349 Dateien: nur noch, was der Offline-Start wirklich anfragt (`catalog.json`, die zwei Worker-Module, Bundles) — rohe Content-Bäume und Repo-Sources bleiben im Release, aber nicht im Install-Set; das Offline-Manifest umfasst weiterhin alles. Der Prefetch schreibt direkt über die Cache-API mit cache-bustetem Manifest (ein offener Tab mit altem Service Worker kann so nicht in einen Cache schreiben, den der neue beim Aktivieren löscht) und lädt parallel. `familyMaxHints(instance)` liefert die ehrliche Hinweis-Obergrenze; `familyHint` fällt bei kontext-unbrauchbaren Eingaben auf den neutralen Hinweis zurück statt auf `null`; der Distraktor-Fallback nennt nur noch eine falsche Option, wenn danach mindestens eine weitere unbekannt bleibt (bei zwei Optionen war die Elimination die ganze Lösung). Cross-Tab-Sync läuft über `BroadcastChannel` aus `core/progress_notify.mjs` — konstruktions-guarded, damit ein verbotener Channel nie einen committeten Write fehlschlagen lässt. `challengeStreakDays` prüft Tages-Set-Membership + `revealedSolution` (gleiche Prädikate wie `solvedChallengeCount`). Fehlerkanten: synthetische Grader-Results tragen jetzt `ok: false`; Assistenz-Events sind best-effort statt unhandled rejection; der tote `#/lab/`-Link zeigt auf die echte Familien-Route.

## 0.8.5 — 2026-09-22

Mobile aufgeräumt und Speicher freigebbar.

Neu für Lernende: **Der Speicher lässt sich zurückholen.** In den Einstellungen entfernt „Paket entfernen“ das Offline-Paket — die Python-Laufzeit und alle gecachten Dateien, rund 16–20 MB je nach Stand. Die Statusmeldung nennt die freigegebene Größe. Danach brauchen neue Inhalte wieder Netz; die Laufzeit lädt sich beim nächsten Python-Einsatz oder erneut über „Offline-Paket laden“. Lernfortschritt bleibt unangetastet — der liegt in einer eigenen Datenbank, nicht im Paket-Cache.

Auf dem Handy ist die **untere Leiste mit den Bereichen weg** — das Menü oben links (jetzt mit demselben Seitenleisten-Symbol wie am Rechner) öffnet die komplette Navigation, die fixierte Leiste war damit doppelt. Die Katalog-Versionsnummer steht nicht mehr in der Kopfzeile; sie bleibt am Fuß der Navigation und im Menü.

Für Beitragende: `.main-nav` wird unter 920 px schlicht ausgeblendet statt zur Bottom-Bar umgebaut — die Regeln für die fixierte Leiste und ihre Link-Verdichtung sind entfernt. Der Rundgang-Schritt „Alles in Reichweite“ verweist auf kleinen Bildschirmen aufs Menü; fällt das Navigations-Ziel weg, zentriert die Tour-Karte wie vorgesehen. Der Entfernen-Button löscht alle `argmin-*` Caches (versionierter Build-Cache + `argmin-runtime`), ohne den Service Worker abzumelden — danach füllt der Write-Through nur noch, was tatsächlich abgerufen wird.

## 0.8.1 — 2026-09-21

Wartungs-Release — für Lernende ändert sich nichts Sichtbares, die Fundamente sind aber sauberer und ehrlicher dokumentiert.

Unter der Haube: Ein systematischer Audit hat alle ~4.300 Code-Kommentare gegen die Implementierung geprüft und ~70 falsche oder überholte Behauptungen korrigiert — falsche Seed-Zählungen, Modulverweise auf nicht existierende Dateien, veraltete Zahlen und leere Abschnitts-Header. Dabei sind zwei latente Fehler aufgefallen und behoben: Ein Timing-Werkzeug maß die Fehlerseite statt einer echten Aufgabe, und zwei „keine Ziffern"-Filter filterten nichts (falsch escaptes Regex). Ein Test, der Determinanten zirkulär gegen die Produktfunktion prüfte, prüft jetzt gegen einen unabhängigen Solver.

Für Beitragende: Geteilte Python-Test-Helfer leben jetzt zentral in `assets/js/core/procedural/py_test_kit.mjs` — Serializer (`pyLit`), Vektor-/Matrix-Emitter, `refCopy`, `pyStrList`. ~90 Zeilen toter Test-Code und ~15 duplizierte Hilfsfunktionen sind entfernt, der Release-Build vergleicht echte Dateimengen statt nur Anzahlen, und der Worker-Arbeitsbereich liegt unter `/home/argmin/` statt eines Tippfehler-Pfads. Wer eine neue Aufgabenfamilie anlegt, importiert die Emitter aus dem Kit statt sie zu kopieren.

## 0.8.0 — 2026-09-21

Neu für Lernende: **argmin läuft offline.** Nach dem ersten Laden funktioniert die komplette App ohne Internet — Lektionen, Aufgaben, Prüfung, Fortschritt. Wer Python-Aufgaben unterwegs ohne Netz lösen will, holt sich in den Einstellungen über „Offline-Paket laden" die Laufzeit vorab aufs Gerät.

Dazu besseres **Orientieren auf dem Handy**: Ein Menü oben links öffnet die komplette Navigation samt Verlauf — die Module, an denen du arbeitest, und die zuletzt bearbeiteten Aufgaben. Ein Akzent-Punkt zeigt, in welchem Zweig du gerade bist. Das Logo sitzt mittig in der Kopfzeile, unten bleibt Platz für die fünf Bereiche. In der Seitenleiste am Rechner siehst du denselben Verlauf jetzt als Unterzweig unter dem Modul.

Aufgaben sind **klarer gestellt**: Potenzen und Logarithmen kommen sauber gesetzt statt als Rohtext, und bei „auf eine Potenz bringen" steht ausdrücklich dabei, dass nur der Exponent gefragt ist. Der Aufgabentitel in der Kopfzeile nennt den Typ; Krümelpfad und Verlauf zeigen die konkrete Aufgabe — und „Nächste Aufgabe" verrät jetzt, was wirklich dran ist.

**Schneller und ehrlicher:** Terme vereinfachen wird in Millisekunden geprüft statt erst die Python-Laufzeit zu starten. Und kann die Laufzeit wirklich einmal nicht laden (wackeliges Netz), meldet die Aufgabe das ehrlich als Ladeproblem — statt endlos zu drehen oder fälschlich „falsch" zu sagen.

Unter der Haube: Ein Service Worker legt den kompletten Build in einem versionierten Zwischenspeicher ab — App-Gerüst, alle Lektionen und Aufgaben inklusive. Die Python-Laufzeit liegt in einem separaten, stabilen Zwischenspeicher, der Aktualisierungen übersteht; beim Installieren wird netzfrisch geladen, damit keine Mischung aus altem und neuem Stand entsteht. SymPy und mpmath sind entfernt (−4,6 MB): Die Term-Äquivalenz läuft über die bestehende JS-Stützstellenprüfung — 13 deterministische Auswertungen mit dokumentierter numerischer Garantie statt symbolischem CAS. Eingaben wie `2x`, `x(x+1)` oder `**` werden vor der Prüfung normalisiert, genau wie die Mathe-Tastatur sie liefert. Der Code-Editor lädt erst, wenn eine Python-Aufgabe ihn braucht — die Aufgabenansicht ist dadurch ~150 KB (gzip) leichter; lädt er nicht, übernimmt ein einfaches Textfeld. Und das vendored Python-Verzeichnis trägt nur noch Dateien, die auch ausgeliefert werden.

## 0.7.0 — 2026-09-12

Neu für Lernende: die **tägliche Challenge** unter `#/challenge` — ein pro Tag deterministisch gezogenes Set schwerer Aufgaben aus den Modulen, mit denen du schon arbeitest. Fälle wiederholen sich nicht innerhalb des Fensters, gelöste Challenges zählen eine Serie in Tagen, und auf der Heute-Seite zeigt eine Karte den Tages-Stand. Challenges markieren sich im Fortschritt als eigener Kontext, und nach dem Lösen geht es direkt zur nächsten Challenge statt zurück ins Modul. Der Rundgang hat einen neunten Schritt für die Challenge bekommen.

Unter der Haube: Challenge-Fälle werden im Katalog mit `challengeEligible` markiert und müssen einen verschärften Vertrag erfüllen (mindestens zwei Hinweise, ausführliche Musterlösung, typabhängige Mindestanforderungen). Der Rundgang und die Heute-Kachel laden den Aufgaben-Code weiter erst bei Bedarf — kein Startup-Aufwand. Dazu ein neuer sechsstufiger Lückentext-Fall fürs Ausmultiplizieren zweier Produkte.

## 0.6.5 — 2026-09-12

Drei neue Aufgabentypen: **Mehrfachauswahl** (mehrere richtige Antworten, alles-oder-nichts oder Teilpunkte), **Fehlerdiagnose** (du benennst die Fehlerursache im eigenen Text — formativ, fließt nicht in die Meisterschaft) und **Worked-Example-Fading** (Lücken in Musterlösungen, die von „nur Endergebnis" bis „alle Zwischenschritte" wachsen). Dazu schließt jetzt jede Visualisierung mit einer **Vorhersage-Aufgabe** ab: Slider-Werte vorgeben, Größe vorhersagen, deterministisch prüfen — mit deutschem Komma und typischen Fehlvorhersagen als erklärtem Feedback.

Unter der Haube: Alle 139 Aufgabenfamilien liegen als validierte JSON-Inhalte vor, Milestone-Anforderungen werden beim Bauen gegen den Katalog geprüft (der Build schlägt fehl, wenn eine Kompetenz geforderte Artefakte nicht liefert), und ein Audit hat Authoren-Material wiederbelebt, das nie bei Lernenden ankam — Hinweise, Fehlerregeln und typische Fehler werden jetzt angezeigt. Außerdem: ~10.000 Zeilen tote Varianten und überholte Metadaten entfernt, die Distinctness-Prüfung misst jetzt ehrlicher, und der LLM-Benchmark deckt alle neuen Typen ab. Prüfung und Referenzlösungen bleiben wie immer deterministisch.

## 0.5.0 — 2026-09-11

Neu für Lernende: ein Spotlight-Rundgang beim ersten Start, der die wichtigsten Bereiche der App zeigt — in den Einstellungen jederzeit wiederholbar. Unter der Haube weiter aufgeräumt: Die letzte parallele Generator-Schicht ist gefallen, statische Fall-Helfer leben jetzt an einer einzigen Stelle — weiterhin bei byte-identischen Aufgaben. Dazu: schnellere lokale E2E-Läufe.

## 0.4.0 — 2026-09-11

Unter der Haube deutlich schlanker: Die Aufgaben-Generatoren laufen jetzt über geteilte Kits statt über pro Familie kopierten Code, und die Aufgaben-Texte liegen als validierte Inhalts-Dateien unter `content/banks/` statt als Daten im Programmcode — fast 9.000 Zeilen Programmcode weniger bei byte-identischen Aufgaben. Seeds, Prompts, Prüfung und Referenzlösungen bleiben exakt gleich; ein Test-Korpus friert die Outputs aller Familien dauerhaft ein.

## 0.3.0 — 2026-09-11

Aufgaben werden nicht mehr aus einer festen Liste gewählt, sondern aus dem Seed gebaut. Jede Aufgabenfamilie zieht Zahlen, Texte und Reihenfolgen deterministisch neu — aus einer Schablone werden so tausende Varianten statt einem Dutzend. Gleicher Seed, gleiche Aufgabe. Prüfung und Referenzlösung bleiben wie immer deterministisch.

## 0.2.0 — 2026-09-08

Statische Aufgaben haben jetzt Varianten. Konzeptfragen, Coding, Ablauf nachvollziehen, Parsons und Vektor: mindestens zehn Instanzen pro Fall, gewählt über den Seed. Seed 0 bleibt die Basis. Gleicher Seed, gleiche Aufgabe.

## 0.1.0

Erste öffentliche Version: Katalog und Oberfläche im Browser, Fortschritt lokal, Prüfung ohne LLM.
