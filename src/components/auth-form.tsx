"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
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
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const previousState = useRef(state);
  useEffect(() => {
    if (state && state !== previousState.current) {
      setPassword("");
      setConfirmation("");
    }
    previousState.current = state;
  }, [state]);
  const requirements = [
    ["Mindestens 12 Zeichen", password.length >= 12],
    ["Mindestens ein Buchstabe", /[A-Za-zÄÖÜäöüß]/.test(password)],
    ["Mindestens eine Zahl", /[0-9]/.test(password)],
    [
      "Passwörter stimmen überein",
      Boolean(confirmation) && password === confirmation,
    ],
  ] as const;
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
            defaultValue={state?.values?.organizationName}
          />
          <FieldErrors errors={state?.fieldErrors?.organizationName} />
          <label htmlFor="displayName">
            Ihr Name <span>(optional)</span>
          </label>
          <input
            id="displayName"
            name="displayName"
            autoComplete="name"
            defaultValue={state?.values?.displayName}
          />
          <FieldErrors errors={state?.fieldErrors?.displayName} />
          <label htmlFor="email">
            E-Mail <span>(optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state?.values?.email}
          />
          <FieldErrors errors={state?.fieldErrors?.email} />
        </>
      )}
      <label htmlFor="username">Benutzername</label>
      <input
        id="username"
        name="username"
        autoComplete="username"
        required
        defaultValue={state?.values?.username}
      />
      <FieldErrors errors={state?.fieldErrors?.username} />
      <label htmlFor="password">Passwort</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={register ? "new-password" : "current-password"}
        minLength={register ? 12 : undefined}
        maxLength={128}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <FieldErrors errors={state?.fieldErrors?.password} />
      {register && (
        <>
          <div
            className="password-requirements"
            aria-live="polite"
            aria-label="Passwortanforderungen"
          >
            <strong>Ihr Passwort braucht:</strong>
            <ul>
              {requirements.map(([label, met]) => (
                <li className={met ? "met" : ""} key={label}>
                  {met ? <Check size={15} /> : <Circle size={12} />}
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <label htmlFor="passwordConfirmation">Passwort wiederholen</label>
          <input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <FieldErrors errors={state?.fieldErrors?.passwordConfirmation} />
        </>
      )}
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
