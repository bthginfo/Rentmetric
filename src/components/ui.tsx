import Link from "next/link";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="header-actions">{action}</div>}</header>;
}

export function Badge({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return <div className="section-heading"><h2>{title}</h2>{href ? <Link href={href}>{linkLabel ?? "Alle anzeigen"}<span aria-hidden="true">›</span></Link> : <span>{linkLabel}</span>}</div>;
}

export function FeatureStatus({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="feature-status"><span className="eyebrow">In Vorbereitung</span><h2>{title}</h2><p>{children}</p></section>;
}
