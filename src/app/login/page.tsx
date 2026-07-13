import Link from "next/link";
import { login } from "@/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { productConfig } from "@/config/product";

export default function LoginPage() {
  return <main className="auth-page"><section className="auth-card"><Link href="/" className="brand"><span className="brand-mark">R</span>{productConfig.name}</Link><p className="eyebrow">Geschützter Arbeitsbereich</p><h1>Willkommen zurück.</h1><p className="muted">Portfolio, Fristen und Mietpotenziale an einem ruhigen Ort. Ihre Anmeldung wird verschlüsselt übertragen.</p><AuthForm mode="login" action={login} /></section></main>;
}
