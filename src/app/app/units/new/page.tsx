import Link from "next/link";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { UnitForm } from "@/components/unit-form";
import { listOrganizationProperties } from "@/repositories/portfolio";

export default async function NewUnitPage() {
  const session = await requireSession();
  const properties = await listOrganizationProperties(session.organizationId);
  return <AppShell active="/app/properties"><div className="page-title-row"><div><Link href="/app/units" className="back-link">← Einheiten</Link><h1>Neue Einheit</h1><p>Grunddaten erfassen und einem eigenen Objekt zuordnen.</p></div></div>{properties.length ? <UnitForm properties={properties.map(({ id, name }) => ({ id, name }))} /> : <section className="empty-state"><h2>Zuerst ein Objekt anlegen</h2><p>Jede Einheit benötigt ein organisationsgebundenes Objekt.</p><Link href="/app/properties/new" className="btn">Objekt anlegen</Link></section>}</AppShell>;
}

