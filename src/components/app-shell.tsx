import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  FileText,
  Gauge,
  House,
  Search,
  UsersRound,
} from "lucide-react";
import { navItems } from "@/lib/demo-data";
import { productConfig } from "@/config/product";
import { getSessionContext } from "@/auth/session";

const navIcons = [Gauge, Building2, UsersRound, CalendarClock, House];

export async function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  const session = await getSessionContext();
  const displayName = session?.displayName || "Portfolio-Inhaber";
  const organizationName = session?.organizationName || "Demo-Arbeitsbereich";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Hauptnavigation">
        <Link className="brand" href="/app/dashboard"><span className="brand-mark">R</span><span>{productConfig.name}</span></Link>
        <div className="workspace-switch" aria-label={`Aktiver Arbeitsbereich: ${organizationName}`}>
          <span className="workspace-icon"><Building2 size={16} /></span>
          <span><small>Arbeitsbereich</small><strong>{organizationName}</strong></span>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        <p className="nav-label">Portfolio</p>
        <nav className="nav-list">
          {navItems.map((item, index) => {
            const Icon = navIcons[index];
            return <Link key={item.href} href={item.href} className={`nav-link ${active === item.href ? "active" : ""}`} aria-current={active === item.href ? "page" : undefined}><span className="nav-icon-well"><Icon size={16} strokeWidth={1.9} /></span><span>{item.label}</span></Link>;
          })}
        </nav>
        <p className="nav-label">Ablage &amp; Freigaben</p>
        <nav className="nav-list">
          <Link href="/app/documents" className={`nav-link ${active === "/app/documents" ? "active" : ""}`} aria-current={active === "/app/documents" ? "page" : undefined}><span className="nav-icon-well"><FileText size={16} strokeWidth={1.9} /></span><span>Dokumente</span></Link>
          <Link href="/share/demo" className="nav-link"><span className="nav-icon-well"><ExternalLink size={16} strokeWidth={1.9} /></span><span>Mieteransicht</span></Link>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user"><span className="avatar avatar-small">{initials}</span><span><strong>{displayName}</strong><small>Fiktive Vorschau · 8 Einheiten</small></span></div>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <Link className="mobile-brand" href="/app/dashboard"><span className="brand-mark">R</span>{productConfig.name}</Link>
          <div className="system-status" aria-label="Globale Suche ist in Vorbereitung"><Search size={16} aria-hidden="true" /><span><strong>Globale Suche</strong><small>In Vorbereitung</small></span></div>
          <div className="top-actions"><span className="preview-status"><span className="status-dot" /> Vorschau</span><span className="notification-status" aria-label="Keine neuen Benachrichtigungen"><Bell size={17} /><i /></span><span className="avatar" aria-label={`Profil von ${displayName}`}>{initials}</span></div>
        </header>
        <div className="content">{children}</div>
        <nav className="mobile-nav" aria-label="Mobile Navigation">
          {navItems.map((item, index) => { const Icon = navIcons[index]; return <Link key={item.href} href={item.href} className={active === item.href ? "active" : ""} aria-current={active === item.href ? "page" : undefined}><Icon size={20} strokeWidth={active === item.href ? 2.3 : 1.8} /><span>{item.label.replace(" & Fristen", "")}</span></Link>; })}
        </nav>
      </main>
    </div>
  );
}
