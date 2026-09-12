# Fehleranalyse nach Teilgruppen und Modellkarten

Eine einzige Gesamtmetrik ist ein Durchschnitt — und Durchschnitte verstecken Teilgruppen. Die systematische Fehleranalyse beginnt deshalb immer mit der Frage: *Für wen* trifft das Modell nicht?

## Fehlerraten je Teilgruppe

Durchgerechnetes Beispiel: Ein Defekt-Klassifikator wird auf 100 Beispiele ausgewertet.

| Gruppe | Beispiele | Fehler | Fehlerrate |
|---|---|---|---|
| A (Standardwerkzeuge) | 50 | 4 | $8\,\%$ |
| B (Spezialwerkzeuge) | 20 | 6 | $30\,\%$ |
| C (Neue Werkzeuge) | 30 | 3 | $10\,\%$ |

Insgesamt 13 Fehler auf 100 Beispiele — „87 % Accuracy“. Die **Subgruppen-Lücke** ist die Differenz zwischen höchster und niedrigster Fehlerrate:

$$
30\,\% - 8\,\% = 22\ \text{Prozentpunkte}.
$$

Die Gesamtmetrik hätte verschwiegen, dass Spezialwerkzeuge fast jedes dritte Mal falsch eingestuft werden.

## Fehlertypen unterscheiden

- **Label-Noise**: Ein Teil der Labels ist zufällig falsch. Erkennungszeichen: Auch menschliche Kennzeichner widersprechen sich auf denselben Beispielen; die Fehler streuen über alle Gruppen.
- **Systematischer Subgruppenfehler**: Eine Teilgruppe wird dauerhaft schlechter bedient. Erkennungszeichen: Die Fehlerrate einer Gruppe bleibt über Zeit und Modellvarianten hoch — wie Gruppe B oben.
- **Drift**: Die Verteilung der Daten verschiebt sich zwischen Training und Einsatz. Erkennungszeichen: Früher gut, jetzt schlecht, ohne Codeänderung; Eingabestatistiken haben sich verschoben.

Die drei Typen verlangen verschiedene Maßnahmen: Labels nachqualitätieren, Daten der Gruppe ergänzen oder das Modell auf aktuellen Daten neu bewerten und trainieren.

## Modellkarte

Eine **Modellkarte** (Model Cards, Mitchell et al. 2019) dokumentiert ein Modell in festen Abschnitten:

- **Intended use**: Wofür ist das Modell gebaut, in welchem Einsatzkontext?
- **Metriken pro Gruppe**: nicht nur der Gesamtwert, sondern die Aufschlüsselung — die 8/30/10-Prozent-Tabelle gehört hierher.
- **Grenzen (known limitations)**: Die schwächste Teilgruppe wird namentlich genannt, zusammen mit der Bedingung, unter der das Modell nicht eingesetzt werden soll.

Für das Beispiel: „Bekannte Grenze: Spezialwerkzeuge (Fehlerrate 30 %). Einsatz nur nach manueller Prüfung.“

## Kommunikation ohne Overclaims

Die Zahl heißt so viel wie ihr Kontext. Ehrliche Formulierungen:

- „87 % Accuracy insgesamt, aber 30 % Fehlerrate bei Spezialwerkzeugen (20 Beispiele).“
- Statt „Das Modell erkennt Defekte zuverlässig“: „Auf den Pilotdaten …, Gültigkeit für andere Werke nicht geprüft.“

Klein n wird genannt, Einsatzgrenzen werden nicht kleingeredet, und die schwächste Gruppe steht im Bericht — nicht in der Fußnote.

## Typische Fehler

- Nur die Gesamtmetrik berichten und Subgruppen-Lücken unter den Tisch fallen lassen.
- Drift als Label-Noise fehldeuten („die Daten sind halt schlecht“) und Nachqualifizierung statt Neubewertung starten.
- Die Modellkarte als Marketingtext schreiben statt als Nutzungsgrenze.
- Aus einer kleinen Stichprobe (drei Fehler auf fünf Beispiele) weitreichende Aussagen ableiten.
- Overclaims: „zuverlässig“, „robust“, „bewiesen“ ohne Messkontext.

## Direkter Check

Berechne in einer Einstiegsaufgabe eine Subgruppen-Lücke in Prozentpunkten. Klassifiziere den Fehlertyp in der [Kernaufgabe](#/family/classify-error-drift/accuracy-drop-without-code-change/0/core). In der [Kernaufgabe](#/family/aggregate-grouped-metrics-report/subgroup-error-rates-numpy/0/core) implementierst du subgroup_error_rates und largest_gap; die [Vertiefungsaufgabe](#/family/aggregate-grouped-metrics-report/categorize-errors-report/0/stretch) verlangt die Fehlerkategorisierung plus Modellkarten-Stub.
