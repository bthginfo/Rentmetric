import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PropertyForm } from "@/components/property-form";

export default function NewPropertyPage() {
  return <AppShell active="/app/properties"><div className="page-title-row"><div><Link href="/app/properties" className="back-link">← Objekte</Link><h1>Neues Objekt</h1><p>Adresse und Grundstruktur in einem Schritt anlegen.</p></div></div><PropertyForm /></AppShell>;
}

