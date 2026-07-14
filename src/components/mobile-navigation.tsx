"use client";

import Link from "next/link";
import {
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  Contact,
  FileText,
  FileUp,
  Gauge,
  House,
  Menu,
  ReceiptText,
  Settings,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const primary = [
  { href: "/app/dashboard", label: "Übersicht", shortLabel: "Übersicht", Icon: Gauge },
  { href: "/app/properties", label: "Immobilien", shortLabel: "Objekte", Icon: Building2 },
  { href: "/app/tenancies", label: "Mietverhältnisse", shortLabel: "Mieten", Icon: UsersRound },
  { href: "/app/tasks", label: "Aufgaben & Fristen", shortLabel: "Aufgaben", Icon: CalendarClock },
] as const;

const more = [
  { href: "/app/profile", label: "Mein Profil", Icon: UserRound },
  { href: "/app/bulk", label: "Datenimport", Icon: FileUp },
  { href: "/app/rent-index", label: "Mietspiegel", Icon: House },
  { href: "/app/payments", label: "Zahlungen", Icon: Banknote },
  { href: "/app/documents", label: "Dokumente", Icon: FileText },
  { href: "/app/notifications", label: "Benachrichtigungen", Icon: Bell },
  { href: "/app/utilities", label: "Betriebskosten", Icon: ReceiptText },
  { href: "/app/maintenance", label: "Wartung & Fälle", Icon: Wrench },
  { href: "/app/contacts", label: "Kontakte", Icon: Contact },
  { href: "/app/analytics", label: "Analyse", Icon: ChartNoAxesCombined },
  { href: "/app/settings", label: "Einstellungen", Icon: Settings },
] as const;

export function MobileNavigation({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const moreActive = more.some((item) => item.href === active);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === "Tab") {
        const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {open && (
        <div className="mobile-more-layer">
          <button className="mobile-more-backdrop" aria-label="Menü schließen" onClick={close} />
          <section ref={sheetRef} className="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
            <header>
              <div>
                <span className="eyebrow">Navigation</span>
                <h2 id="mobile-more-title">Weitere Bereiche</h2>
              </div>
              <button className="mobile-more-close" type="button" onClick={() => { close(); triggerRef.current?.focus(); }} aria-label="Menü schließen">
                <X size={20} />
              </button>
            </header>
            <nav className="mobile-more-grid" aria-label="Weitere Bereiche">
              {more.map(({ href, label, Icon }, index) => (
                <Link ref={index === 0 ? firstLinkRef : undefined} key={href} href={href} onClick={close} className={active === href ? "active" : ""} aria-current={active === href ? "page" : undefined}>
                  <span><Icon size={18} /></span>
                  {label}
                </Link>
              ))}
            </nav>
          </section>
        </div>
      )}
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {primary.map(({ href, label, shortLabel, Icon }) => (
          <Link key={href} href={href} className={active === href ? "active" : ""} aria-current={active === href ? "page" : undefined}>
            <Icon size={20} strokeWidth={active === href ? 2.3 : 1.8} />
            <span>{shortLabel ?? label}</span>
          </Link>
        ))}
        <button ref={triggerRef} type="button" className={moreActive ? "active" : ""} onClick={() => setOpen((value) => !value)} aria-haspopup="dialog" aria-expanded={open}>
          <Menu size={20} strokeWidth={moreActive ? 2.3 : 1.8} />
          <span>Mehr</span>
        </button>
      </nav>
    </>
  );
}
