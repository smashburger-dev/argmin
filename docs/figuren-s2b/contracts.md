# Gemeinsame Figurenverträge S2b

Basis: `1e017b749f0269ae738c967602225764b28f2688`, Integration Welle 2. Die APIs dieser Session werden erst über einen vom Integrator geprüften Integrationscommit zur Familienbasis. Kein privater Runtime-Fork und kein automatisches Übernehmen von `feature/figuren-s2b`.

## Zahlenfeld, Vertrag 1

`kind: explore` verwendet das vorhandene `explore: {parameter,min,max,step,input:'number'}`. Optionales `label` bezeichnet die fachliche Größe. Der bestehende F7-Verbraucher `eta` bekommt ohne Quellenänderung „Lernrate η“. Neue Verbraucher liefern `label` ausdrücklich.

„Übernehmen“ oder Enter übernimmt nur endliche Werte im abgeschlossenen Bereich und im Schrittraster ab `min`. Erst danach laufen `scene.validateParams` und `scene.model`. Ungültige Eingaben behalten Bild, Modell, Antwort und Urteil; ein deutsches Fehlerfeedback erscheint. Ein gültiger Wechsel startet bei Schritt 0 mit der Szenenkamera ohne Orbit-Offset. Eingabe und Urteil einer Vorhersage bleiben je vollständigem Parametersatz getrennt und beim Wiederbesuch erhalten. Diese Antworten leben nur in der gemounteten Karte. Die zuletzt übernommenen Parameter und der Beat liegen in sessionStorage; sie sind keine Attempts und kein IndexedDB-Fortschritt. Reload validiert gespeicherte Eingaben erneut.

Der Compiler prüft Grenzen, Ausgangswert und jedes angebotene Schrittraster-Modell, höchstens 1000 Werte. Dabei gelten Parameter-, Vorhersage-, Zahlen- und Auswahlverträge für jedes Modell. Freie Python-Programme folgen daraus nicht.

## Vergleich, Vertrag 1

`compare.a/b` sind Parameter-Overrides auf `params`. Optional: `labels: {a,b}` und `beat` als ID eines gemeinsamen, fertig aufgebauten Vergleichszustands. Neue Verbraucher liefern beide Bezeichnungen und die Beat-ID ausdrücklich. Für den bereits veröffentlichten F7-Verbraucher gelten A=Ridge, B=Lasso und der zweite verfasste Schritt `step-1`. Phase 0 ist kein regularisierter Vergleich. Beide Varianten durchlaufen unverändert `validateParams`, `model`, `pose`, `build`, Painter und Tiefensortierung.

Der Umschalter zeigt eine große Bühne auch mobil. A/B-Schaltflächen sind per Tab und Enter/Leertaste erreichbar, `aria-pressed` benennt die aktive Variante. Ein Wechsel setzt Pose auf das Ende des Vergleichsschritts und Kamera/Orbit zurück; die normale Schrittnavigation bleibt erhalten. „Von vorn“ zeigt wieder den Anfang der aktiven Variante. Der Vergleichsschritt ist kein Aufgabenurteil.

Der Compiler weist unbekannte oder vertauschte Beat-IDs, ungültige Parametersätze, abweichende Vorhersagen und unterschiedliche Szenenkameras bei 309², 343² und 720×540 zurück. Kameras brauchen endliche Winkel, einen endlichen dreidimensionalen Zielpunkt und positiven Zoom. Die Szene muss für A/B dieselben Datenachsen, Einheiten, Grenzen und Projektion liefern. Identische Kamera allein beweist identische Datenachsen nicht. Diese Eigenschaft wird am konkreten Verbraucher fachlich und im Bild geprüft. Bei Modellwechsel werden alte SVG-Items entfernt; Observer, rAF, Theme-/Druck-/Motion-Listener gehören weiterhin genau einer Engine. Das gilt auch, wenn mehrere Parametersätze dieselbe memoisierte Modellreferenz zurückgeben. Druck zeigt den aktiven regularisierten Vergleich, danach wird der vorherige Schritt wiederhergestellt.

F7-Folgeauftrag an den Szenenbesitzer: Der Titel von `rubber-band-coefficients.items` lautet bei Phase 1 derzeit für beide Verfahren „Ridge → Lasso“. `values` und `readout` berechnen bereits das richtige aktive Verfahren. Den Titel aus `method` und Phase ableiten. Die gemeinsame Beschriftung und zugängliche Zustandsbeschreibung verwenden bereits den methodenneutralen Vergleichssatz und den aktuellen Readout. S2b verändert diese Familienszene nicht.

## Direkte Auswahl, Vertrag 1

Eine reine Szene darf `selectionTargets(model, beatIndex)` exportieren. Rückgabe ist eine Liste von `{id,itemId,primKey?,label,description}`. IDs sind pro Zustand eindeutig; Strings sind nicht leer. `itemId` verweist auf ein sichtbares Build-Item, `primKey` optional auf dessen sichtbares Ebenenprimitiv. Der Compiler prüft jede Endpose. Ziele müssen auch während der angebotenen Interaktion sichtbar und eindeutig bleiben; Familien prüfen ihre Zwischenzustände. Ziele überlappen sich nicht. Keine DOM-Knoten, Callbacks, Koordinaten aus dem DOM, Antworterwartungen oder Graderfunktionen in diesen Daten.

Die gemeinsame Runtime versieht Ebenenprimitive mit `data-prim`. Klick/Tippen am Ziel und die native Schaltfläche mit demselben Label aktivieren dieselbe ID. Tastaturäquivalent: Tab zum benannten Ziel, Enter oder Leertaste. Aktivierung markiert den Gegenstand durch einen Umriss, Text durch Fettschrift und Unterstreichung, setzt `aria-pressed` und liest `description` über `role=status` vor. Farbe allein trägt die Auswahl nicht. Bühnen-Pfeiltasten behalten ihre bisherige Bedeutung. Auswahl wird bei Beat-, Modell- oder Moduswechsel verworfen, auch bei memoisierten Ziellisten; reine Auswahl verändert weder Modell noch Attempt. Eine Drehgeste aktiviert kein Auswahlziel. Touch-Ziele der Familiengeometrie brauchen 44 px; die ergänzenden Schaltflächen haben mindestens 44 px. Vertikales Scrollen und Textauswahl außerhalb der Bühne bleiben erhalten.

Dieser Vertrag ist zunächst ausschließlich für Lektionsfiguren verfügbar. Hinweise geben keine Auswahlziele aus. `tag-after-line`, Zellaufgaben und andere bewertete Auswahlaufgaben benötigen separat zugewiesene Antwort-/Graderverträge. S4as versionierte Antworthülle wird hier nicht erweitert.

### Übergabe an S6b und F1

S6b ergänzt nach Integration `selectionTargets` an eigenen F2-Szenen, mit semantischen IDs wie `cell:weights:1:2` und sprechenden Labels „Gewicht, Zeile 2, Spalte 3“. Indizes in IDs sind nullbasiert; Labels nennen die für Lernende dargestellten Indizes. Ein Matrixblock statt einzelner Zellen ist erlaubt, wenn sonst 44-px-Ziele oder lesbare Labels fehlen. Zellwert, Einheit und Zustand stehen modellbasiert in `description`. Die Szene benennt Item und Primitiv exakt und verhindert verdeckte Ziele. S2b liefert keine F2-Lektionsintegration und keinen Masken-/layer-chain-Grader.

F1 verwendet IDs wie `binding:<frameId>:x` und `object:<normalizedId>`. Zwei Aliasnamen bleiben zwei Ziele mit derselben in der Beschreibung genannten Objektmarke. Rückgabe und Ausgabe bekommen getrennte Ziele. Angaben beziehen sich ausschließlich auf den sichtbaren Zustand. Die sechs festen Programme und die zentrale Trace-Expansion bleiben unverändert. Die gemeinsame Bedienung wird an vorhandenen Szenen mit temporären Metadaten-Adaptern gesichtet; diese Adapter sind keine Familienimplementierung.

## Datenvertrag für freie Spuren und dauerhaften CPython-Abgleich

Dies sind verbindliche Anforderungen für einen Folgeauftrag, keine neue implementierte Suite oder Freigabe freier Programme. Ein versionierter Datensatz `python-trace/v1` muss mindestens liefern:

- `programId`, UTF-8-Quelltext mit LF-Zeilenenden und SHA-256, CPython-Version, Programmpfad-ID, feste Eingaben und deren deklarierte Python-Typen; keine Hostpfade als Identität.
- Einen Eingaberaum mit erlaubten Typen, Wertebereichen, Längen-/Verschachtelungsgrenzen, deterministischer Seed-/Parameterableitung sowie Grenzen für Schritte, Aufrufe, Ausgabe und Laufzeit. Zufall, Zeit, Dateisystem und Netzwerk sind entweder ausgeschlossen oder als kontrollierte Eingaben definiert. Unbekannte Typen oder Grenzüberschreitungen werden abgewiesen.
- Eindeutige `frameId`, `parentFrameId`, Funktionsname und Ereignisordinal. Funktionsname allein unterscheidet Rekursion und wiederholte Aufrufe nicht. Bindungsnamen sind über Frame-ID qualifiziert.
- Die bestehenden Ereignisse `start`, `line`, `call`, `return`, `exception` mit gültigen Zeilen und vollständigen sichtbaren Zuständen. `start` hat Zeile 0. Ein `line`-Zustand beschreibt die ausgeführte Zeile nach ihrer Ausführung; der CPython-Aufnehmer schließt sie am nächsten Ereignis ab. Call-Argumente werden beim Eintritt, Return vor dem Verlassen festgehalten. Definitionsschritte oder doppelte Meldungen werden nur nach ausdrücklich versionierter Normalisierungsregel entfernt.
- Pro Zustand Bindungen und Objekte mit Typ und kanonischer Repräsentation. Eine Objektmarke bleibt über alle Zustände derselben Ausführung stabil; neue Identitäten werden nach erster Beobachtung vergeben. Verglichen werden Aliasrelationen und Lebensdauer, keine Prozessadressen und keine aus Wertgleichheit erfundene Identität. Interne CPython-Internierung wird nur dann Teil des Lehrvertrags, wenn das konkrete Beispiel dies beabsichtigt und die Version feststeht.
- Rückgaben referenzieren ein vorhandenes Ergebnisobjekt, einschließlich `None`; `print` verändert ausschließlich die akkumulierte Ausgabe. Ein Exception-Ereignis enthält Typ, auslösende Zeile und Frame. Behandelte Ausnahme, normales Return und `return None` beim Unwinding werden durch die normalisierte Ereignisfolge auseinandergehalten. Unerreichte Zeilen erzeugen keine Zustände.

Validierung vor Geometrie: Schema und Version, Quellhash und Eingaben, zulässiger Ereignisablauf/Frame-Stack, geschlossene Objektverweise, stabile Identitäten und Aliasrelationen, exakte Ausgabe einschließlich Leerzeichen/Zeilenumbrüchen, Rückgabewert und Ausnahme. Danach kompletter Ereignisabgleich gegen tatsächliches CPython und die vorhandenen passenden Familienlöser. Numerische Toleranzen müssen pro Datentyp ausdrücklich definiert sein; bool, int, float und str sind nicht austauschbar. Unbekannte oder nur teilweise vergleichbare Aufzeichnungen werden abgewiesen. Der vorhandene Compiler erzeugt weiterhin gewöhnliche Beat-Arrays, keine zweite Expansion im Browser.

## Sicheres Hinweispräfix

Ein späterer Fallvertrag `trace-hint-prefix/v1` benötigt vor Registrierung: Familien-/Fall-ID und Version, Quelle `case` oder `neighbor`, Zielereignis einschließlich Frame/Ordinal und Ziellinie, gesuchte Namen/Objektattribute/Werte/Klassifikation, expliziten letzten erlaubten Zustand und die Bedeutung des Schnittpunkts. „Vor Zeile n“ allein genügt bei Schleifen/Aufrufen nicht.

Ein Präfix endet vor dem Ereignis, das die gesuchte Information erzeugt. Für jeden Fall werden erlaubte Bindungen, Objekte und Attribute, Ausgabepräfix, Codezeilen und sichtbare Beschriftungen positiv aufgezählt. Das Render-Modell wird aus dieser freigegebenen Projektion neu gebaut. Spätere Daten bleiben auch aus Geometrie, Objektzahl/-position/-größe, Verbindungen, unsichtbaren SVG-Items, Beschreibungen, Auswahlmetadaten, Drucktext, Fehlermeldungen und geladenen Hint-Parametern entfernt. Nachbarbeispiele haben einen festen, unabhängig berechneten Datensatz und verraten die Antwort der Instanz ebenfalls nicht.

Der Compiler muss die positive Datenprojektion und die bestehende numerische Lecksperre für alle freigegebenen Fälle/Seeds und Anfang, Zwischen- und Endpose prüfen; Ausnahmeklassifikationen und Strukturantworten brauchen zusätzlich eine ausdrückliche nichtnumerische Leckregel. Ein rein textueller Zahlenfilter genügt nicht. Fehlender Fall, unbekannte Version oder unvollständige Datenprojektion bedeutet Ablehnung. Bis diese Regeln als gesonderter Auftrag umgesetzt und geprüft sind, bleiben die sechs F1-Hinweise und freie Spuren gesperrt; kein neuer Eintrag in `figure-hints.json`.

## Weitere offene Zuweisungen

`pick-learning-rate`, `tag-after-line`, Kurzschluss-Familienfall, layer-chain und Maskenaufgaben brauchen jeweils Besitzer, versionierte Aufgabeneingaben, Antwortform im bestehenden Attempt-Vertrag, deterministischen Referenzlöser/Grader und Import-/Exportbehandlung. Eine Liste offener Wünsche registriert keine Aufgabenfamilie.

Canvas ist kein Bestandteil dieser API. Die veröffentlichte F7-Fläche hat 64 Kacheln und bereits begründete SVG-Messwerte. Ein weiterer Renderer braucht einen gemessenen konkreten Bedarf sowie einen Vertrag für CSS-Größe/DPR, Projektion/Kamera, Theme, Reduced Motion, Forced Colors, Druck, Observer/rAF-Aufräumen und Viewport-Pause. Die isolierten 400-Kachel-Werte ersetzen diesen Lifecycle nicht.
