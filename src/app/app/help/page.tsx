import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { HelpCenter } from "@/components/help-center";

export default async function HelpPage() {
  await requireSession();
  return (
    <AppShell active="/app/help">
      <HelpCenter />
    </AppShell>
  );
}
