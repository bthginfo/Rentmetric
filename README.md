# Rentmetric

Rentmetric ist eine deutschsprachige Multi-Tenant-SaaS für private und kleine gewerbliche Vermieter. Der aktuelle MVP-Stand kombiniert ein ruhiges Portfolio-Dashboard mit Aufgaben-/Fristenlogik, versionierbaren Mietspiegelquellen, sicherer Anmeldung und einem eingeschränkten Informationsbereich für Mieter.

> Automatische Hinweise und Mietpreisorientierungen sind Arbeitshilfen, keine Rechtsberatung. Quelle, Version, Eingaben und Rechenweg müssen vor einer Maßnahme geprüft werden.

## Aktueller Funktionsumfang

- Organisations-, Benutzer-, Mitgliedschafts- und Sessionmodell
- Argon2id-Passwörter, nur gehashte Session-Tokens, Login-Rate-Limit und sichere Cookies
- relationales Postgres-Schema für Objekte, Einheiten, Mieter, Mietverhältnisse, Zahlungen, Dokumente, Aufgaben, Mietspiegel, Freigabelinks, Jobs und Audit-Log
- Dashboard, Objekt-/Mietübersicht, Aktionscenter, Mietspiegelregister und Dokumentstatus
- deterministische Reminder Engine für Zahlungsausfälle, Vertragsenden, unvollständige Kautionen, Dokumentabläufe und Mietprüfungen
- deterministische Mietpreisorientierung mit Vergleichsmiet- und Kappungsgrenzen
- widerrufbare/ablaufende Freigabelink-Domäne; öffentliche Demo-Mieteransicht
- geschützter täglicher Vercel-Cron-Endpunkt
- austauschbare Interfaces für Mietspiegel- und Dokumentverarbeitungsprovider; Dokument-KI standardmäßig deaktiviert

Die präsentierten Portfolioinhalte sind im Preview-MVP ausdrücklich fiktive Demodaten. Das persistente Schema und Auth-System verwenden die projektgebundene Postgres-Datenbank. CRUD-Flows, private Blob-Downloads, vollständige Nebenkostenabrechnung und Mailversand sind die nächsten vertikalen Releases.

## Architektur

- Next.js App Router / React / TypeScript strict / Tailwind CSS
- Neon Postgres über Vercel Marketplace
- Drizzle ORM und versionierte SQL-Migrationen
- Zod an Eingabe- und Provider-Grenzen
- Vitest für deterministische Domänenlogik

Fachliche Repository-Funktionen verlangen immer `organizationId`. Dieser Wert kommt aus der serverseitig validierten Session, nie aus einem Formularfeld. Geld wird ausschließlich als Integer-Cent verarbeitet. Details: [ARCHITECTURE.md](./ARCHITECTURE.md) und [SECURITY.md](./SECURITY.md).

## Lokales Setup

Voraussetzungen: Node.js 20+ und eine eigene PostgreSQL-/Neon-Datenbank.

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Danach unter `http://localhost:3000/register` einen neuen Arbeitsbereich anlegen. Für lokale Demo-Daten wird bewusst kein festes Produktionskonto ausgeliefert; die sichtbaren Portfolioinhalte sind bereits als klar markierter UI-Datensatz enthalten.

## Datenbank

```bash
npm run db:generate  # neue Migration nach Schemaänderung
npm run db:migrate   # vorhandene Migrationen anwenden
npm run db:push      # nur für lokale, disposable Entwicklung
```

Das Schema liegt in `src/db/schema.ts`, Migrationen in `drizzle/`. Jeder neue fachliche Datensatz benötigt entweder `organization_id` oder eine zwingend organisationsgebundene Parent-Relation.

## Dokumente und optionale KI

Dokumente sind privat zu speichern. `BLOB_READ_WRITE_TOKEN` aktiviert später den Vercel-Blob-Adapter; Downloads müssen immer über einen autorisierten Route Handler laufen. `DOCUMENT_AI_PROVIDER=local` ist der sichere Standard. Eine spätere OpenAI-Implementierung hängt nur am `DocumentProcessor`-Interface und darf Ergebnisse ausschließlich als prüfbare Vorschläge speichern. Details: [DOCUMENT_PROCESSING.md](./DOCUMENT_PROCESSING.md).

## Mietspiegel

Automatisierung erfolgt providerbasiert: bevorzugt Open Data/API, alternativ strukturierter Import oder ein manuell geprüftes Regelwerk. Jede neue Version startet als `pending_review`; unkontrolliertes PDF-Scraping aktiviert niemals automatisch neue Berechnungsregeln. Details: [RENT_INDEX_PROVIDERS.md](./RENT_INDEX_PROVIDERS.md).

## Vercel Deployment

Dieses Repository ist mit dem separaten Vercel-Projekt `rentmetric` verbunden. Die eigene Neon-Ressource `rentmetric-postgres` liefert `DATABASE_URL`. Zusätzlich erforderlich:

- `SESSION_SECRET` und `CRON_SECRET` als verschlüsselte Werte
- `ENABLE_DOCUMENT_AI=false`
- optional `BLOB_READ_WRITE_TOKEN`

Der Cron in `vercel.json` ruft täglich `/api/cron/dispatch` auf. Vor jedem Deployment:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Backup, Restore und Umgebungen

Produktions-, Preview- und Testdaten nicht mischen. Neon-Backups/Point-in-Time-Restore gemäß gewähltem Plan aktivieren und Restore regelmäßig in einer separaten Datenbank testen. Datenbankzugänge niemals zwischen Projekten wiederverwenden.

## Roadmap

1. Persistente CRUD-Flows, Onboarding, private Blob-Uploads und echte Freigabelinks
2. Nebenkostenabrechnung, Zahlungsimport/-zuordnung, Mietspiegel-Importassistent und Notification-Delivery
3. Teamrollen, Billing, Banking, DATEV, PWA und optional datenschutzkonforme KI-Suche/-Erklärung

