# Rentmetric – Implementation Plan

## Ziel des produktiven Releases

Ein deploybares, deutschsprachiges Multi-Tenant-MVP für private und kleine gewerbliche Vermieter. Der Release bildet die wichtigsten Portfolio-, Miet-, Fristen- und Mietspiegelprozesse als nachvollziehbare vertikale Flows ab. KI ist kein Laufzeit-Zwang; spätere Anbieter werden über klar getrennte Provider-Schnittstellen ergänzt.

## Produktumfang

1. **SaaS-Basis und Sicherheit**
   - Organisationen, Benutzer, Mitgliedschaften und gehashte Sessions
   - organisationsgebundene Repositories und sichere Freigabe-Tokens
   - PostgreSQL-/Drizzle-Schema, Audit-Log und Job-Infrastruktur
2. **Portfolio-Kern**
   - Objekte, Einheiten, Mieter, Mietverhältnisse und Zahlungen
   - Dashboard aus serverseitig berechneten Portfolio-Kennzahlen
3. **Fristen und Mietpotenziale**
   - deterministische Reminder Engine mit Quellen- und Unsicherheitshinweisen
   - regelbasierte Mietprüfung: letzte Erhöhung, Kappungsgrenze, Vergleichsmiete und Sperrfristen als prüfbare Hinweise, nicht als Rechtsberatung
4. **Mietspiegel**
   - versioniertes Provider-Interface für Open-Data/API, strukturierte Imports und manuell verifizierte Regelwerke
   - gespeicherte Assessments mit Eingaben, Rechenweg, Quelle, Version und Prüfstatus
5. **Mieterfreigabe**
   - widerrufbare, ablaufende Read-only-Links mit fein steuerbaren Bereichen
   - optionaler dokumentbezogener Upload-Inbox-Bereich; Uploads sind bis zur Vermieterfreigabe isoliert
6. **Betrieb**
   - Vercel-Projekt, eigene Postgres-Datenbank, Cron-Dispatcher, Umgebungsvariablen und Deployment-Dokumentation

## Architekturentscheidungen

- Geldwerte werden als Integer-Cent gespeichert und berechnet.
- Jede fachliche Query erhält `organizationId` aus der serverseitigen Session; IDs aus URL/Formularen bestimmen niemals den Organisationskontext.
- RLS wird als zusätzliche Produktionshärtung vorbereitet. Die Anwendung verlässt sich nicht darauf, sondern erzwingt Isolation bereits in Repositories und Tests.
- Mietspiegel-Daten werden nie ungeprüft überschrieben. Neue Versionen landen im Status `pending_review` und werden erst nach Prüfung aktiv.
- Erinnerungen sind Datenprodukte aus einer deterministischen Regel-Engine. Ein späteres KI-Modul darf Texte priorisieren oder erklären, aber niemals Fristen oder Geldbeträge als alleinige Quelle berechnen.
- Dokumentanalyse verwendet ein Provider-Interface (`local`, später z. B. OpenAI). Standardmäßig ist KI deaktiviert.

## Qualitätsgates

- TypeScript strict, ESLint, Unit-/Isolationstests und Production Build
- sichere Standardwerte für Cookies, Uploads, Freigabelinks und Cron
- responsive, tastaturbedienbare Oberfläche mit deutschen Formaten

## Aktueller Gap-Audit (13.07.2026)

Die SaaS-Basis, Authentifizierung, Organisationstrennung, Objekt-/Wohnungsdossiers, private Objektbilder, GovData-Finder, deterministischer Mietspiegelimport, globale Suche und Benachrichtigungs-Inbox sind produktiv vorhanden. Folgende im Master-Prompt geforderte Kernprozesse werden nun von Demo-/Platzhalterdarstellung auf persistente Funktionen umgestellt:

1. Aufgaben und Fristen: CRUD, Abschluss, Wiederöffnung, manuelle Reminder und idempotente Regelgenerierung.
2. Mietverhältnisse: Anlage, Detail, Status, mehrere beteiligte Mieter und unveränderliche Miethistorie.
3. Dashboard: ausschließlich serverseitig berechnete KPIs und Action-Center-Daten.
4. Zahlungen: monatliche Sollstellungen, manuelle Zahlung, CSV-Vorschau/-Zuordnung und Salden.
5. Dokumente: private Uploads/Downloads, Verknüpfungen, Status, Papierkorb und lokale Extraktionsjobs.
6. Mieterfreigaben: echte, widerrufbare und ablaufende Token-Links plus isolierte Upload-Inbox.
7. Nebenkosten: Perioden, Positionen, Verteilerschlüssel, nachvollziehbare Entwurfsberechnung und Abschluss.
8. Instandhaltung, Kontakte, Analysen und Einstellungen: organisationsgebundene CRUD- und Auswertungsflows.
9. Betrieb: ausführender Job-Dispatcher, tägliche Cron-Regeln, vollständiger Demo-Seed, Isolationstests und Betriebsdokumentation.

## Bewusst nachgelagert

OAuth, Stripe, automatische E-Mails, Open Banking, digitale Signaturen, native Apps und automatische rechtliche Freigaben bleiben gemäß Master-Prompt außerhalb des ersten produktiven Kerns. Es gibt dafür Provider-/Job-Grenzen, aber keine funktionslosen Buttons.
