import Link from "next/link";
import { Building2, CalendarClock, ExternalLink, Gauge, House, Search, UsersRound } from "lucide-react";
import { navItems } from "@/lib/demo-data";
import { productConfig } from "@/config/product";

const navIcons = [Gauge, Building2, UsersRound, CalendarClock, House];

export function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Hauptnavigation">
        <Link className="brand" href="/app/dashboard"><span className="brand-mark">R</span>{productConfig.name}</Link>
        <div className="workspace-switch"><small>Arbeitsbereich</small><strong>Hausverwaltung Rhein &amp; Co.</strong></div>
        <p className="nav-label">Arbeitsbereich</p>
        <nav className="nav-list">
          {navItems.map((item, index) => { const Icon = navIcons[index]; return <Link key={item.href} href={item.href} className={`nav-link ${active === item.href ? "active" : ""}`} aria-current={active === item.href ? "page" : undefined}><Icon className="nav-glyph" size={15} strokeWidth={1.6} />{item.label}</Link>; })}
        </nav>
        <p className="nav-label">Freigaben</p>
        <nav className="nav-list"><Link href="/share/demo" className="nav-link"><ExternalLink className="nav-glyph" size={15} strokeWidth={1.6} />Mieteransicht</Link></nav>
        <div className="sidebar-footer"><span><span className="status-dot" /> Datenstand aktuell</span><strong>8 Einheiten · 2 Objekte</strong>Demo-Arbeitsbereich</div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <Link className="mobile-brand" href="/app/dashboard">{productConfig.name}</Link>
          <div className="system-status"><Search size={15} strokeWidth={1.6} aria-hidden="true" /><span><strong>Globale Suche</strong> · folgt im nächsten Ausbau</span></div>
          <div className="top-actions"><span className="eyebrow"><span className="status-dot" /> Demo</span><span className="avatar" aria-label="Profil von Julia Rhein">JR</span></div>
        </header>
        <div className="content">{children}</div>
        <nav className="mobile-nav" aria-label="Mobile Navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href} className={active === item.href ? "active" : ""}>{item.label}</Link>)}
        </nav>
      </main>
    </div>
  );
}
