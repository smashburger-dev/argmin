// Procedural family classify-tool-policy: the seed draws a scenario from the
// curated bank and rotates the answer position via buildRotatedChoices. The
// bank keeps the curated base example verbatim as oracle (key 'base') — same
// prompt, same four option texts, same solution — plus new German scenarios
// that probe the same concept (least privilege for agent tools: allowlist
// registration, argument scope, default-deny for unknown calls, technical
// enforcement over prompt requests). parameters carry only the scenario key,
// so nothing answer-relevant leaks into instance.parameters. Mirrors
// genSvmMarginCapsule in data_ml_generators.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

export const TOOL_POLICY_CAPSULES = {
  intro: {
    caseId: 'tool-policy-least-privilege',
    bank: [
      {
        key: 'base',
        prompt: 'Ein interner Prototyp soll Anfragen nur aus festen FAQ-Dokumenten beantworten und Resultate als Bericht exportieren dürfen — nichts anderes. Welche Beschreibung ist Least Privilege?',
        correct: 'Suchen und Lesen sind erlaubt, Export nur mit Argument ‚bericht‘; Mail- und Hook-Werkzeuge werden gar nicht registriert, unbekannte Aufrufe lehnt die Policy ab.',
        wrong: [
          'Unbekannte Werkzeuge werden automatisch mit eingeschränkten Rechten eingebunden, damit nichts blockiert.',
          'Alle Werkzeuge werden erlaubt, und im Systemprompt steht: „Missbrauche die Mail-Funktion nicht.“',
          'Mail ist erlaubt, aber ein Filter prüft jede gesendete Nachricht nachträglich auf vertrauliche Inhalte.',
        ],
        solution: 'Least Privilege: nur Suchen/Lesen und ein auf ‚bericht‘ eingeschränkter Export; Mail und Hook sind gar nicht erst registriert. Was die Policy nicht kennt, wird abgelehnt. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.',
      },
      {
        key: 'kalender-assistent',
        prompt: 'Ein Kalender-Assistent darf Termine lesen und Entwürfe für Antwortmails anlegen, aber nie selbst versenden. Welche Konfiguration entspricht Least Privilege?',
        correct: 'Nur die Werkzeuge kalender.lesen und mail.entwurf_anlegen werden registriert; ein mail.senden-Werkzeug existiert für den Agenten nicht — was nicht registriert ist, kann nicht aufgerufen werden.',
        wrong: [
          'Alle Mail-Werkzeuge bleiben registriert, aber der Systemprompt verbietet das Senden ausdrücklich.',
          'mail.senden ist erlaubt, ein nachträglicher Filter löscht heikle Sendungen.',
          'Der Assistent bekommt Vollzugriff und protokolliert jeden Aufruf zur späteren Prüfung.',
        ],
        solution: 'Least Privilege heißt: die Angriffsfläche ist die Registrierung. Wer senden können soll, registriert das Werkzeug; wer es nicht braucht, lässt es weg. Prompt-Bitten und nachträgliche Filter greifen nicht technisch — sie lassen den Kanal offen.',
      },
      {
        key: 'default-deny',
        prompt: 'Ein Agent ruft ein Werkzeug auf, das in keiner Policy-Zeile steht. Was tut eine Least-Privilege-Policy?',
        correct: 'Sie lehnt den Aufruf ab: Allowlist bedeutet unbekannt ist verboten — nur ausdrücklich benannte Werkzeuge und Argumente sind erlaubt.',
        wrong: [
          'Sie bindet das Werkzeug mit eingeschränkten Rechten ein, damit nichts blockiert.',
          'Sie fragt das Modell, ob der Aufruf sinnvoll klingt.',
          'Sie erlaubt den Aufruf einmalig und lernt daraus eine neue Regel.',
        ],
        solution: 'Die Unterscheidung ist technisch, nicht rhetorisch: eine Allowlist enumeriert das Erlaubte und lehnt alles andere ab. Auto-Einbindung unbekannter Werkzeuge oder eine Modell-Einschätzung erweitern die Fläche, statt sie zu schließen.',
      },
      {
        key: 'prompt-bitte',
        prompt: 'Warum ist „im Systemprompt steht, die Mail-Funktion nicht zu missbrauchen“ kein Ersatz für eine restriktive Tool-Policy?',
        correct: 'Weil eine Prompt-Bitte keine technische Grenze ist: untrusted Input aus dem Retrieval kann dieselben Wörter enthalten — die Policy muss den Aufruf selbst verhindern.',
        wrong: [
          'Weil der Systemprompt zu viele Tokens kostet.',
          'Weil der Text im Systemprompt vom Modell nie gelesen wird.',
          'Weil Mail-Werkzeuge in jeder Policy generell verboten sind.',
        ],
        solution: 'Anweisungen im Prompt sind Text, kein Zaun: Prompt-Injection aus Dokumenten oder Eingaben kann sie unterlaufen. Least Privilege greift an der Aufrufstelle — nicht registriert heißt nicht aufrufbar.',
      },
      {
        key: 'export-argument',
        prompt: "Ein Reporting-Agent soll exportieren dürfen — aber ausschließlich als 'bericht', nicht als 'rohdaten'. Welche Policy-Zeile trägt das korrekt?",
        correct: "Eine Regel, die das Werkzeug export nur mit dem Argumentwert 'bericht' erlaubt — Werkzeug und Argumentbereich stehen beide in der Allowlist.",
        wrong: [
          'export pauschal erlauben, danach prüft ein Filter die ausgegebenen Dateien.',
          'export verbieten und stattdessen dem Modell das Drucken der Rohdaten erlauben.',
          'export erlauben, solange der Systemprompt Höflichkeit beim Teilen verlangt.',
        ],
        solution: "Least Privilege reicht bis in die Argumente: nicht nur welches Werkzeug, sondern mit welchen Parametern es aufgerufen werden darf. 'bericht' steht in der Allowlist, 'rohdaten' nicht — der Rest ist Policy-Ausführung, nicht Filterarbeit.",
      },
      {
        key: 'datenbank-analyst',
        prompt: 'Ein Analyse-Agent braucht Lesezugriff auf ein Reporting-Schema. Welche Rechtevergabe ist Least Privilege?',
        correct: 'Ein Token mit SELECT auf genau diesem Schema; Schreibrechte, andere Schemas und Admin-Funktionen werden nicht vergeben.',
        wrong: [
          'Der Agent bekommt den bestehenden Admin-Key, weil er schon da ist.',
          'Der Agent bekommt Vollzugriff, aber nur während der Geschäftszeiten.',
          'Der Agent bekommt Schreibrechte für den Fall, dass er korrigieren muss.',
        ],
        solution: 'Rechte werden am Bedarf geschnitten: ein Schema, nur lesen, kein Rest. Ein vorhandener Admin-Key ist bequem, aber genau das Muster, das Least Privilege abschafft — Kompromittierung oder Fehlverhalten hätten sonst volle Reichweite.',
      },
      {
        key: 'rollen-trennung',
        prompt: "Ein Assistenzsystem hat zwei Rollen: 'recherche' liest Dokumente, 'versand' schickt genehmigte Mails. Was ist die Least-Privilege-Anordnung?",
        correct: 'Zwei getrennte Policies: die Recherche-Rolle registriert nur Lese-Werkzeuge, die Versand-Rolle nur das Mail-Werkzeug mit genehmigten Vorlagen — keine Rolle trägt Rechte der anderen.',
        wrong: [
          'Eine gemeinsame Policy mit allen Werkzeugen, die per Prompt je Rolle erklärt wird.',
          'Beide Rollen teilen den Admin-Token, damit Übergaben einfach bleiben.',
          'Die Recherche-Rolle bekommt auch Versand, falls eine Anfrage schnell beantwortet werden soll.',
        ],
        solution: 'Rechte folgen der Rolle, nicht der Bequemlichkeit: jede Rolle trägt genau die Werkzeuge ihrer Aufgabe. Geteilte Vollrechte machen aus einem Recherche-Fehler oder einer Injection sofort einen Versand-Vorfall.',
      },
      {
        key: 'filter-nachtraeglich',
        prompt: 'Ein Team erlaubt dem Agenten das Mail-Werkzeug und filtert gesendete Nachrichten nachträglich auf vertrauliche Inhalte. Welcher Einwand greift?',
        correct: 'Detektivisch statt strukturell: der Abflusskanal bleibt offen — der Filter kann nur erkennen, was schon gesendet wurde; Least Privilege würde den Kanal gar nicht erst öffnen.',
        wrong: [
          'Der Filter ist falsch, weil Filter grundsätzlich nichts erkennen können.',
          'Es fehlt lediglich eine höhere Filterempfindlichkeit.',
          'Mail sollte pauschal für jeden Agenten erlaubt sein.',
        ],
        solution: 'Der Filter arbeitet am Ausgang, die Policy an der Möglichkeit: was gesendet werden kann, kann auch durchrutschen. Strukturelles Schließen (Werkzeug nicht registrieren) schlägt detektivisches Erkennen — darauf zielt Least Privilege.',
      },
      {
        key: 'scoped-token',
        prompt: 'Statt dem Haupt-API-Key bekommt der Agent ein Token, das nur die Endpunkte /suche und /dokument lesen kann. Welches Prinzip wird umgesetzt?',
        correct: 'Least Privilege über Credential-Scope: das Token kann technisch nur das, was die Aufgabe braucht — selbst ein missbrauchter Aufruf bleibt auf die zwei Endpunkte begrenzt.',
        wrong: [
          'Sicherheit durch Obscurity: ein zweiter Key ist geheimer.',
          'Rate-Limiting: das Token drosselt nur die Geschwindigkeit.',
          'Verschlüsselung: das Token verschlüsselt die Antworten.',
        ],
        solution: 'Der Scope des Credentials ist eine technische Grenze: ein kompromittiertes oder fehlgesteuertes Token erreicht nur /suche und Lesen. Der volle API-Key würde jeden Fehler zum Vollzugriff skalieren.',
      },
      {
        key: 'audit-ersatz',
        prompt: 'Ein Prototyp erlaubt alle Werkzeuge und schreibt jede Nutzung in ein Audit-Log. Erfüllt das Least Privilege?',
        correct: 'Nein: ein Audit-Log beobachtet die Nutzung, begrenzt sie aber nicht — die vollen Rechte bleiben bestehen, und jeder Fehlaufruf ist bereits geschehen, wenn er im Log steht.',
        wrong: [
          'Ja: solange alles protokolliert wird, ist die Policy erfüllt.',
          'Nein, weil das Log zu viel Speicherplatz verbraucht.',
          'Ja, aber nur wenn das Log wöchentlich gelesen wird.',
        ],
        solution: 'Audit und Allowlist lösen verschiedene Probleme: das Log erklärt hinterher, was passierte; die Policy verhindert vorher, was nicht passieren darf. Least Privilege ist die Verhinderung — das Log bleibt zusätzlich sinnvoll.',
      },
      {
        key: 'mail-nicht-registriert',
        prompt: 'Warum gilt „das Mail-Werkzeug wird gar nicht erst registriert“ als stärker als „Mail ist erlaubt, aber der Agent soll es selten nutzen“?',
        correct: 'Weil nicht registriert technisch nicht aufrufbar ist: eine Nutzungshäufigkeit ist eine Erwartung an das Modell, die Registrierung eine Eigenschaft des Systems — Injection oder Fehlverhalten kann das Erste brechen, das Zweite nicht.',
        wrong: [
          'Weil seltene Nutzung teurer ist als keine Registrierung.',
          'Weil nicht registrierte Werkzeuge schneller laufen.',
          'Weil Mail-Werkzeuge generell nicht zulässig sind.',
        ],
        solution: 'Die Policy bindet das System, nicht die Absicht: was nicht registriert ist, existiert für den Agenten nicht — kein Prompt, keine Injection, kein Halluzinieren kann es aufrufen. Häufigkeitsabsprachen bleiben Wünsche.',
      },
      {
        key: 'welche-allowlist',
        prompt: 'Welche Beschreibung trifft eine Allowlist-Policy für einen Recherche-Agenten?',
        correct: 'Nur web.suchen und docs.lesen sind registriert; jeder andere Aufruf — bekannt oder nicht — wird von der Policy abgelehnt.',
        wrong: [
          'Alle Werkzeuge sind erlaubt, außer den explizit verbotenen (Blocklist).',
          'Der Agent darf alles und entscheidet selbst, was angemessen ist.',
          'Neue Werkzeuge werden automatisch erlaubt, sobald sie verfügbar sind.',
        ],
        solution: 'Allowlist heißt Aufzählung des Erlaubten: alles nicht Genannte fällt in Default-Deny. Eine Blocklist kehrt das um und bleibt offen für alles nicht Bedachte — das Gegenteil von Least Privilege.',
      },
      {
        key: 'admin-temporaer',
        prompt: 'Für eine Demo bekommt der Agent „vorübergehend“ einen Admin-Token, weil das Einrichten der Scopes zu lange dauert. Was ist der Einwand aus Sicht von Least Privilege?',
        correct: 'Temporäre Vollrechte sind trotzdem Vollrechte: für die Dauer der Demo kann der Agent alles — die fehlende Scope-Arbeit wird zum Sicherheitsrisiko, nicht nur zur Verzögerung.',
        wrong: [
          'Es gibt keinen Einwand, solange der Token später gelöscht wird.',
          'Admin ist nötig, weil Demo-Anfragen immer schreiben müssen.',
          'Der einzige Fehler ist, dass der Token nicht dauerhaft vergeben wurde.',
        ],
        solution: 'Least Privilege misst die maximale Schadwirkung, nicht die Absicht: in der Demozeit ist der Agent kompromittierbar mit voller Reichweite. Scopes vorher einzurichten ist genau die Arbeit, die das Prinzip verlangt.',
      },
    ],
  },
};

export const TOOL_POLICY_CONTRACT = {
  familyId: 'classify-tool-policy',
  familyGroup: 'classify-concept',
  summary: 'Ordnet einen Tool-Einsatz der passenden Policy-Klasse zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'tool-policy-least-privilege', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-genai-prototype'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

const FAMILY_IMPL = makeChoiceFamily({
  contract: TOOL_POLICY_CONTRACT,
  capsules: TOOL_POLICY_CAPSULES,
  shapeError: 'Tool-Policy-Parameter verletzen die Kapselform',
});

export const toolPolicyCapsuleOk = FAMILY_IMPL.capsuleOk;
export const toolPolicyCorrectText = FAMILY_IMPL.correctText;
export const genToolPolicyCapsule = FAMILY_IMPL.genCapsule;
export const generateToolPolicyFamily = FAMILY_IMPL.generate;
export const solveToolPolicyFamily = FAMILY_IMPL.solve;
export const FAMILY_SPEC = FAMILY_IMPL.spec;
