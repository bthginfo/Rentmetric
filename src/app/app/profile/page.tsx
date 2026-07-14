import { eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PersonalDataForm, PasswordForm } from "@/components/profile-forms";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

export default async function ProfilePage() {
  const session = await requireSession();
  const [user] = await getDb()
    .select({ username: users.username, displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return (
    <AppShell active="/app/profile">
      <PageHeader eyebrow="Konto" title="Mein Profil" description="Persönliche Daten und Zugangssicherheit verwalten." />
      <div className="profile-grid">
        <PersonalDataForm user={user} />
        <PasswordForm />
      </div>
    </AppShell>
  );
}
