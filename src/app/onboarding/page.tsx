import Image from "next/image";
import Link from "next/link";
import { Building2, DoorOpen, UserRound, FileSignature } from "lucide-react";
import { requireSession } from "@/auth/session";
import { productConfig } from "@/config/product";
import {
  listOrganizationProperties,
  listOrganizationRenters,
  listOrganizationUnits,
} from "@/repositories/portfolio";

export default async function OnboardingPage() {
  const session = await requireSession();
  const [properties, units, renters] = await Promise.all([
    listOrganizationProperties(session.organizationId),
    listOrganizationUnits(session.organizationId),
    listOrganizationRenters(session.organizationId),
  ]);
  const steps = [
    {
      title: "Erstes Objekt",
      detail: "Adresse und Grundstruktur",
      done: properties.length > 0,
      href: "/app/properties/new",
      Icon: Building2,
    },
    {
      title: "Wohneinheiten",
      detail: "Flächen und Zimmer ergänzen",
      done: units.some((unit) => unit.areaSqm),
      href: "/app/units",
      Icon: DoorOpen,
    },
    {
      title: "Mieter",
      detail: "Minimale Kontaktdaten",
      done: renters.length > 0,
      href: "/app/renters/new",
      Icon: UserRound,
    },
    {
      title: "Mietverhältnis",
      detail: "Folgt als nächster Schritt",
      done: false,
      href: "/app/tenancies",
      Icon: FileSignature,
    },
  ];
  return (
    <main className="onboarding-page">
      <header>
        <Link className="brand" href="/">
          <Image className="brand-logo" src="/logo-rm.png" width={38} height={38} alt="Rentmetric Logo" priority />
          {productConfig.name}
        </Link>
        <span>{session.organizationName}</span>
      </header>
      <section className="onboarding-sheet">
        <p className="eyebrow">Einrichtung</p>
        <h1>Ihr Arbeitsbereich nimmt Form an.</h1>
        <p>
          Gehen Sie Schritt für Schritt vor. Bereits vorhandene Daten werden
          automatisch erkannt.
        </p>
        <div className="onboarding-steps">
          {steps.map(({ title, detail, done, href, Icon }, index) => (
            <Link
              key={title}
              href={href}
              className={`onboarding-step ${done ? "done" : ""}`}
            >
              <span className="step-icon">
                <Icon size={19} />
              </span>
              <span>
                <small>Schritt {index + 1}</small>
                <strong>{title}</strong>
                <em>{detail}</em>
              </span>
              <b>{done ? "✓" : "→"}</b>
            </Link>
          ))}
        </div>
        <Link href="/app/dashboard" className="btn secondary">
          Zum Dashboard
        </Link>
      </section>
    </main>
  );
}
