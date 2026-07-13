import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Check,
  FileText,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { productConfig } from "@/config/product";

export default function Home() {
  return (
    <main className="entry">
      <nav className="entry-nav" aria-label="Startnavigation">
        <Link className="brand" href="/">
          <span className="brand-mark">R</span>
          <span>{productConfig.name}</span>
        </Link>
        <div>
          <Link href="/register" className="entry-nav-link">
            Arbeitsbereich anlegen
          </Link>
          <Link href="/login" className="btn btn-quiet">
            Anmelden
          </Link>
        </div>
      </nav>
      <section className="entry-story">
        <div className="entry-copy">
          <span className="hero-kicker">
            <Sparkles size={14} /> Intelligenter vermieten
          </span>
          <h1>
            Ihr Portfolio.
            <br />
            <span>Ganz leicht im Blick.</span>
          </h1>
          <p>
            Rentmetric verbindet Immobilien, Mieten, Dokumente und Fristen in
            einem ruhigen Arbeitsbereich — nachvollziehbar, sicher und für
            Deutschland gedacht.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-large" href="/register">
              Kostenlos starten <ArrowRight size={17} />
            </Link>
            <Link className="btn btn-large" href="/login">
              Arbeitsbereich öffnen
            </Link>
          </div>
          <div className="entry-proof">
            <span>
              <Check size={14} /> Regelbasierte Hinweise
            </span>
            <span>
              <Check size={14} /> Keine echten Daten in der Vorschau
            </span>
            <span>
              <LockKeyhole size={14} /> Datenschutzbewusst
            </span>
          </div>
        </div>
        <div
          className="device-stage"
          aria-label="Vorschau des Rentmetric Dashboards"
        >
          <div className="device-window">
            <div className="device-top">
              <span className="device-dots">
                <i />
                <i />
                <i />
              </span>
              <strong>Montag, 13. Juli</strong>
              <span className="device-avatar">JR</span>
            </div>
            <div className="device-body">
              <aside className="device-side">
                <span className="mini-brand">R</span>
                <i className="selected">
                  <Building2 size={16} />
                </i>
                <i>
                  <CalendarCheck size={16} />
                </i>
                <i>
                  <FileText size={16} />
                </i>
              </aside>
              <div className="device-content">
                <small>Guten Morgen, Julia.</small>
                <h2>Heute ist alles im Blick.</h2>
                <div className="device-kpis">
                  <div>
                    <span>Sollmiete</span>
                    <strong>7.420 €</strong>
                  </div>
                  <div>
                    <span>Eingegangen</span>
                    <strong>84 %</strong>
                  </div>
                  <div>
                    <span>Belegt</span>
                    <strong>7 / 8</strong>
                  </div>
                </div>
                <div className="device-brief">
                  <div className="health-ring">
                    <span>
                      88<small>%</small>
                    </span>
                  </div>
                  <div>
                    <span>Portfolio-Status</span>
                    <strong>Gut aufgestellt</strong>
                    <p>2 Aufgaben benötigen heute Ihre Aufmerksamkeit.</p>
                  </div>
                </div>
                <div className="device-task urgent">
                  <i />
                  <span>
                    <small>Heute</small>
                    <strong>Mieteingang prüfen</strong>
                  </span>
                  <b>1.180 €</b>
                </div>
                <div className="device-task">
                  <i />
                  <span>
                    <small>18. Juli</small>
                    <strong>Wartung terminieren</strong>
                  </span>
                  <b>5 Tage</b>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-note">
            <span>
              <CalendarCheck size={17} />
            </span>
            <div>
              <small>Nächste Frist</small>
              <strong>In 5 Tagen</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
