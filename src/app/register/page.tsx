import Image from "next/image";
import Link from "next/link";
import { register } from "@/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { productConfig } from "@/config/product";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand">
          <Image
            className="brand-logo"
            src="/logo-rm.png"
            width={40}
            height={40}
            alt="Rentmetric Logo"
            priority
          />
          {productConfig.name}
        </Link>
        <p className="eyebrow">Neuer Arbeitsbereich</p>
        <h1>Ihr Portfolio. Klar organisiert.</h1>
        <p className="muted">
          Die Daten Ihres Arbeitsbereichs bleiben technisch von anderen
          Organisationen getrennt.
        </p>
        <AuthForm mode="register" action={register} />
      </section>
    </main>
  );
}
