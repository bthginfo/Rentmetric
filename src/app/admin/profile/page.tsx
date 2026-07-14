import { requireAdminSession } from "@/admin/session";
import { AdminPageHeader, AdminShell } from "@/components/admin-shell";
import { AdminProfileForms } from "@/components/admin-profile-forms";

export default async function AdminProfilePage() {
  const admin = await requireAdminSession();
  return <AdminShell active="/admin/profile"><AdminPageHeader eyebrow="Admin-Konto" title="Mein Profil" description="Identität und Zugangssicherheit des Plattform-Admins verwalten." /><AdminProfileForms admin={admin} /></AdminShell>;
}
