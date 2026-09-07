# Daten- und Modellkarten

Eine Datenkarte oder Modellkarte ist kein Marketingtext, sondern ein **Vertrag**: Wer das System weiterentwickelt oder bewertet, kann nachlesen, woraus es besteht, wofür es gedacht ist, wie es gemessen wird und wo seine Grenzen liegen. Wie jeder Vertrag ist sie nur so viel wert wie ihre Vollständigkeit und ihre Konsistenz.

## Pflichtfelder: der minimale Vertragsinhalt

Jede Karte dieser Lektion hat einen festen Pflichtfeldsatz. Für eine Datenkarte: name, zweck, herkunft, zeitraum, lizenz, n_beispiele, split_train, split_dev, bekannte_luecken, kontakt. Für eine Modellkarte: name, zweck, version, trainingsdaten, metrik, schwellenwert, bekannte_grenzen, kontakt.

Drei Regeln gelten für jedes Pflichtfeld:

1. **Vorhanden**: Ein Feld, das im Datensatz fehlt, ist ein Mangel — genauso wie eines, das ausdrücklich leer gelassen wurde („“ zählt nicht als ausgefüllt).
2. **Sagend**: „divers“ ist keine Herkunft; „öffentlich“ ist keine Lizenz. Der Wert muss nachvollziehbar machen, woher etwas kommt und unter welchen Bedingungen es genutzt werden darf.
3. **Ohne Geheimnisse**: In Karten stehen niemals API-Schlüssel, Token oder Bearer-Anmeldedaten. Ein Dokument, das zur Veröffentlichung gedacht ist, darf nichts enthalten, was Zugang gewährt.

Dazu kommen zwei Formalien: Versionsangaben folgen dem Semver-Muster X.Y.Z (drei durch Punkte getrennte Ziffernblöcke), und Split-Anteile müssen sich zu 1,0 addieren — 0,8 Training, 0,1 Entwicklung, 0,1 Test. Eine Kartenprüfung ist damit eine deterministische Übung: Feldabgleich, Summenprüfung, Musterprüfung. Kein Urteil, kein Sprachmodell.

## Konsistenz: Karten müssen zusammenpassen

Der zweite, oft übersehene Teil des Vertrags: Karten stehen nie allein. Datenkarte, Modellkarte, Systemkarte und Forschungsprotokoll beschreiben dasselbe System — und widersprechen sich manchmal. Typische Widersprüche:

- Die Modellkarte nennt andere Trainingsdaten als die Datenkarte den Datensatznamen.
- Die im Protokoll preregisterierte Metrik weicht von der Metrik in der Modellkarte ab.
- Die Systemkarte referenziert ein Modell, das die Modellkarte unter anderem Namen führt.
- Der Schwellenwert in der Modellkarte stimmt nicht mit dem der Systemkarte überein.
- Die Anzahl der Beispiele in der Datenkarte passt nicht zur Angabe im Protokoll.

Jeder dieser Widersprüche ist ein Gleichheitsvergleich zwischen zwei Feldern — trivial zu automatisieren und trotzdem entscheidend, weil ein Bericht über ein System nur so glaubwürdig ist wie die Übereinstimmung seiner eigenen Dokumente. Die Widerspruchsliste ist die Grundlage des Audits: Sie nennt, was zuerst zu reparieren ist, bevor irgendein Messwert zitiert wird.

## Worked Example am GenAI-Prototyp

Der RAG-Prototyp (deterministischer Stub-Generator, eingefrorene Fixtur-Queries, Injektions-Fixture, Ablation mit recall 0,6 unter Kontrolle gegen 0,8 ohne) hätte drei Karten:

- **Datenkarte**: name „faq-korpus“, zweck „Antwortvorschläge für Support-Fragen“, herkunft „Forum-Export, bereinigt“, zeitraum „Jahreswechsel“, lizenz „CC BY 4.0“, n_beispiele „1200“, split_train „0,8“, split_dev „0,1“, bekannte_luecken „Dokumente enthalten synthetische Injektions-Fixture; Umlaute uneinheitlich“, kontakt „team-support“.
- **Modellkarte**: name „rag-stub“, zweck „Antwortvorschlag“, version „1.2.0“, trainingsdaten „faq-korpus“ (muss mit der Datenkarte übereinstimmen!), metrik „recall@5“, schwellenwert „0,75“, bekannte_grenzen „kein echtes Sprachmodell — Formulierung erfolgt nicht neu, der Stub wählt Sätze aus den Dokumenten“, kontakt „team-support“.
- **Systemkarte**: modell „rag-stub“, metrik „recall@5“, schwelle „0,75“, kontrolle „Injektions-Detektor in Anfrage und Dokumentposition“.

Ein typischer Audit-Befund: Nach einem Update trägt die Systemkarte noch metrik „token-f1“, während Modellkarte und Protokoll recall@5 sagen — ein Widerspruch, der jeden Vergleich mit alten Läufen bricht. Und ein typischer Geheimnis-Fund: Im Feld zweck steht „api-schluessel: sk-beispiel12345678“ — das ist kein Zweck, sondern ein geleakter Token; das Muster-Scan-Verfahren (API-Schlüssel-Wörter, sk-/ghp-artige Token, Bearer-Präfixe) findet es deterministisch.

## Typische Fehlvorstellungen

- „Die Karte ist Dokumentation, die am Ende kommt.“ — Dann beschreibt sie das System, das man gerne hätte. Karten sind Verträge vor dem Bericht; ihre Werte fließen in Konsistenzprüfungen ein.
- „Ein leeres Feld ist besser als ein falsches.“ — Beide sind Mängel: Das leere Feld verweigert die Auskunft, das falsche belügt sie. Audit-technisch zählen beide.
- „Karten sind nur für große Modelle.“ — Gerade ein kleiner Stub-Prototyp profitiert: Die bekannte Grenze „kein echtes Sprachmodell“ verhindert, dass jemand aus Fixtur-Zahlen Aussagen über echte Antwortqualität ableitet.
- „Split-Summen sind Detailkram.“ — Anteile von 0,8 + 0,1 + 0,2 bedeuten, dass sich dein Datensatz vermehrt hat; jede Kennzahl, die daraus abgeleitet wird, ist wertlos.
- „Konsistenz prüft man beim Lesen.“ — Menschen überlesen Widersprüche; Gleichheitsvergleiche nicht. Deshalb ist der Cross-Check Code, nicht Aufmerksamkeit.

## Direkter Check

In [Ein Karten-Audit prüft zwei Karten gegen die Pflichtfeldsätze. Modellkarte …](#/family/formula-stat-from-table/card-audit-missing-count/0/core) zählst du fehlende und leere Pflichtfelder über Karten hinweg. [Code lesen und die Endwerte der Variablen angeben: Eine Kartenprüfung zählt …](#/family/trace-assignment-state/card-check-variable-trace/0/core) verfolgt eine Feld- und Split-Prüfung im Code; [Implementiere den Karten-Feldvalidator. validate_card(card, required) → …](#/family/validate-required-field-raise/validate-card-fields/0/core) implementiert validate_card mit Split-Summen und Semver; [Implementiere Konsistenzprüfung und Geheimnis-Scan. GEHEIMNIS_MUSTER (im …](#/family/validate-rule-catalog-scan/card-secret-scan/0/stretch) prüft Karten gegen das Protokoll und scannt auf geleakte Schlüssel und Token; der Boss [Final Boss Cross-Card-Audit: Implementiere cross_card_consistency(datacard, …](#/family/validate-rule-catalog-scan/cross-card-consistency/0/challenge) führt den Cross-Check über alle Karten und das Protokoll zu einer Widerspruchsliste zusammen.
