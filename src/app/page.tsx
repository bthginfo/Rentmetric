import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  FileCheck2,
  FileText,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { LandingProductTour } from "@/components/landing-product-tour";
import { productConfig } from "@/config/product";
import { getDb } from "@/db/client";
import { billingPlans } from "@/db/schema";
import { billingIntervalLabels, formatPlanPrice } from "@/domain/billing";

async function getPublicPlans() {
  try {
    return await getDb().select().from(billingPlans).where(and(eq(billingPlans.active, true), eq(billingPlans.public, true))).orderBy(asc(billingPlans.amountCents));
  } catch {
    return [];
  }
}

const tour = [
  { src: "/landing/dashboard.jpg", eyebrow: "Tagesübersicht", title: "Prioritäten statt Tabellenchaos", copy: "Mieten, Fristen und Portfolio-Kennzahlen auf einen Blick." },
  { src: "/landing/property.jpg", eyebrow: "Objekt-Dossier", title: "Vom Gebäude bis zur Einheit", copy: "Stammdaten, Ausstattung, Mietverlauf und Dokumente sauber verbunden." },
  { src: "/landing/utilities.jpg", eyebrow: "Betriebskosten", title: "Abrechnung Schritt für Schritt", copy: "Kosten erfassen, verteilen, prüfen und nachvollziehbar abschließen." },
  { src: "/landing/analytics.jpg", eyebrow: "Portfolio Intelligence", title: "Zahlen, die zu Entscheidungen führen", copy: "Zeiträume vergleichen, Kosten verstehen und Potenziale erkennen." },
];

export default async function Home() {
  const plans = await getPublicPlans();
  return (
    <main className="sales-page">
      <nav className="sales-nav" aria-label="Startnavigation">
        <Link className="brand" href="#top"><Image className="brand-logo" src="/logo-rm.png" width={38} height={38} alt="Rentmetric Logo" priority /><span>{productConfig.name}</span></Link>
        <div className="sales-anchor-nav"><a href="#funktionen">Funktionen</a><a href="#produkt">Produkt</a><a href="#sicherheit">Sicherheit</a><a href="#preise">Preise</a><a href="#faq">FAQ</a></div>
        <div className="sales-nav-actions"><Link href="/login" className="sales-login">Anmelden</Link><Link href="/register" className="btn btn-primary" aria-label="Kostenlos starten"><span className="sales-register-label-desktop" aria-hidden="true">Kostenlos starten</span><span className="sales-register-label-mobile" aria-hidden="true">Starten</span></Link></div>
      </nav>

      <section className="sales-hero" id="top">
        <div className="sales-hero-copy">
          <span className="hero-kicker"><Sparkles size={14} /> Immobilienverwaltung, die mitdenkt</span>
          <h1>Weniger suchen.<br /><span>Mehr richtig entscheiden.</span></h1>
          <p>Rentmetric verbindet Objekte, Mietverhältnisse, Zahlungen, Fristen und Dokumente in einem ruhigen Arbeitsbereich – für private Vermieter und kleine Hausverwaltungen.</p>
          <div className="hero-actions"><Link className="btn btn-primary btn-large" href="/register">Arbeitsbereich anlegen <ArrowRight size={17} /></Link><a className="btn btn-large" href="#produkt">Produkt ansehen</a></div>
          <div className="entry-proof"><span><Check size={14} /> Regelbasierte Erinnerungen</span><span><Check size={14} /> Mieterportal inklusive</span><span><LockKeyhole size={14} /> Getrennte Mandanten</span></div>
        </div>
        <div className="sales-hero-product" aria-label="Rentmetric Produktvorschau">
          <div className="hero-browser"><div className="hero-browser-bar"><i /><i /><i /><span>rentmetric · Übersicht</span></div><Image src="/landing/dashboard.jpg" width={1280} height={800} alt="Sanitisierte Rentmetric Dashboard-Vorschau" priority /></div>
          <div className="hero-signal"><CalendarCheck size={18} /><span><small>Nächste Frist</small><strong>in 5 Tagen</strong></span></div>
          <div className="hero-signal second"><BarChart3 size={18} /><span><small>Mieteingang</small><strong>vollständig im Blick</strong></span></div>
        </div>
      </section>

      <section className="sales-value-strip" aria-label="Produktvorteile"><span><strong>Ein System</strong> für Portfolio, Betrieb und Kommunikation</span><span><strong>Nachvollziehbar</strong> durch Historien und klare Zustände</span><span><strong>Flexibel</strong> mit Upload oder manueller Eingabe</span></section>

      <section className="sales-features" id="funktionen">
        <header className="sales-section-head"><span>Ein Arbeitsbereich, kein Flickenteppich</span><h2>Vom Mietvertrag bis zur Abrechnung.</h2><p>Die wichtigsten Abläufe greifen ineinander, ohne dass Sie Ihre Arbeitsweise neu erfinden müssen.</p></header>
        <article className="feature-story"><div className="feature-number">01</div><div><span className="feature-icon"><Building2 /></span><h3>Portfolio mit echtem Kontext</h3><p>Objekte, Wohnungen, Ausstattung, Bilder, Mieter und Mietverläufe bleiben miteinander verknüpft. Jede Information ist dort, wo sie gebraucht wird.</p><ul><li>Objekt- und Wohnungsdossiers</li><li>Mieter- und Vertragshistorie</li><li>Dokumente direkt am Datensatz</li></ul></div><div className="feature-visual portfolio-visual"><div><small>Kastanienhof</small><strong>8 Einheiten</strong><span>7 vermietet</span></div><div><small>1. OG links</small><strong>88 m²</strong><span>1.188 € Kaltmiete</span></div></div></article>
        <article className="feature-story reverse"><div className="feature-number">02</div><div><span className="feature-icon"><CalendarCheck /></span><h3>Fristen, die nicht mehr im Kalender verschwinden</h3><p>Rentmetric leitet aus gespeicherten Daten konkrete Aufgaben ab – von Vertragsfristen bis zu möglichen Mietanpassungen. Sie entscheiden, was passiert.</p><ul><li>Priorisiertes Aktionscenter</li><li>Wiederkehrende Erinnerungen</li><li>Keine automatische Rechtsentscheidung</li></ul></div><div className="feature-visual task-visual"><span><i className="urgent" />Mieteingang prüfen <b>Heute</b></span><span><i />Wartung terminieren <b>5 Tage</b></span><span><i className="done" />Versicherung dokumentiert <b>Erledigt</b></span></div></article>
        <article className="feature-story"><div className="feature-number">03</div><div><span className="feature-icon"><SearchCheck /></span><h3>Mietspiegel vom Dokument zur Prüfung</h3><p>PDF-, Excel- und Katalogquellen lassen sich importieren, prüfen und manuell korrigieren. Quellen gelten immer für die passende Stadt oder das passende Viertel.</p><ul><li>Geführter Import mit Kontrollschritt</li><li>Stadt-, Viertel- und Gebietsebenen</li><li>Nachvollziehbare Bewertungsgrundlage</li></ul></div><div className="feature-visual rent-index-visual"><small>Quelle geprüft</small><strong>Mietspiegel 2025</strong><span>München · Stadtgebiet</span><div><i />Basiswerte <i />Merkmale <i />Gebiet</div></div></article>
        <article className="feature-story reverse"><div className="feature-number">04</div><div><span className="feature-icon"><ReceiptText /></span><h3>Betriebskosten vollständig abrechnen</h3><p>Belege und Kosten manuell oder per Upload erfassen, Umlageschlüssel prüfen, Nutzerwechsel berücksichtigen und die Abrechnung je Einheit erstellen.</p><ul><li>Perioden und Kostenpositionen</li><li>Fläche, Einheiten oder Verbrauch</li><li>Prüfbarer Abschluss je Mietverhältnis</li></ul></div><div className="feature-visual steps-visual"><span className="done"><b>1</b>Kosten erfassen</span><span className="active"><b>2</b>Verteilung prüfen</span><span><b>3</b>Abrechnung abschließen</span></div></article>
        <div className="feature-pair"><article><FileText /><h3>Dokumente & Mieterportal</h3><p>Dokumente am Objekt, an der Einheit oder am Mietverhältnis ablegen. Mieter sehen freigegebene Inhalte und melden Schäden strukturiert.</p></article><article><Wrench /><h3>Wartung & Fälle</h3><p>Meldungen kategorisieren, Dienstleister zuordnen, Termine und Kosten dokumentieren – mit sichtbarem Status für den Mieter.</p></article><article><BarChart3 /><h3>Analyse & Potenziale</h3><p>Zeiträume flexibel auswerten, Mieteingänge, Betriebskosten und Instandhaltung vergleichen und Datenlücken sichtbar machen.</p></article></div>
      </section>

      <section className="product-film" id="produkt"><header><span>Produktfilm ohne Video</span><h2>Einmal durch den Arbeitsalltag scrollen.</h2><p>Vier echte, sanitisierte Ansichten aus dem fiktiven Demo-Arbeitsbereich. Mit Pfeiltasten oder den Bedienelementen navigierbar.</p></header><LandingProductTour items={tour} /></section>

      <section className="sales-how"><header className="sales-section-head"><span>In drei Schritten startklar</span><h2>Einrichten, verbinden, den Überblick gewinnen.</h2></header><ol><li><span>01</span><div><h3>Portfolio anlegen</h3><p>Gebäude, Einheiten und bestehende Mietverhältnisse erfassen.</p></div></li><li><span>02</span><div><h3>Daten vervollständigen</h3><p>Dokumente, Zahlungen, Fristen und Kosten hinzufügen – per Upload oder manuell.</p></div></li><li><span>03</span><div><h3>Mit Rentmetric arbeiten</h3><p>Aufgaben priorisieren, Abrechnungen erstellen und Entwicklungen auswerten.</p></div></li></ol></section>

      <section className="sales-security" id="sicherheit"><div><span className="feature-icon"><ShieldCheck /></span><span className="sales-overline">Sicherheit als Systemgrenze</span><h2>Ihre Daten bleiben in Ihrem Arbeitsbereich.</h2><p>Rentmetric trennt Organisationen technisch voneinander. Nutzer- und Plattformadministration verwenden getrennte Sitzungen. Freigaben an Mieter sind zeitlich begrenzbar und jederzeit widerrufbar.</p><div className="security-points"><span><LockKeyhole /> Sichere Passwort-Hashes</span><span><KeyRound /> Widerrufbare Sitzungen</span><span><FileCheck2 /> Nachvollziehbare Änderungen</span></div></div><aside><small>Mandant A</small><div>Objekte · Mieter · Dokumente</div><i>strikt getrennt</i><small>Mandant B</small><div>Objekte · Mieter · Dokumente</div></aside></section>

      <section className="sales-pricing" id="preise"><header className="sales-section-head"><span>Preise</span><h2>Passend zur Art, wie Sie vermieten.</h2><p>Keine versteckten Zahlungsversprechen: Ein Checkout wird erst angezeigt, wenn er tatsächlich verfügbar ist.</p></header>{plans.length ? <div className="pricing-list">{plans.map((plan) => <article key={plan.id}><span>{plan.code}</span><h3>{plan.name}</h3><p>{plan.description || "Rentmetric für Ihr Portfolio."}</p><strong>{formatPlanPrice(plan.amountCents, plan.currency)}</strong><small>{billingIntervalLabels[plan.interval]}</small><Link href="/register" className="btn btn-primary">Interesse vormerken</Link></article>)}</div> : <div className="beta-price"><span>Private Beta</span><h3>Der Preis folgt transparent vor dem öffentlichen Start.</h3><p>Sie können Rentmetric bereits testen. Eine Zahlung oder ein Abonnement wird aktuell nicht ausgelöst.</p><Link href="/register" className="btn btn-primary">Kostenlos testen</Link></div>}</section>

      <section className="sales-faq" id="faq"><header><span>FAQ</span><h2>Häufig gefragt.</h2></header><div><details><summary>Ersetzt Rentmetric eine Rechtsberatung?</summary><p>Nein. Rentmetric strukturiert Daten, Fristen und Prüfungen. Rechtlich relevante Entscheidungen bleiben bei Ihnen und sollten im Zweifel fachlich geprüft werden.</p></details><details><summary>Kann ich Daten auch manuell eingeben?</summary><p>Ja. Uploads sind eine Abkürzung, keine Voraussetzung. Zentrale Abläufe können Sie auch vollständig manuell pflegen.</p></details><details><summary>Was sehen meine Mieter?</summary><p>Nur Inhalte, die Sie über einen zeitlich begrenzten Mieterlink freigeben. Meldungen und Dokumente bleiben dem zugehörigen Mietverhältnis zugeordnet.</p></details><details><summary>Ist bereits eine Zahlung erforderlich?</summary><p>Nein. Solange kein öffentlicher Plan und kein Checkout aktiviert sind, wird weder eine Zahlung noch ein Abonnement ausgelöst.</p></details></div></section>

      <section className="sales-final"><MessageSquareText /><span>Bereit für weniger Verwaltungsrauschen?</span><h2>Bringen Sie Ihr Portfolio an einen ruhigen Ort.</h2><div><Link href="/register" className="btn btn-primary btn-large">Arbeitsbereich anlegen <ArrowRight size={17} /></Link><Link href="/login" className="btn btn-large">Anmelden</Link></div></section>
      <footer className="sales-footer"><Link className="brand" href="#top"><Image src="/logo-rm.png" width={30} height={30} alt="" /><span>Rentmetric</span></Link><p>Immobilien, Mieten und Fristen im Blick.</p><a href={`mailto:${productConfig.supportEmail}`}>Kontakt</a></footer>
    </main>
  );
}
