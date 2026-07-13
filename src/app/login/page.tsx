import Image from "next/image";
import Link from "next/link";
import { login } from "@/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { productConfig } from "@/config/product";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand">
          <Image
            className="brand-logo"
            src="/logo-rm.png"
            width={40}
            height={40}
            alt=""
            priority
          />
          {productConfig.name}
        </Link>
        <p className="eyebrow">Geschützter Arbeitsbereich</p>
        <h1>Willkommen zurück.</h1>
        <p className="muted">
          Portfolio, Fristen und Mietpotenziale an einem ruhigen Ort. Ihre
          Anmeldung wird verschlüsselt übertragen.
        </p>
        <AuthForm mode="login" action={login} />
      </section>
    </main>
  );
}
