import { redirect } from "next/navigation";
import { claimAnonymousIdentity } from "@/lib/identity-actions";

export const dynamic = "force-dynamic";

export default async function AuthCallback({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  await claimAnonymousIdentity().catch(() => null);
  const { to } = await searchParams;
  const target = to && to.startsWith("/") ? to : "/app";
  redirect(target);
}
