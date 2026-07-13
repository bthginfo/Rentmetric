import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  DoorOpen,
  Mail,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { getOrganizationRenter } from "@/repositories/portfolio";

const date = new Intl.DateTimeFormat("de-DE");
const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export default async function RenterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ renterId: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const session = await requireSession();
  const [{ renterId }, query] = await Promise.all([params, searchParams]);
  const result = await getOrganizationRenter(session.organizationId, renterId);
  if (!result) notFound();
  const { renter, currentTenancy, tenancyHistory } = result;

  return (
    <AppShell active="/app/properties">
      <Link className="dossier-breadcrumb" href="/app/renters">
        <ArrowLeft size={14} /> Mieter:innen
      </Link>
      {query.updated === "1" && (
        <div className="success-banner" role="status">
          Die Kontaktdaten wurden aktualisiert.
        </div>
      )}
      <PageHeader
        eyebrow="Mieter-Dossier"
        title={`${renter.firstName} ${renter.lastName}`}
        description={
          currentTenancy
            ? `Aktuell in ${currentTenancy.propertyName} · ${currentTenancy.unitLabel}`
            : "Kontaktdaten und chronologische Vertragshistorie."
        }
        action={
          <div className="dossier-actions">
            {currentTenancy ? (
              <Link className="btn" href={`/app/payments?tenancyId=${currentTenancy.id}`}>
                <Banknote size={15} /> Zahlung buchen
              </Link>
            ) : (
              <Link className="btn" href={`/app/tenancies/new?renterId=${renter.id}`}>
                Mietverhältnis anlegen
              </Link>
            )}
            {currentTenancy && (
              <Link className="btn secondary" href={`/app/tenancies/${currentTenancy.id}`}>
                Mietverhältnis öffnen
              </Link>
            )}
            <Link className="context-link" href={`/app/renters/${renter.id}/edit`}>
              <Pencil size={14} /> Bearbeiten
            </Link>
            <Link className="context-link" href={`/app/documents?renterId=${renter.id}#document-upload`}>Dokument hochladen</Link>
          </div>
        }
      />

      <div className="renter-dossier-grid">
        <section className="detail-panel">
          <div className="panel-title"><UserRound size={17} /><h2>Kontakt</h2></div>
          <dl className="detail-list">
            <DossierRow icon={<Mail size={16} />} label="E-Mail" value={renter.email} />
            <DossierRow icon={<Phone size={16} />} label="Telefon" value={renter.phone} />
          </dl>
        </section>
        <section className="detail-panel">
          <div className="panel-title"><DoorOpen size={17} /><h2>Aktuelles Mietverhältnis</h2></div>
          {currentTenancy ? (
            <dl className="detail-list">
              <DossierRow icon={<Building2 size={16} />} label="Objekt" value={currentTenancy.propertyName} />
              <DossierRow icon={<DoorOpen size={16} />} label="Einheit" value={currentTenancy.unitLabel} />
              <DossierRow icon={<CalendarDays size={16} />} label="Laufzeit" value={`${date.format(currentTenancy.startsAt)} – ${currentTenancy.endsAt ? date.format(currentTenancy.endsAt) : "unbefristet"}`} />
              <DossierRow icon={<Banknote size={16} />} label="Kaltmiete" value={money.format(currentTenancy.coldRentCents / 100)} />
              <DossierRow icon={<Banknote size={16} />} label="Nebenkosten" value={money.format(currentTenancy.utilityAdvanceCents / 100)} />
            </dl>
          ) : (
            <div className="panel-empty-action">
              <p className="panel-empty">Derzeit ist kein aktives Mietverhältnis hinterlegt.</p>
              <Link className="text-button" href={`/app/tenancies/new?renterId=${renter.id}`}>Mietverhältnis anlegen →</Link>
            </div>
          )}
        </section>
      </div>

      <section className="detail-panel renter-history">
        <div className="panel-title"><CalendarDays size={17} /><h2>Mietverlauf</h2><span>{tenancyHistory.length}</span></div>
        {tenancyHistory.length ? (
          <div className="tenancy-history-list">
            {tenancyHistory.map((tenancy) => {
              const active = tenancy.id === currentTenancy?.id;
              return (
                <article key={tenancy.id} className="history-card">
                  <Link className="stretched-card-link" href={`/app/tenancies/${tenancy.id}`} aria-label={`Mietverhältnis ${tenancy.propertyName}, ${tenancy.unitLabel} öffnen`} />
                  <div><strong>{tenancy.propertyName} · {tenancy.unitLabel}</strong><small>{tenancy.propertyStreet} {tenancy.propertyHouseNumber}, {tenancy.propertyPostalCode} {tenancy.propertyCity}</small></div>
                  <div><strong>{date.format(tenancy.startsAt)} – {tenancy.endsAt ? date.format(tenancy.endsAt) : "unbefristet"}</strong><small>{money.format(tenancy.coldRentCents / 100)} kalt · {money.format(tenancy.utilityAdvanceCents / 100)} Nebenkosten</small></div>
                  <Badge tone={active ? "success" : ""}>{active ? "Aktuell" : "Historisch"}</Badge>
                  <span className="row-chevron" aria-hidden="true">›</span>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="panel-empty">Noch keine Mietverhältnisse erfasst.</p>
        )}
      </section>
    </AppShell>
  );
}

function DossierRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return <div><dt>{icon}<span>{label}</span></dt><dd>{value || "Nicht erfasst"}</dd></div>;
}
