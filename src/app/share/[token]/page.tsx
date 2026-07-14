import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { productConfig } from "@/config/product";
import { Badge, SectionHeading } from "@/components/ui";
import { ShareDocumentUploader } from "@/components/share-document-uploader";
import { TenantPortalCommunication } from "@/components/tenant-portal-communication";
import { getDb } from "@/db/client";
import {
  documents,
  maintenanceCases,
  maintenanceEvents,
  organizations,
  portalItemEntries,
  portalItems,
  properties,
  renters,
  shareLinks,
  tenancies,
  units,
} from "@/db/schema";
import { hashShareToken, type SharePermissions } from "@/domain/share-links";
import { createRenterMaintenanceReport } from "../actions";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token.length < 20 || token.length > 200) notFound();
  const db = getDb();
  const [data] = await db
    .select({
      share: shareLinks,
      tenancy: tenancies,
      renter: renters,
      unit: units,
      property: properties,
      organization: organizations,
    })
    .from(shareLinks)
    .innerJoin(tenancies, and(eq(tenancies.id, shareLinks.tenancyId), eq(tenancies.organizationId, shareLinks.organizationId)))
    .innerJoin(renters, and(eq(renters.id, tenancies.renterId), eq(renters.organizationId, shareLinks.organizationId)))
    .innerJoin(units, and(eq(units.id, tenancies.unitId), eq(units.organizationId, shareLinks.organizationId)))
    .innerJoin(properties, and(eq(properties.id, units.propertyId), eq(properties.organizationId, shareLinks.organizationId)))
    .innerJoin(organizations, eq(organizations.id, shareLinks.organizationId))
    .where(
      and(
        eq(shareLinks.tokenHash, hashShareToken(token)),
        isNull(shareLinks.revokedAt),
        gt(shareLinks.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!data) notFound();
  const permissions = data.share.permissions as SharePermissions;
  const reportsAllowed =
    permissions.reports ?? permissions.maintenanceReports ?? false;
  const communicationAllowed = permissions.communication === true;
  await db
    .update(shareLinks)
    .set({ lastAccessedAt: new Date(), updatedAt: new Date() })
    .where(eq(shareLinks.id, data.share.id));
  const sharedDocuments = permissions.documents
    ? await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, data.share.organizationId),
            eq(documents.tenancyId, data.tenancy.id),
            eq(documents.visibleToRenter, true),
          ),
        )
        .orderBy(documents.createdAt)
    : [];
  const renterCases = reportsAllowed ? await db.select({ id: maintenanceCases.id, title: maintenanceCases.title, category: maintenanceCases.category, status: maintenanceCases.status, createdAt: maintenanceCases.createdAt, scheduledAt: maintenanceCases.scheduledAt, resolvedAt: maintenanceCases.resolvedAt }).from(maintenanceCases).where(and(eq(maintenanceCases.organizationId, data.share.organizationId), eq(maintenanceCases.portalTenancyId, data.tenancy.id), eq(maintenanceCases.portalRenterId, data.renter.id), eq(maintenanceCases.portalVisible, true))).orderBy(maintenanceCases.createdAt) : [];
  const renterEvents = renterCases.length ? await db.select({ caseId: maintenanceEvents.caseId, note: maintenanceEvents.note, createdAt: maintenanceEvents.createdAt }).from(maintenanceEvents).where(and(eq(maintenanceEvents.organizationId, data.share.organizationId), inArray(maintenanceEvents.caseId, renterCases.map((item) => item.id)), eq(maintenanceEvents.portalVisible, true))).orderBy(maintenanceEvents.createdAt) : [];
  const communicationItems = communicationAllowed ? await db.select().from(portalItems).where(and(eq(portalItems.organizationId, data.share.organizationId), eq(portalItems.tenancyId, data.tenancy.id), isNull(portalItems.archivedAt))).orderBy(desc(portalItems.createdAt)) : [];
  const communicationEntries = communicationItems.length ? await db.select().from(portalItemEntries).where(and(eq(portalItemEntries.organizationId, data.share.organizationId), inArray(portalItemEntries.portalItemId, communicationItems.map((item) => item.id)))).orderBy(asc(portalItemEntries.createdAt)) : [];
  const reportAction = createRenterMaintenanceReport.bind(null, token);
  const dueDay = data.tenancy.rentDueDay ?? data.organization.rentDueDay;
  const now = new Date();
  const nextDueDate = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > dueDay ? 1 : 0), dueDay, 12);
  return (
    <main className="share-page">
      <header className="share-header">
        <span className="brand">
          <Image
            className="brand-logo"
            src="/logo-rm.png"
            width={34}
            height={34}
            alt="Rentmetric Logo"
          />
          {productConfig.name}
        </span>
        <span>
          Sichere Mieterfreigabe · gültig bis{" "}
          {date.format(data.share.expiresAt)}
        </span>
      </header>
      <div className="share-content">
        <section className="share-intro">
          <div>
            <span className="eyebrow">Ihre Mietübersicht</span>
            <h1>
              Guten Tag, {data.renter.firstName} {data.renter.lastName}.
            </h1>
            <p>
              {data.property.name} · {data.unit.label}
            </p>
          </div>
          <div className="scope">
            <strong>Privater, eingeschränkter Zugriff</strong>
            <br />
            Dieser Link zeigt nur ausdrücklich freigegebene Angaben Ihres
            Mietverhältnisses.
          </div>
        </section>
        {communicationAllowed && <TenantPortalCommunication token={token} items={communicationItems} entries={communicationEntries} readOnly={Boolean(data.tenancy.endsAt && data.tenancy.endsAt <= new Date())}/>}
        <div className="share-grid">
          {permissions.masterData && (
            <section>
              <SectionHeading
                title="Stammdaten"
                linkLabel={`Stand ${new Date().toLocaleDateString("de-DE")}`}
              />
              <dl className="definition-list">
                <div className="definition-row">
                  <dt>Adresse</dt>
                  <dd>
                    {data.property.street} {data.property.houseNumber},{" "}
                    {data.property.postalCode} {data.property.city}
                  </dd>
                </div>
                <div className="definition-row">
                  <dt>Einheit</dt>
                  <dd>
                    {data.unit.label}
                    {data.unit.areaSqm ? ` · ${data.unit.areaSqm} m²` : ""}
                  </dd>
                </div>
                <div className="definition-row">
                  <dt>Mietbeginn</dt>
                  <dd>{date.format(data.tenancy.startsAt)}</dd>
                </div>
                <div className="definition-row">
                  <dt>Kaltmiete</dt>
                  <dd>
                    {money.format(data.tenancy.coldRentCents / 100)} / Monat
                  </dd>
                </div>
                <div className="definition-row">
                  <dt>Nebenkosten</dt>
                  <dd>
                    {money.format(data.tenancy.utilityAdvanceCents / 100)} /
                    Monat
                  </dd>
                </div>
                <div className="definition-row">
                  <dt>Verwaltung</dt>
                  <dd>{data.organization.name}</dd>
                </div>
              </dl>
            </section>
          )}
          {permissions.paymentDetails && <section><SectionHeading title="Sichere Zahlungsinformation" linkLabel={`Nächste Fälligkeit ${date.format(nextDueDate)}`}/><dl className="definition-list"><div className="definition-row"><dt>Kaltmiete</dt><dd>{money.format(data.tenancy.coldRentCents / 100)}</dd></div><div className="definition-row"><dt>Nebenkosten</dt><dd>{money.format(data.tenancy.utilityAdvanceCents / 100)}</dd></div><div className="definition-row"><dt>Monatlicher Gesamtbetrag</dt><dd>{money.format((data.tenancy.coldRentCents + data.tenancy.utilityAdvanceCents) / 100)}</dd></div><div className="definition-row"><dt>Fälligkeit</dt><dd>Monatlich am {dueDay}. Kalendertag</dd></div><div className="definition-row"><dt>Kontoinhaber:in</dt><dd>{data.organization.bankAccountHolder || "Noch nicht hinterlegt"}</dd></div><div className="definition-row"><dt>IBAN</dt><dd className="tabular">{data.organization.iban || "Bitte bei der Verwaltung erfragen"}</dd></div><div className="definition-row"><dt>BIC</dt><dd className="tabular">{data.organization.bic || "–"}</dd></div><div className="definition-row"><dt>Bank</dt><dd>{data.organization.bankName || "–"}</dd></div><div className="definition-row"><dt>Verwendungszweck</dt><dd>{data.tenancy.paymentReference || `${data.property.name} · ${data.unit.label} · ${data.renter.lastName}`}</dd></div>{data.organization.transferNote && <div className="definition-row"><dt>Hinweis</dt><dd>{data.organization.transferNote}</dd></div>}<div className="definition-row"><dt>Kaution</dt><dd>{data.tenancy.depositReturnedAt ? `Zurückgezahlt am ${date.format(data.tenancy.depositReturnedAt)}` : `${money.format(data.tenancy.depositPaidCents / 100)} von ${money.format(data.tenancy.depositCents / 100)} bezahlt${data.tenancy.depositPaidAt ? ` · am ${date.format(data.tenancy.depositPaidAt)}` : ""}`}</dd></div></dl></section>}
          {reportsAllowed && <section><SectionHeading title="Meldungen & Schäden" linkLabel={`${renterCases.length} Meldungen`}/><form className="share-report-form" action={reportAction}><input type="hidden" name="requestKey" value={randomUUID()}/><div className="form-grid"><label className="field"><span>Kategorie</span><select name="category"><option value="damage">Schaden</option><option value="repair">Reparatur</option><option value="payment">Zahlung</option><option value="document">Dokument</option><option value="general">Allgemeine Anfrage</option></select></label><label className="field wide"><span>Kurztitel</span><input name="title" required minLength={3} maxLength={160}/></label><label className="field wide"><span>Beschreibung</span><textarea name="description" required minLength={5} rows={4} maxLength={1500}/></label></div><button className="btn">Sicher melden</button></form>{renterCases.length ? <ul className="portal-case-list">{renterCases.map((item) => <li key={item.id}><div><strong>{item.title}</strong><small>{item.createdAt.toLocaleDateString("de-DE")} · {item.category}</small>{renterEvents.filter((event) => event.caseId === item.id).map((event) => <small key={`${event.caseId}-${event.createdAt.toISOString()}`}>{event.createdAt.toLocaleDateString("de-DE")} · {event.note}</small>)}</div><Badge tone={item.status === "resolved" ? "success" : "warning"}>{item.status === "resolved" ? "Erledigt" : item.status === "scheduled" ? "Termin geplant" : "Eingegangen"}</Badge>{item.scheduledAt && <small>Termin: {item.scheduledAt.toLocaleDateString("de-DE")}</small>}</li>)}</ul> : <p className="panel-empty">Noch keine Meldungen über dieses Portal.</p>}</section>}
          {permissions.documents && (
            <section>
              <SectionHeading
                title="Freigegebene Dokumente"
                linkLabel={`${sharedDocuments.length} Dokumente`}
              />
              {sharedDocuments.length ? (
                <ul className="document-list">
                  {sharedDocuments.map((document) => (
                    <li key={document.id}>
                      <div>
                        <strong>
                          <a
                            className="table-link"
                            href={`/share/${token}/documents/${document.id}`}
                            target="_blank"
                          >
                            {document.title}
                          </a>
                        </strong>
                        <small>
                          {document.category} ·{" "}
                          {(document.sizeBytes / 1024 / 1024).toFixed(1)} MB
                        </small>
                      </div>
                      <Badge tone="success">Freigegeben</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="upload-box">
                  <p>Noch keine Dokumente für Sie freigegeben.</p>
                </div>
              )}
            </section>
          )}
          {permissions.uploads && (
            <section>
              <SectionHeading
                title="Dokument einreichen"
                linkLabel="Geschützte Inbox"
              />
              <ShareDocumentUploader token={token} />
            </section>
          )}
        </div>
        <footer className="privacy-footer">
          <strong>Datenschutz &amp; Gültigkeit</strong>
          <br />
          Der Zugriff ist zeitlich begrenzt und kann jederzeit widerrufen
          werden. Eingereichte Dateien bleiben bis zur Prüfung isoliert.
        </footer>
      </div>
    </main>
  );
}
