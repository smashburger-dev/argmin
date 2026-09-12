# Übung: Ein Kartentrio mit Mängeln durchforsten

Im Worked Example hast du bewusst unvollständige Karten untersucht. Jetzt bekommst du ein drittes Kartentrio — diesmal für den FAQ-Assistenten — und gehst die Prüfkette selbst durch: Form prüfen, dann Widersprüche zwischen den Karten suchen, dann alles melden, was fehlt.

## Das Kartentrio

`data-card.json`:

```json
{
  "name": "faq-korpus",
  "version": "v1.4.0",
  "quelle": {"typ": "intern", "uri": "s3://corpus/faq"},
  "lizenz": "intern",
  "split": {"train": 0.7, "test": 0.3},
  "aufnahme_datum": "2026-04-28"
}
```

`model-card.json`:

```json
{
  "name": "faq-antwort",
  "version": "v2.0.1",
  "metriken": [{"name": "recall@5", "wert": 0.82}],
  "einschraenkungen": [],
  "trainingsdaten": {"name": "faq-korpus", "version": "v1.3.0"}
}
```

`risk-register.json`:

```json
{
  "projekt": "faq-antwort",
  "eintraege": [
    {"risiko": "stale faq-eintraege", "wahrscheinlichkeit": 3, "auswirkung": 4},
    {"risiko": "injektionsphrasen im korpus", "wahrscheinlichkeit": 1, "auswirkung": 5}
  ]
}
```

Und die Pipeline-Konfiguration enthält die Zeile `SCHLUESSEL = "sk-live-demo-1234"`.

## Aufgaben

1. **Formalchecks:** Prüfe die vier Regeln — Pflichtfelder nicht leer, Split summiert zu 1, `semver`-Syntax, `aufnahme_datum` im ISO-Format. Welche Mängel findest du in welcher Datei?
2. **Widersprüche:** Welche Versionsangaben widersprechen sich zwischen `data-card.json` und `model-card.json`? Was ergibt der Vergleich der Protokoll-Metrik mit den Kartenmetriken, wenn das Protokoll `recall@5` verlangt, die Karte aber nur `f1` dokumentiert hätte?
3. **Secret-Scan:** Findet der regelbasierte Scan den String in `SCHLUESSEL` — und was gilt für alle Strings, die das Muster nicht trifft?
4. **Mängelliste:** Zähle die formellen Mängel und sortiere die Code-Liste — gegen welche Regel stößt die Reihenfolge der Funde im Report?

## Kontrolliere

- Formal: `einschraenkungen` ist eine leere Liste (Pflichtfeld leer). Der Split summiert zu 1,0 — ok. Beide Versionen sind gültige Semver. `aufnahme_datum` ist ISO — ok.
- Widersprüche: `data-card` steht auf `v1.4.0`, `trainingsdaten.version` in der Model Card sagt `v1.3.0` — die Karte behauptet eine ältere Version, als die Data Card ausweist. Hier dokumentiert die Model Card `recall@5`; hätte sie stattdessen nur `f1` geführt, wäre die preregistrierte Protokoll-Metrik `recall@5` in der Karte nicht auffindbar — ebenfalls ein Report-Widerspruch.
- Secret: `sk-live-` trifft das Muster und wird gefunden. Für Strings ohne Muster-Treffer gilt: nicht gefunden heißt nicht sauber — der Scan ist keine Negativgarantie.
- Mängelliste: hier genau ein Mangel (`einschraenkungen leer`); die Code-Liste muss im Report alphabetisch sortiert stehen, unabhängig von der Fundreihenfolge.
