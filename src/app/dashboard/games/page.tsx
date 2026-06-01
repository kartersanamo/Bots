import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GamesPageClient } from "./GamesPageClient";

export default async function GamesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.tier, "games.read")) redirect("/unauthorized");

  return (
    <Suspense
      fallback={
        <div className="animate-pulse text-muted">Loading games admin…</div>
      }
    >
      <GamesPageClient userTier={session.tier} />
    </Suspense>
  );
}
