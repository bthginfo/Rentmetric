import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RenterForm } from "@/components/renter-form";

export default function NewRenterPage() {
  return <AppShell active="/app/properties"><div className="page-title-row"><div><Link href="/app/renters" className="back-link">← Mieter</Link><h1>Neuer Mieter</h1><p>Bewusst nur die notwendigen Kontaktdaten erfassen.</p></div></div><RenterForm /></AppShell>;
}

