import Image from "next/image";
import Link from "next/link";
import { BarChart3, CreditCard, LogOut, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { adminLogout } from "@/app/admin/actions";
import { requireAdminSession } from "@/admin/session";

const links = [
  { href: "/admin", label: "Übersicht", icon: BarChart3 },
  { href: "/admin/users", label: "Nutzer", icon: UsersRound },
  { href: "/admin/pricing", label: "Preise", icon: CreditCard },
  { href: "/admin/profile", label: "Mein Admin-Profil", icon: UserRound },
];

export async function AdminShell({ active, children }: { active: string; children: React.ReactNode }) {
  const admin = await requireAdminSession({
    allowInitialPassword: active === "/admin/profile",
  });
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand"><Image src="/logo-rm.png" width={34} height={34} alt="Rentmetric" /><span><strong>Rentmetric</strong><small>Platform Control</small></span></Link>
        <nav aria-label="Admin-Navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={active === href ? "active" : ""}><Icon size={17} />{label}</Link>)}</nav>
        <div className="admin-sidebar-footer"><ShieldCheck size={17} /><span><strong>{admin.displayName || admin.username}</strong><small>Plattform-Admin</small></span><form action={adminLogout}><button aria-label="Admin abmelden" title="Abmelden"><LogOut size={16} /></button></form></div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

export function AdminPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="admin-page-header"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}
