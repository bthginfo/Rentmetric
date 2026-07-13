"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/auth/actions";

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: (state: AuthState, data: FormData) => Promise<AuthState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const register = mode === "register";
  return (
    <form action={formAction} className="auth-form">
      {register && (
        <>
          <label htmlFor="organizationName">Name des Arbeitsbereichs</label>
          <input
            id="organizationName"
            name="organizationName"
            autoComplete="organization"
            required
          />
          <FieldErrors errors={state?.fieldErrors?.organizationName} />
          <label htmlFor="displayName">
            Ihr Name <span>(optional)</span>
          </label>
          <input id="displayName" name="displayName" autoComplete="name" />
        </>
      )}
      <label htmlFor="username">Benutzername</label>
      <input id="username" name="username" autoComplete="username" required />
      <FieldErrors errors={state?.fieldErrors?.username} />
      <label htmlFor="password">Passwort</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={register ? "new-password" : "current-password"}
        required
      />
      <FieldErrors errors={state?.fieldErrors?.password} />
      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending
          ? "Einen Moment …"
          : register
            ? "Arbeitsbereich erstellen"
            : "Sicher anmelden"}
      </button>
      <p className="auth-switch">
        {register ? "Schon registriert?" : "Noch kein Arbeitsbereich?"}{" "}
        <Link href={register ? "/login" : "/register"}>
          {register ? "Anmelden" : "Jetzt starten"}
        </Link>
      </p>
    </form>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  return errors ? (
    <p className="auth-error" role="alert">
      {errors.join(" · ")}
    </p>
  ) : null;
}
