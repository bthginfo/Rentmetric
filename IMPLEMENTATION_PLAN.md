# Rentmetric – Implementation Plan

## Ziel des ersten Releases

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

## Bewusst nachgelagert

Vollständige Nebenkostenabrechnung, Banking-Schnittstellen, E-Mail-Versand, Billing, Teamrollen und flächendeckend automatisch gepflegte kommunale Mietspiegel folgen als weitere Releases. Datenmodell und Provider-Grenzen werden dafür bereits angelegt.
