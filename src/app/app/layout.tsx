import { requireSession } from "@/auth/session";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return children;
}
