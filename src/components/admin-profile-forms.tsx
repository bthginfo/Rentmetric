"use client";

import { useActionState } from "react";
import { changeAdminPassword, type AdminActionState, updateAdminProfile } from "@/app/admin/actions";

function Notice({ state }: { state: AdminActionState }) {
  return state.message ? <p className={`admin-feedback ${state.status}`} role="status">{state.message}</p> : null;
}

export function AdminProfileForms({ admin }: { admin: { displayName: string | null; email: string | null; username: string } }) {
  const [profileState, profileAction, profilePending] = useActionState(updateAdminProfile, {});
  const [passwordState, passwordAction, passwordPending] = useActionState(changeAdminPassword, {});
  return (
    <div className="admin-two-column">
      <form action={profileAction} className="admin-card admin-form">
        <header><span>Identität</span><h2>Admin-Profil</h2><p>Benutzername: <strong>{admin.username}</strong></p></header>
        <label><span>Anzeigename</span><input name="displayName" required defaultValue={admin.displayName ?? ""} autoComplete="name" /></label>
        <label><span>E-Mail</span><input name="email" type="email" defaultValue={admin.email ?? ""} autoComplete="email" /></label>
        <Notice state={profileState} />
        <button className="admin-primary" disabled={profilePending}>Profil speichern</button>
      </form>
      <form action={passwordAction} className="admin-card admin-form">
        <header><span>Sicherheit</span><h2>Admin-Passwort ändern</h2><p>Andere Admin-Sitzungen werden danach beendet.</p></header>
        <label><span>Aktuelles Passwort</span><input name="currentPassword" type="password" required autoComplete="current-password" /></label>
        <label><span>Neues Passwort</span><input name="newPassword" type="password" required minLength={10} autoComplete="new-password" /></label>
        <label><span>Wiederholen</span><input name="confirmation" type="password" required minLength={10} autoComplete="new-password" /></label>
        <Notice state={passwordState} />
        <button className="admin-primary" disabled={passwordPending}>Passwort ändern</button>
      </form>
    </div>
  );
}
