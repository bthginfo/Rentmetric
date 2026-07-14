"use client";

import { useActionState } from "react";
import { adminLogin, type AdminActionState } from "@/app/admin/actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(adminLogin, {});
  return (
    <form action={action} className="admin-login-form">
      <label><span>Benutzername</span><input name="username" required autoComplete="username" autoCapitalize="none" /></label>
      <label><span>Passwort</span><input name="password" type="password" required autoComplete="current-password" /></label>
      {state.message && <p className="admin-feedback error" role="alert">{state.message}</p>}
      <button className="admin-primary" disabled={pending}>{pending ? "Prüft …" : "Sicher anmelden"}</button>
    </form>
  );
}
