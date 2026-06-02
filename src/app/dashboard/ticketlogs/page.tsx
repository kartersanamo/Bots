import { TicketlogsWorkspace } from "@/components/analytics/ticketlogs/TicketlogsWorkspace";
import { Header } from "@/components/layout/Header";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function TicketlogsPage() {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "tickets.read")) redirect("/unauthorized");
  const ownerOverrideId = env("OWNER_DISCORD_ID");
  const ownerBypass = !!ownerOverrideId && session.id === ownerOverrideId;

  return (
    <>
      <Header
        title="Ticketlogs"
        description="Search closed tickets, transcripts, and historical records."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Ticketlogs" },
        ]}
      />
      <Suspense
        fallback={
          <div className="animate-pulse text-muted">Loading ticket logs…</div>
        }
      >
        <GamesDiscordUsersProvider>
          <TicketlogsWorkspace userTier={session.tier} ownerBypass={ownerBypass} />
        </GamesDiscordUsersProvider>
      </Suspense>
    </>
  );
}
