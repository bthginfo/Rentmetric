import Link from "next/link";
import { productConfig } from "@/config/product";

export default function Home() {
  return (
    <main className="entry">
      <section className="entry-story">
        <Link className="brand" href="/"><span className="brand-mark">R</span>{productConfig.name}</Link>
        <div className="entry-copy">
          <span className="eyebrow">Die ruhige Seite der Vermietung</span>
          <h1>Wissen, was heute zählt.</h1>
          <p>Immobilien, Mieten, Dokumente und Fristen in einem verlässlichen Arbeitsbereich — mit nachvollziehbaren Quellen und ohne Benachrichtigungschaos.</p>
        </div>
        <div className="entry-proof"><span>Für private und kleine professionelle Vermieter</span><span>Made for Germany</span><span>Datenschutzbewusst entwickelt</span></div>
      </section>
      <section className="entry-panel" aria-labelledby="login-title">
        <span className="eyebrow">Willkommen zurück</span>
        <h2 id="login-title">Arbeitsbereich öffnen</h2>
        <p>Diese Vorschau nutzt einen sicheren Demo-Zugang. Es werden keine echten Mieterdaten angezeigt.</p>
        <form action="/app/dashboard">
          <div className="form-field"><label htmlFor="email">E-Mail-Adresse</label><input id="email" type="email" defaultValue="julia@demo.rentmetric.de" autoComplete="email" /></div>
          <div className="form-field"><label htmlFor="password">Passwort</label><input id="password" type="password" defaultValue="rentmetric-demo" autoComplete="current-password" /></div>
          <button className="btn btn-primary" type="submit">Demo-Arbeitsbereich öffnen →</button>
        </form>
        <div className="demo-link">Oder <Link href="/share/demo">öffentliche Mieterfreigabe ansehen</Link></div>
      </section>
    </main>
  );
}
