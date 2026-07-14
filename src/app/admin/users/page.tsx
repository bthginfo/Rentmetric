import { desc, eq, ilike, inArray, or } from "drizzle-orm";
import Form from "next/form";
import { AdminPageHeader, AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db/client";
import { organizationMemberships, organizations, sessions, users } from "@/db/schema";
import { resetUserPassword } from "../actions";
import { requireAdminSession } from "@/admin/session";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminSession();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);
  const limit = 25;
  const db = getDb();
  const condition = query ? or(ilike(users.username, `%${query}%`), ilike(users.displayName, `%${query}%`), ilike(users.email, `%${query}%`)) : undefined;
  const rows = await db.select({ id: users.id, username: users.username, displayName: users.displayName, email: users.email, createdAt: users.createdAt }).from(users).where(condition).orderBy(desc(users.createdAt)).limit(limit + 1).offset((page - 1) * limit);
  const visible = rows.slice(0, limit);
  const ids = visible.map((row) => row.id);
  const memberships = ids.length ? await db.select({ userId: organizationMemberships.userId, role: organizationMemberships.role, organization: organizations.name }).from(organizationMemberships).innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId)).where(inArray(organizationMemberships.userId, ids)) : [];
  const activities = ids.length ? await db.select({ userId: sessions.userId, lastSeenAt: sessions.lastSeenAt }).from(sessions).where(inArray(sessions.userId, ids)).orderBy(desc(sessions.lastSeenAt)) : [];
  const membershipsByUser = new Map<string, typeof memberships>();
  memberships.forEach((item) => membershipsByUser.set(item.userId, [...(membershipsByUser.get(item.userId) ?? []), item]));
  const activityByUser = new Map<string, Date>();
  activities.forEach((item) => { if (!activityByUser.has(item.userId)) activityByUser.set(item.userId, item.lastSeenAt); });
  return <AdminShell active="/admin/users">
    <AdminPageHeader eyebrow="Zugänge" title="Nutzerverwaltung" description="Konten suchen, Mandantenzuordnung prüfen und Zugang sicher zurücksetzen." />
    {(params.error || params.success) && <p className={`admin-feedback ${params.error ? "error" : "success"}`}>{String(params.error || params.success)}</p>}
    <Form action="/admin/users" className="admin-search"><label><span className="sr-only">Nutzer suchen</span><input name="q" defaultValue={query} placeholder="Name, Benutzername oder E-Mail" /></label><button className="admin-secondary">Suchen</button></Form>
    <div className="admin-user-list">
      {visible.map((user) => <article className="admin-card admin-user-row" key={user.id}>
        <div className="admin-user-main"><span className="admin-user-avatar">{(user.displayName || user.username).slice(0, 2).toUpperCase()}</span><div><h2>{user.displayName || user.username}</h2><p>@{user.username}{user.email ? ` · ${user.email}` : ""}</p></div></div>
        <div className="admin-user-meta"><span>Organisation</span><strong>{membershipsByUser.get(user.id)?.map((item) => `${item.organization} (${item.role})`).join(", ") || "Keine Zuordnung"}</strong></div>
        <div className="admin-user-meta"><span>Letzte Aktivität</span><strong>{activityByUser.get(user.id)?.toLocaleString("de-DE") || "Noch keine Sitzung"}</strong></div>
        <details className="admin-reset"><summary>Passwort neu setzen</summary><form action={resetUserPassword}><input type="hidden" name="userId" value={user.id} /><label><span>Neues Passwort</span><input type="password" name="newPassword" minLength={12} required autoComplete="new-password" /></label><label><span>Wiederholen</span><input type="password" name="confirmation" minLength={12} required autoComplete="new-password" /></label><p>Alle Sitzungen dieses Nutzers werden beendet.</p><button className="admin-danger">Passwort setzen</button></form></details>
      </article>)}
      {!visible.length && <div className="admin-card admin-empty"><h2>Keine Nutzer gefunden</h2><p>Versuche einen anderen Suchbegriff.</p></div>}
    </div>
    <nav className="admin-pagination" aria-label="Seitennavigation">{page > 1 && <a className="admin-secondary" href={`/admin/users?q=${encodeURIComponent(query)}&page=${page - 1}`}>← Zurück</a>}{rows.length > limit && <a className="admin-secondary" href={`/admin/users?q=${encodeURIComponent(query)}&page=${page + 1}`}>Weiter →</a>}</nav>
  </AdminShell>;
}
