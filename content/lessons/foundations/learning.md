# Fehlerjournal als Handlungsverkürzer nutzen

Ein Fehlerjournal ist kein Archiv für rote Meldungen. Es soll die nächste überprüfbare Handlung verkürzen. Diese Lektion zeigt dir das Format, das aus einem Fehler einen nächsten Schritt macht, und wie Hilfe auf dieser Plattform zählt.

## Das Bild dahinter: die Nachbesprechung

Das Journal ist die Nachbesprechung nach einem Training, keine Trophäensammlung. Ein guter Trainer fragt drei Dinge: Was genau ist passiert (Beobachtung), welche Ursache steckt dahinter (Hypothese), welche Übung prüft das als Nächstes. Dieselbe Trennung macht einen Eintrag nützlich: „Python funktioniert nicht“ ist keine Beobachtung; „bei der zweiten Zeile mit `id=a1` bleibt `seen` leer“ ist eine.

Wo der Vergleich hinkt: Ein Trainer sieht dich von außen. Im Journal musst du dir selbst die genaue Beobachtung abringen, und das ist die eigentliche Arbeit.

## Vier Felder

Ein **Fehlerjournal** trägt pro Fehler vier Felder:

1. **Beobachtung:** Was ist konkret passiert? Beispiel: `test_duplicate_ids` erwartet einen Eintrag, erhält aber eine leere Liste.
2. **Kleinste Reproduktion:** Welche Eingabe löst den Fehler zuverlässig aus?
3. **Ursachenhypothese:** Welche Regel im Code erklärt die Beobachtung?
4. **Nächster Test:** Welche einzelne Änderung oder Prüfung kann die Hypothese widerlegen?

Die Reihenfolge zählt: vom Symptom zum geplanten **Abruf**, nicht umgekehrt.

## Hilfe verändert den Nachweis

Als **Nachweis** zählt auf dieser Plattform nur, was du selbst abgerufen hast. Höchstens ein Hinweis ist erlaubt. Eine angezeigte Teillösung zählt, als hättest du alle Hinweise genutzt. Eine Komplettlösung disqualifiziert nur diese Instanz; eine frische Instanz kann den Nachweis später liefern. Ein Nachweis gilt nur eine Zeit lang; danach wird die Aufgabe zur Wiederholung fällig.

## Review statt Streak

Wiederhole nicht, weil eine Zahl täglich steigen soll. Die **Wiederholung im Abstand** (englisch *spaced repetition*) ist hier eine einstellbare Arbeitshypothese: Die Intervalle sollen den Nachweis auffrischen, bevor er verblasst. Wiederhole, wenn ein Eintrag fällig wird oder ein Fehlerbild erneut geprüft werden muss.

## Wo dir das in der KI begegnet

Ein Modell lernt nur aus seinem Fehlersignal, dem Verlust. Dein Journal ist dein eigenes Fehlersignal. Wo der Vergleich hinkt: Das Modell bekommt den [Gradienten](#/glossary/gradient) geliefert; du musst die Ursache deines Fehlers selbst benennen.

## Lernentscheidung

Am Ende einer Sitzung reicht eine kurze Entscheidung:

- Was kann ich jetzt ohne Vorlage?
- Wo brauchte ich Hilfe?
- Welche frische Aufgabe prüft genau diese Lücke?

## Typische Fehler

- Das Symptom mit der Ursache verwechseln. „Der [Test](#/glossary/test) ist rot“ ist die Beobachtung, nicht die Ursache.
- Eine Hypothese notieren, die kein nächster Test widerlegen kann.
- Sich die Lösung zeigen lassen und den Versuch als Nachweis zählen.
- Wiederholen nach Streak statt nach Fälligkeit.
- Das Journal als Schuldbuch führen statt als Plan für den nächsten Abruf.

## Kurzer Abruf

Nimm einen realen Fehler aus deiner letzten Aufgabe. Schreibe die vier Felder in höchstens sechs Sätzen. Der nächste Test muss so konkret sein, dass du danach „Hypothese verworfen“ oder „Hypothese gestützt“ sagen kannst.

## Begriffe auf einen Blick

- **Fehlerjournal** (englisch *error journal*): Sammlung von Einträgen aus Beobachtung, kleinster Reproduktion, Ursachenhypothese und nächstem Test.
- **Beobachtung** (englisch *observation*): das konkret Gesehene, zum Beispiel ein erwarteter und ein tatsächlicher Wert.
- **Kleinste Reproduktion** (englisch *minimal reproduction*): die kleinste Eingabe, die einen Fehler noch zuverlässig auslöst.
- **Ursachenhypothese** (englisch *root cause hypothesis*): prüfbare Vermutung, welche Regel im Code die Beobachtung erklärt.
- **Nachweis** (englisch *evidence*): Bearbeitung, die zeigt, dass du den Schritt selbst abrufen konntest; zeitlich befristet.
- **Abruf** (englisch *retrieval*): Wissen ohne Vorlage aus dem Gedächtnis holen; stärker als Wiedererkennen.
- **Wiederholung im Abstand** (englisch *spaced repetition*): fällige Einträge in wachsenden Abständen erneut abrufen.
