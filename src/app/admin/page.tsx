import { and, count, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { AdminPageHeader, AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db/client";
import { billingPlans, organizations, platformAdminSessions, users } from "@/db/schema";
import { requireAdminSession } from "@/admin/session";

export default async function AdminDashboardPage() {
  await requireAdminSession();
  const db = getDb();
  const [[userCount], [orgCount], [sessionCount], [planCount]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(organizations),
    db.select({ value: count() }).from(platformAdminSessions).where(gt(platformAdminSessions.expiresAt, new Date())),
    db.select({ value: count() }).from(billingPlans).where(and(eq(billingPlans.active, true), eq(billingPlans.public, true))),
  ]);
  return <AdminShell active="/admin">
    <AdminPageHeader eyebrow="Platform Control" title="Betriebsübersicht" description="Nutzer, Zugänge und kommerzielle Konfiguration zentral im Blick." />
    <section className="admin-kpis">
      <article><span>Nutzerkonten</span><strong>{userCount.value}</strong><Link href="/admin/users">Verwalten →</Link></article>
      <article><span>Organisationen</span><strong>{orgCount.value}</strong><small>Mandanten im System</small></article>
      <article><span>Aktive Admin-Sitzungen</span><strong>{sessionCount.value}</strong><small>nicht abgelaufen</small></article>
      <article><span>Öffentliche Pläne</span><strong>{planCount.value}</strong><Link href="/admin/pricing">Preise konfigurieren →</Link></article>
    </section>
    <section className="admin-card admin-callout"><div><span className="admin-eyebrow">Monetarisierung</span><h2>Preise sind vorbereitet, Zahlungen noch nicht.</h2><p>Pläne und Sichtbarkeit können bereits gepflegt werden. Checkout, Rechnungsstellung und Zahlungsanbieter bleiben bewusst deaktiviert, bis sie angebunden sind.</p></div><Link className="admin-primary" href="/admin/pricing">Preispläne öffnen</Link></section>
  </AdminShell>;
}
