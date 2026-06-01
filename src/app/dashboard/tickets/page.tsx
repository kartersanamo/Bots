import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TicketsPageClient } from "./TicketsPageClient";

export default async function TicketsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Suspense
      fallback={
        <div className="animate-pulse text-muted">Loading tickets…</div>
      }
    >
      <TicketsPageClient userTier={session.tier} />
    </Suspense>
  );
}
