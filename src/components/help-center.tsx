"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  CircleHelp,
  FileSearch,
  FileText,
  House,
  MessagesSquare,
  Play,
  ReceiptText,
  Search,
  ShieldCheck,
  Upload,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { restartProductTour } from "@/app/app/help/actions";

const workflows = [
  {
    title: "Objekt und mehrere Einheiten anlegen",
    detail: "Einzeln starten oder viele Datensätze mit Vorlage erfassen.",
    href: "/app/bulk?type=properties",
    Icon: Building2,
    tags: "immobilien wohnungen einheiten datenimport csv",
  },
  {
    title: "Mieter:in und Mietverhältnis anlegen",
    detail: "Kontaktdaten, Einheit, Miete, Kaution und Fälligkeit verbinden.",
    href: "/app/tenancies/new",
    Icon: UsersRound,
    tags: "mieter vertrag mietverhältnis kaution",
  },
  {
    title: "Dokumente richtig zuordnen",
    detail:
      "Dateien am Objekt, an der Einheit, Person oder am Vertrag ablegen.",
    href: "/app/documents",
    Icon: FileText,
    tags: "upload dokumente ablage datei",
  },
  {
    title: "Zahlung buchen oder importieren",
    detail:
      "Eine Buchung manuell erfassen oder Bankumsätze per CSV übernehmen.",
    href: "/app/payments",
    Icon: Banknote,
    tags: "zahlung bank csv miete buchen",
  },
  {
    title: "Betriebskosten abrechnen",
    detail:
      "Periode anlegen, Belege erfassen, verteilen und Abrechnung prüfen.",
    href: "/app/utilities",
    Icon: ReceiptText,
    tags: "nebenkosten betriebskosten abrechnung belege umlage",
  },
  {
    title: "Wartungsfall bearbeiten",
    detail:
      "Meldung priorisieren, zuständige Kontakte einbinden und Verlauf dokumentieren.",
    href: "/app/maintenance",
    Icon: Wrench,
    tags: "wartung schaden fall meldung reparatur",
  },
  {
    title: "Mietspiegel prüfen",
    detail:
      "Quelle finden, importieren, kontrollieren und Regeln manuell anpassen.",
    href: "/app/rent-index",
    Icon: House,
    tags: "mietspiegel miete stadt import pdf excel",
  },
  {
    title: "Mieterportal und Nachrichten",
    detail:
      "Sicheren Mieterlink, Aufgaben, Nachrichten und Schadenmeldungen verwalten.",
    href: "/app/tenancies",
    Icon: MessagesSquare,
    tags: "portal mieterlink nachrichten aufgaben schaden",
  },
  {
    title: "Fristen und Analyse verstehen",
    detail:
      "Aufgaben priorisieren, Benachrichtigungen prüfen und Kennzahlen auswerten.",
    href: "/app/analytics",
    Icon: ChartNoAxesCombined,
    tags: "aufgaben fristen reminder analyse kpi",
  },
] as const;

const topics = [
  {
    title: "Portfolio",
    text: "Die stabile Grundlage für alles Weitere.",
    points: [
      "Objekte und Bilder",
      "Wohnungen und Ausstattung",
      "Bulk-Erfassung und CSV",
    ],
    href: "/app/properties",
    link: "Immobilien öffnen",
    Icon: Building2,
    tags: "portfolio objekt einheit bild csv",
  },
  {
    title: "Vermietung",
    text: "Menschen, Verträge und Zahlungsdaten im Zusammenhang.",
    points: [
      "Mieter:innen verwalten",
      "Mietverhältnisse und Historie",
      "Kautionen und Fälligkeiten",
    ],
    href: "/app/tenancies",
    link: "Mietverhältnisse öffnen",
    Icon: UsersRound,
    tags: "mieter vertrag kaution zahlung",
  },
  {
    title: "Ablage",
    text: "Dokumente nachvollziehbar am richtigen Datensatz.",
    points: [
      "Dedizierte Uploads",
      "Kategorien und Zuordnung",
      "Mieterportal-Freigaben",
    ],
    href: "/app/documents",
    link: "Dokumente öffnen",
    Icon: FileText,
    tags: "dokument upload datei portal",
  },
  {
    title: "Betrieb",
    text: "Kosten, Fälle und laufende Arbeit strukturiert steuern.",
    points: [
      "Betriebskostenabrechnung",
      "Wartung und Meldungen",
      "Kontakte und Zuständigkeiten",
    ],
    href: "/app/utilities",
    link: "Betriebskosten öffnen",
    Icon: Wrench,
    tags: "betriebskosten wartung kontakte",
  },
  {
    title: "Mietbewertung",
    text: "Quellen transparent prüfen und kontrolliert verwenden.",
    points: [
      "Aktuelle Quellen finden",
      "PDF, Excel und CSV importieren",
      "Regeln manuell bearbeiten",
    ],
    href: "/app/rent-index",
    link: "Mietspiegel öffnen",
    Icon: FileSearch,
    tags: "mietspiegel pdf excel quelle",
  },
  {
    title: "Steuerung",
    text: "Handlungsbedarf und Entwicklung im Blick behalten.",
    points: [
      "Aufgaben und Fristen",
      "Benachrichtigungen",
      "Analysen mit Zeitraum",
    ],
    href: "/app/tasks",
    link: "Aufgaben öffnen",
    Icon: CalendarClock,
    tags: "aufgaben fristen notification analyse",
  },
] as const;

const navigationMap = [
  [
    "Übersicht",
    "Kennzahlen, tägliches Briefing und nächste Schritte",
    "/app/dashboard",
  ],
  [
    "Immobilien",
    "Objekte, Einheiten, Bilder und Stammdaten",
    "/app/properties",
  ],
  [
    "Mietverhältnisse",
    "Mieter:innen, Verträge, Kautionen und Portal",
    "/app/tenancies",
  ],
  [
    "Aufgaben & Fristen",
    "Manuelle Aufgaben und smarte Erinnerungen",
    "/app/tasks",
  ],
  [
    "Dokumente",
    "Zentrale Ablage mit Zuordnungen und Kategorien",
    "/app/documents",
  ],
  [
    "Betrieb & Auswertung",
    "Kosten, Wartung, Mietspiegel und Analyse",
    "/app/utilities",
  ],
] as const;

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const normalized = query.trim().toLocaleLowerCase("de");
  const matches = (item: {
    title: string;
    text?: string;
    detail?: string;
    tags: string;
    points?: readonly string[];
  }) =>
    !normalized ||
    [item.title, item.text, item.detail, item.tags, ...(item.points ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("de")
      .includes(normalized);
  const filteredWorkflows = workflows.filter(matches);
  const filteredTopics = topics.filter(matches);
  const empty = !filteredWorkflows.length && !filteredTopics.length;

  function startTour() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await restartProductTour();
        if (!result.ok) return;
        window.dispatchEvent(new Event("rentmetric:start-tour"));
      } catch {
        setMessage(
          "Die Produkttour konnte nicht gestartet werden. Bitte versuchen Sie es erneut.",
        );
      }
    });
  }

  return (
    <div className="help-center">
      <header className="help-hero">
        <div>
          <span className="eyebrow">Hilfe &amp; Anleitungen</span>
          <h1>Schnell die richtige Funktion finden</h1>
          <p>
            Konkrete Wege durch Rentmetric – vom ersten Objekt bis zur geprüften
            Betriebskostenabrechnung.
          </p>
        </div>
        <button
          className="btn help-tour-button"
          type="button"
          disabled={pending}
          onClick={startTour}
        >
          <Play size={16} />{" "}
          {pending ? "Tour wird vorbereitet …" : "Kurze Produkttour starten"}
        </button>
      </header>
      {message && (
        <p className="help-error" role="alert">
          {message}
        </p>
      )}
      <label className="help-search">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Hilfe durchsuchen</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Wonach suchen Sie? Zum Beispiel Betriebskosten oder Mieterlink"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Suche zurücksetzen"
          >
            <X size={18} />
          </button>
        )}
      </label>

      {empty ? (
        <section className="help-empty" aria-live="polite">
          <CircleHelp size={28} />
          <h2>Keine passende Anleitung gefunden</h2>
          <p>
            Versuchen Sie einen allgemeineren Begriff oder öffnen Sie wieder
            alle Themen.
          </p>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setQuery("")}
          >
            Alle Hilfeinhalte anzeigen
          </button>
        </section>
      ) : (
        <>
          {filteredWorkflows.length > 0 && (
            <section
              className="help-section"
              aria-labelledby="help-workflows-title"
            >
              <div className="help-section-heading">
                <span>Direkt zum Ziel</span>
                <h2 id="help-workflows-title">Häufige Aufgaben</h2>
              </div>
              <div className="help-workflows">
                {filteredWorkflows.map(({ title, detail, href, Icon }) => (
                  <Link href={href} key={title} className="help-workflow">
                    <span>
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </div>
                    <ArrowRight size={17} />
                  </Link>
                ))}
              </div>
            </section>
          )}
          {filteredTopics.length > 0 && (
            <section
              className="help-section"
              aria-labelledby="help-topics-title"
            >
              <div className="help-section-heading">
                <span>Nach Themen</span>
                <h2 id="help-topics-title">Was möchten Sie verwalten?</h2>
              </div>
              <div className="help-topics">
                {filteredTopics.map(
                  ({ title, text, points, href, link, Icon }) => (
                    <article className="help-topic" key={title}>
                      <div className="help-topic-icon">
                        <Icon size={20} />
                      </div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                      <ul>
                        {points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                      <Link href={href}>
                        {link}
                        <ArrowRight size={15} />
                      </Link>
                    </article>
                  ),
                )}
              </div>
            </section>
          )}
        </>
      )}

      {!normalized && (
        <>
          <section
            className="help-section help-map"
            aria-labelledby="help-map-title"
          >
            <div className="help-section-heading">
              <span>Orientierung</span>
              <h2 id="help-map-title">Wo finde ich was?</h2>
            </div>
            <div>
              {navigationMap.map(([label, purpose, href]) => (
                <Link href={href} key={label}>
                  <strong>{label}</strong>
                  <span>{purpose}</span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </section>
          <section className="help-safety" aria-labelledby="help-safety-title">
            <div>
              <ShieldCheck size={23} />
              <span>
                <span className="eyebrow">Sicher arbeiten</span>
                <h2 id="help-safety-title">Kontrolle bleibt bei Ihnen</h2>
              </span>
            </div>
            <ul>
              <li>
                Objekte und Einheiten werden zuerst archiviert und erst danach
                endgültig gelöscht.
              </li>
              <li>
                Mieterlinks sind tokenbasiert; Freigaben und Dokumente bleiben
                auf das Mietverhältnis begrenzt.
              </li>
              <li>
                Dokumente werden nur den ausgewählten Datensätzen und
                Portalbereichen zugeordnet.
              </li>
              <li>
                Mietspiegel-Auswertungen und mögliche Mieterhöhungen werden
                niemals automatisch rechtlich freigegeben.
              </li>
            </ul>
          </section>
          <aside className="help-tip">
            <Upload size={18} />
            <span>
              <strong>Viele Daten auf einmal?</strong> Laden Sie im Datenimport
              eine passende CSV-Vorlage herunter oder erfassen Sie mehrere
              Zeilen direkt.
            </span>
            <Link href="/app/bulk">Datenimport öffnen</Link>
          </aside>
        </>
      )}
    </div>
  );
}
