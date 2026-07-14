import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/admin/session";
import { AdminLoginForm } from "@/components/admin-auth-form";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session)
    redirect(session.requiresPasswordChange ? "/admin/profile" : "/admin");
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <header><Image src="/logo-rm.png" width={46} height={46} alt="Rentmetric" /><div><span>PLATFORM CONTROL</span><strong>Rentmetric Admin</strong></div></header>
        <div className="admin-login-copy"><span>Geschützter Bereich</span><h1>Plattform sicher verwalten.</h1><p>Getrennte Anmeldung für Nutzerverwaltung, Preise und Plattformbetrieb.</p></div>
        <AdminLoginForm />
        <small className="admin-security-note">Dieser Zugang ist vollständig vom Vermieter-Arbeitsbereich getrennt.</small>
      </section>
    </main>
  );
}
