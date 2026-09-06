# ADR-0012: Runtime für Woche 6 bis 17 (Daten und klassisches ML)

Status: Angenommen (NumPy-first-Hybrid nach ADR-Default). Datum: 2026-08-30.

## Kontext

Wochen 6 bis 17 der Roadmap behandeln Datenbereinigung, EDA, Gradienten und
Regression, Baselines, lineare/logistische Regression, Cross-Validation,
Fehleranalyse, Regularisierung, Ensembles, SVM/PCA/Clustering und einen
reproduzierbaren Modellvergleich. Die Kompetenztexte (Entwurf) nennen pandas
explizit; die Runtime muss offline funktionieren, deterministisch bewerten und
die Public-/Private-Grenze einhalten. Neue Wheels und Pakete dürfen ohne
ausdrückliche Freigabe durch Noa nicht vendort werden.

Vier unabhängige Untersuchungen liegen vor: Runtime-Architektur, externe
Evidenz, Lizenz- und Public-Build-Audit, Lernmethodik. Diese ADR integriert
deren belegte Befunde; jede entscheidungsrelevante Behauptung trägt eine
Quellenklasse.

## Untersuchte Optionen

- **OPTION A — NumPy + Python-Standardbibliothek im Browser.** Kleine
  Algorithmen und Datenpipelines werden aus Grundoperationen implementiert
  (Listen-ab-Letturen, `csv`-Modul, NumPy-Array-Operationen, `np.linalg`).
  Umfangreichere Workflows laufen als lokale Projekte über den bestehenden
  Projekt-Runner (ADR-0010).
- **OPTION B — pandas, matplotlib, scikit-learn vollständig offline vendort.**
  Wheels, transitive Abhängigkeiten, SHA-256-Hashes, Lizenzen, Notices,
  Package-Whitelist und Browserabnahme komplett neu aufgebaut.
- **OPTION C — Data/ML nur lokal.** Der Browser vermittelt nur Konzepte,
  Code-Reading und kleine deterministische Checks.

## Messwerte und Quellen

Messwerte aus diesem Repository [VERIFIED, eigene Messung]:

- `vendor/` gesamt 48 MB, davon `vendor/pyodide/` 22 MB (`pyodide.asm.wasm`
  9.597.831 B, `python_stdlib.zip` 2.545.564 B).
- `build-public/` gesamt 24 MB, davon Pyodide-Anteil 20 MB (Allowlist in
  `tools/build_public.mjs`).
- Vendorte Wheels: `numpy-2.4.6` (2.918.760 B), `sympy-1.14.0` (4.185.567 B),
  `mpmath-1.4.1` (430.985 B). Lokaler numpy-SHA-256 stimmt mit dem Eintrag in
  `vendor/pyodide/pyodide-lock.json` überein.
- Paket-Whitelist im Worker: `numpy`, `sympy`, `mpmath`
  (`assets/js/runtime/pyodide_worker.mjs`).
- Init-Zeit lokal gemessen (ADR-0001/0003, Spike 2026-08-24): 1,3 s Core,
  +0,6 s NumPy-Lauf. RAM: nicht dokumentiert [UNKNOWN].

Messwerte aus Primärquellen [VERIFIED, pyodide.org und jsDelivr, 2026-08-30]:

- Aktuelle stabile Pyodide-Version: 314.0.6 (2026-08-25); das Repo pinnt
  314.0.5 (2026-08-17) — Patchstand, identische Paketversionen im Lock.
- Offizielle Paketliste (`pyodide-lock.json`, Distribution 314.0.x):
  pandas 3.0.2, matplotlib 3.10.8, scikit-learn 1.8.0, scipy 1.18.0,
  numpy 2.4.6.
- Wheel-Größen (HTTP-Messung jsDelivr, ±~1 %): pandas 4.149.473 B,
  matplotlib 6.874.445 B, scikit-learn 4.405.973 B, scipy 13.880.823 B.
- Transitive Closure aus dem Lock: pandas→5 Pakete, matplotlib→12,
  scikit-learn→5; Vereinigung 17 Pakete, Summe ≈ 35,5 MB; ohne bereits
  vendortes numpy ≈ 32,6 MB. pandas-only-Mittelvariante ≈ 4,7 MB.
- Offizielle Core-Startup-Angabe: 6,4 MB Download, 4–5 s Initialisierung
  (ohne Datenpakete). Keine offiziellen RAM-Budgets pro Paket [UNKNOWN].

Lizenzen [VERIFIED, offizielle Repos, 2026-08-30]: pandas/scikit-learn/
scipy/joblib/threadpoolctl BSD-3-Clause; matplotlib Matplotlib-Lizenz (PSF-Stil
mit gebündelten Font-Lizenzen DejaVu/STIX/AMS/BaKoMa); python-dateutil
Apache-2.0 OR BSD-3; pytz/six MIT; pillow HPND-Stil. Alle permissiv, keine
Copyleft-Kollision mit MIT-Code/CC-BY-4.0-Inhalten.

Pyodide-Performance mit großen Paketen: nur anekdotische, vor-2026er Messungen
(Pyodide-Blog 2022/2024, GitHub-Issues #347, #5264) [ANECDOTAL]; aktuelle
Zahlen für 314.0.x liegen nicht vor [UNKNOWN].

## Claim-Klassifizierung der Entscheidungsträger

- Whitelist, vendorte Versionen, Grader-Kontrakt, Bundlegrößen: [VERIFIED].
- Pyodide-Paketverfügbarkeit und Wheel-Größen: [VERIFIED] (offizielle Liste
  plus eigene HTTP-Messung; jsDelivr ist Pyodides offizieller CDN-Host).
- Lizenzen der Kandidatenpakete: [VERIFIED] (offizielle Lizenztexte).
- „sklearn bleibt unter NumPy-Seed-Prelude deterministisch": [VENDOR-CLAIM],
  nicht reproduziert.
- RAM-Bedarf von pandas/sklearn im Worker: [UNKNOWN].
- Ladezeit der 17-Wheel-Closure lokal: [UNKNOWN] (über `durationMs` messbar).
- GLM-/AutoResearch-Claims spielen für diese Entscheidung keine Rolle; keine
  davon wurde als produktrelevant verifiziert [UNKNOWN].

## Entscheidung

**OPTION A — ehrlicher NumPy-first-Hybrid.** OPTION B ist ohne Noas
ausdrückliche Freigabe blockiert (neue Wheels). Damit greift der ADR-Default:
Browserübungen mit Standardbibliothek und NumPy, Algorithmen auf kleinen
deterministischen Datensätzen, lokale Projekte für größere Arbeitsabläufe.

Konkret bedeutet das für W6 bis W17:

1. **Ausführbare Evidenz** entsteht ausschließlich über Aufgaben, die der
   bestehende Pyodide-Grader mit `packages: ["numpy"]` (oder `[]`) deterministisch
   prüft: Tabellen als Zeilenlisten/Dictionaries, `csv`-Modul, NumPy-Grundoperationen,
   `np.linalg.lstsq`/`eigh`, eigene Gradientenabstieg-, Ridge-, Lasso-1D-,
   Gini-Baum-, PCA- und k-Means-Implementierungen auf kleinen Daten.
2. **pandas- und sklearn-Idiomatik** wird als Lese- und Vorhersagekompetenz
   gelehrt (`predict-output`, `code-trace`, `single-choice` auf vorgegebenen
   Snippets — kein Lauf der Bibliothek nötig) und nicht als ausgeführte
   Kompetenz ausgegeben. Der Kompetenztext von `c-pandas-cleaning` wird
   entsprechend ehrlich umformuliert.
3. **Visualisierung** wird als Diagrammwahl, Achsen-/Binspezifikation und
   Kennzahlenprüfung bewertet (Zahlen statt Bilder — das Worker-Protokoll hat
   keinen Bildkanal). Echte Plots bleiben lokale Projekte.
4. **Größere Workflows** (W17-Reproduktionsprojekt) laufen als lokales Projekt
   über `tools/learner_project_check.py`; Projektberichte bleiben
   Selbstbericht ohne Mastery-Evidenz (ADR-0010).
5. **Lücken bleiben sichtbar:** pandas/matplotlib/sklearn-Ausführung wird in
   Coverage, Reviews und Lektionstext als nicht-browsergeprüft ausgewiesen.

## Verworfene Alternativen

- **OPTION B (voll):** technisch machbar und lizenzrechtlich abbildbar
  (fail-closed-Gates greifen ohne Validator-Änderung), aber +32,6 MB Wheels
  (≈ 2,4× build-public), davon 13,9 MB allein scipy für Verfahren, die mehrere
  Kompetenzen ausdrücklich „aus Grundoperationen" entwickeln sollen;
  matplotlib wäre für Bewertung strukturell wertlos (kein Bildkanal); RAM- und
  Ladezeitrisiko unbelegt. Für W18–W30 liefert B nichts (kein torch/tf/jax im
  Pyodide-Lock [VERIFIED]).
- **OPTION B-lite (nur pandas, +4,7 MB):** die einzige Variante mit echtem
  Zusatznutzen (c-pandas-cleaning browserübbar). Bleibt als konkrete
  Freigabevorlage für Noa dokumentiert (unten), wird nicht automatisch
  ausgeführt.
- **OPTION C:** bricht das Installationsfreiheits-Versprechen für zwölf
  aufeinanderfolgende Wochen; Baseline-Kompetenzen wären im Browser nicht
  übbar. Verworfen.

## Unsicherheiten

- RAM- und Ladezeitverhalten vendorter pandas/sklearn-Wheels im Worker ist
  ungemessen [UNKNOWN]; eine spätere B-lite-Entscheidung muss zuerst den CDP-
  Lademesswert erheben.
- Ob Lernende ohne pandas-API-Praxis die W6-Kompetenz in echten Projekten
  transferieren, ist eine didaktische Annahme [INFERENCE aus Methodik-Review];
  positiv: Lesekompetenz für pandas-Idiome bleibt Aufgabe in W6.
- Die Aussage, sklearn-Resultate blieben unter NumPy-Seed-Prelude deterministisch,
  ist unbelegt [VENDOR-CLAIM] — irrelevant für OPTION A, relevant für B.

## Rückfallplan

W6–W17-Inhalte sind vor diesem Lauf outline-only; alle neuen Übungen,
Lektionen und Projekte sind additive Dateien. Rollback = neue Dateien löschen
und Katalog-/Curriculum-Einträge zurücknehmen. Worker, Whitelist, Build und
Validatoren bleiben unberührt. Bei einer späteren Freigabe von B-lite sind nur
`tools/vendor_fetch.sh`, `vendor/licenses/THIRD_PARTY_NOTICES.json`,
`tools/build_public.mjs` (Allowlist) und die Paket-Whitelist im Worker zu
erweitern; der bestehende Hash- und Notice-Gate-Test deckt den Rest ab.

## Bedingungen für eine spätere Neubewertung

Eine Neubewertung von OPTION B-lite (pandas-only) ist sinnvoll, wenn Noa die
Freigabe erteilt und vorher drei Messwerte vorliegen:

1. CDP-gemessene `durationMs` für `loadPackage(['pandas'])` kalt und warm
   gegen den vendorten Stand (Ziel: unter 10 s warm).
2. RAM-Verbrauch des Workers nach pandas-Import auf dem Zielgerät.
3. Ein Bestehen der bestehenden Leak-/Notice-Gates mit den vier neuen Wheels
   (pandas, python-dateutil, pytz, six) inklusive Hash-Einträgen.

Freigabevorlage für Noa (kann direkt als Auftrag übernommen werden):

> Freigabe beantragt: Vendoring von pandas 3.0.2, python-dateutil 2.9.0.post0,
> pytz 2026.1.post1, six 1.17.0 (Wheels aus Pyodide-314.0.5-Lock, jsDelivr,
> +≈ 4,7 MB) in `vendor/pyodide/`, Eintrag in
> `vendor/licenses/THIRD_PARTY_NOTICES.json` mit SHA-256, Allowlist-Erweiterung
> in `tools/build_public.mjs`, Whitelist-Eintrag `pandas` in
> `assets/js/runtime/pyodide_worker.mjs`, Register-Update in
> `docs/dependency-matrix.md` und `docs/license-register.md`, CDP-Abnahme mit
> kalter/warmer Ladezeit. Ziel: `c-pandas-cleaning` browser-ausführbar machen.
> matplotlib und scikit-learn bleiben ausgeschlossen (Bewertungskanal bzw.
> Grundoperatoren-Philosophie; siehe ADR).

## Folgeentscheidungen für den Kompetenzkatalog (mit dieser ADR umgesetzt)

- `c-pandas-cleaning`: Titel/ Beschreibung ehrlich auf tabellarische Daten
  (Zeilenlisten, `csv`, NumPy) umformuliert; pandas-Idiomatik ausdrücklich als
  Lese-/Vorhersagekompetenz. Kein Semantic-Duplicate, gleiche ID.
- `c-ml-regularization`: `requires` um `c-ml-cv` ergänzt — λ-Auswahl ohne
  CV-Kompetenz widerspricht dem Wochenzieleinzug (Methodik-Befund F3).
- `c-ml-svm-pca`: Beschreibung um Clustering, Skalierung und überwacht vs.
  unüberwacht ergänzt (Methodik-Befund F5, deckt das W16-Ziel ab).
- Arbeitsbelastung: Σ estimatedMinutes der 12 Kompetenzen ≈ 96 h bei
  12 × ~10 h Wochenbudget inkl. Reviews und Gates — als known gap
  dokumentiert; Kürzung nur mit inhaltlicher Entscheidung durch Noa.
