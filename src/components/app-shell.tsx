import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Banknote,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronDown,
  Contact,
  FileText,
  Gauge,
  House,
  ReceiptText,
  Settings,
  UsersRound,
  Wrench,
} from "lucide-react";
import { productConfig } from "@/config/product";
import { getSessionContext } from "@/auth/session";
import { GlobalSearch } from "@/components/global-search";
import { ThemeControl } from "@/components/theme-control";
import { ensureSmartNotifications } from "@/lib/smart-notifications";
import { countUnreadNotifications } from "@/repositories/notifications";

const navIcons = [Gauge, Building2, UsersRound, CalendarClock, House];
const navItems = [
  { href: "/app/dashboard", label: "Übersicht" },
  { href: "/app/properties", label: "Immobilien" },
  { href: "/app/tenancies", label: "Mietverhältnisse" },
  { href: "/app/tasks", label: "Aufgaben & Fristen" },
  { href: "/app/rent-index", label: "Mietspiegel" },
] as const;
export async function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const session = await getSessionContext();
  const displayName = session?.displayName || "Portfolio-Inhaber";
  const organizationName = session?.organizationName || "Demo-Arbeitsbereich";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  let unread = 0;
  if (session) {
    await ensureSmartNotifications(session.organizationId, session.userId);
    unread = await countUnreadNotifications(
      session.organizationId,
      session.userId,
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Hauptnavigation">
        <Link className="brand" href="/app/dashboard">
          <Image
            className="brand-logo"
            src="/logo-rm.png"
            width={38}
            height={38}
            alt=""
            priority
          />
          <span>{productConfig.name}</span>
        </Link>
        <div
          className="workspace-switch"
          aria-label={`Aktiver Arbeitsbereich: ${organizationName}`}
        >
          <span className="workspace-icon">
            <Building2 size={16} />
          </span>
          <span>
            <small>Arbeitsbereich</small>
            <strong>{organizationName}</strong>
          </span>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        <p className="nav-label">Portfolio</p>
        <nav className="nav-list">
          {navItems.map((item, index) => {
            const Icon = navIcons[index];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active === item.href ? "active" : ""}`}
                aria-current={active === item.href ? "page" : undefined}
              >
                <span className="nav-icon-well">
                  <Icon size={16} strokeWidth={1.9} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="nav-label">Ablage &amp; Kommunikation</p>
        <nav className="nav-list">
          <Link
            href="/app/payments"
            className={`nav-link ${active === "/app/payments" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <Banknote size={16} />
            </span>
            <span>Zahlungen</span>
          </Link>
          <Link
            href="/app/documents"
            className={`nav-link ${active === "/app/documents" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <FileText size={16} />
            </span>
            <span>Dokumente</span>
          </Link>
          <Link
            href="/app/notifications"
            className={`nav-link ${active === "/app/notifications" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <Bell size={16} />
            </span>
            <span>Benachrichtigungen</span>
            {unread > 0 && <b className="nav-count">{Math.min(unread, 99)}</b>}
          </Link>
        </nav>
        <p className="nav-label">Betrieb &amp; Auswertung</p>
        <nav className="nav-list">
          <Link
            href="/app/utilities"
            className={`nav-link ${active === "/app/utilities" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <ReceiptText size={16} />
            </span>
            <span>Betriebskosten</span>
          </Link>
          <Link
            href="/app/maintenance"
            className={`nav-link ${active === "/app/maintenance" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <Wrench size={16} />
            </span>
            <span>Wartung &amp; Fälle</span>
          </Link>
          <Link
            href="/app/contacts"
            className={`nav-link ${active === "/app/contacts" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <Contact size={16} />
            </span>
            <span>Kontakte</span>
          </Link>
          <Link
            href="/app/analytics"
            className={`nav-link ${active === "/app/analytics" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <ChartNoAxesCombined size={16} />
            </span>
            <span>Analyse</span>
          </Link>
          <Link
            href="/app/settings"
            className={`nav-link ${active === "/app/settings" ? "active" : ""}`}
          >
            <span className="nav-icon-well">
              <Settings size={16} />
            </span>
            <span>Einstellungen</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar avatar-small">{initials}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{organizationName}</small>
            </span>
          </div>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <Link className="mobile-brand" href="/app/dashboard">
            <Image
              className="brand-logo"
              src="/logo-rm.png"
              width={29}
              height={29}
              alt=""
            />
            {productConfig.name}
          </Link>
          <GlobalSearch />
          <div className="top-actions">
            <ThemeControl />
            <span className="preview-status">
              <span className="status-dot" /> Live
            </span>
            <Link
              className="notification-status"
              href="/app/notifications"
              aria-label={`${unread} ungelesene Benachrichtigungen`}
            >
              <Bell size={17} />
              {unread > 0 && <i>{unread > 9 ? "9+" : unread}</i>}
            </Link>
            <span className="avatar" aria-label={`Profil von ${displayName}`}>
              {initials}
            </span>
          </div>
        </header>
        <div className="content">{children}</div>
        <nav className="mobile-nav" aria-label="Mobile Navigation">
          {navItems.map((item, index) => {
            const Icon = navIcons[index];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active === item.href ? "active" : ""}
                aria-current={active === item.href ? "page" : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={active === item.href ? 2.3 : 1.8}
                />
                <span>{item.label.replace(" & Fristen", "")}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
