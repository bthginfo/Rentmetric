import Image from "next/image";
import { notFound } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { productConfig } from "@/config/product";
import { Badge, SectionHeading } from "@/components/ui";
import { ShareDocumentUploader } from "@/components/share-document-uploader";
import { getDb } from "@/db/client";
import {
  documents,
  organizations,
  properties,
  renters,
  shareLinks,
  tenancies,
  units,
} from "@/db/schema";
import { hashShareToken, type SharePermissions } from "@/domain/share-links";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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
    .innerJoin(tenancies, eq(tenancies.id, shareLinks.tenancyId))
    .innerJoin(renters, eq(renters.id, tenancies.renterId))
    .innerJoin(units, eq(units.id, tenancies.unitId))
    .innerJoin(properties, eq(properties.id, units.propertyId))
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
