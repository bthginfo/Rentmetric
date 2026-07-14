"use client";

import { useActionState } from "react";
import {
  changeOwnPassword,
  type ProfileActionState,
  updatePersonalData,
} from "@/app/app/profile/actions";

const initialState: ProfileActionState = {};

function Feedback({ state }: { state: ProfileActionState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === "success" ? "success-banner" : "error-banner"} role="status">
      {state.message}
    </p>
  );
}

export function PersonalDataForm({
  user,
}: {
  user: { displayName: string | null; email: string | null; username: string };
}) {
  const [state, action, pending] = useActionState(updatePersonalData, initialState);
  return (
    <form action={action} className="detail-panel profile-panel">
      <div className="panel-title"><div><span className="eyebrow">Identität</span><h2>Persönliche Daten</h2></div></div>
      <div className="form-grid">
        <label className="field"><span>Anzeigename</span><input name="displayName" required defaultValue={user.displayName ?? ""} autoComplete="name" />{state.fieldErrors?.displayName?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>
        <label className="field"><span>E-Mail</span><input name="email" type="email" defaultValue={user.email ?? ""} autoComplete="email" />{state.fieldErrors?.email?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>
        <label className="field wide"><span>Benutzername</span><input name="username" required defaultValue={user.username} autoComplete="username" spellCheck={false} />{state.fieldErrors?.username?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>
      </div>
      <Feedback state={state} />
      <div className="form-actions"><button className="btn btn-primary" disabled={pending}>{pending ? "Speichert …" : "Profildaten speichern"}</button></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, initialState);
  return (
    <form action={action} className="detail-panel profile-panel">
      <div className="panel-title"><div><span className="eyebrow">Sicherheit</span><h2>Passwort ändern</h2></div></div>
      <div className="form-grid">
        <label className="field wide"><span>Aktuelles Passwort</span><input name="currentPassword" type="password" required autoComplete="current-password" /></label>
        <label className="field"><span>Neues Passwort</span><input name="newPassword" type="password" required minLength={10} autoComplete="new-password" />{state.fieldErrors?.newPassword?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>
        <label className="field"><span>Neues Passwort wiederholen</span><input name="confirmation" type="password" required minLength={10} autoComplete="new-password" />{state.fieldErrors?.confirmation?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>
      </div>
      <p className="form-hint">Mindestens 10 Zeichen, ein Buchstabe und eine Zahl.</p>
      <Feedback state={state} />
      <div className="form-actions"><button className="btn btn-primary" disabled={pending}>{pending ? "Ändert …" : "Passwort ändern"}</button></div>
    </form>
  );
}
