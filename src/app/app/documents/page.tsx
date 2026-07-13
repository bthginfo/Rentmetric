import { AppShell } from "@/components/app-shell";
import { FeatureStatus, PageHeader } from "@/components/ui";
export default function DocumentsPage() { return <AppShell active=""><PageHeader eyebrow="Dokumentenablage" title="Dokumente" description="Verträge, Nachweise und Korrespondenz strukturiert je Objekt und Mietverhältnis." /><FeatureStatus title="Dokumentenablage wird verbunden">Die Oberfläche ist vorbereitet. Upload-Prüfung, Freigaben und revisionssichere Zuordnung werden mit der Dokumenten-Infrastruktur verbunden.</FeatureStatus></AppShell>; }
