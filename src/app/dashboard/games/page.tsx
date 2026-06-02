import { getGamesOverviewFullPayload } from "@/lib/data/games-overview";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { GamesPageClient } from "./GamesPageClient";

export default async function GamesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.tier, "games.read")) redirect("/unauthorized");

  const initialOverview = await getGamesOverviewFullPayload().catch(() => null);

  return (
    <GamesPageClient
      userTier={session.tier}
      initialOverview={initialOverview}
    />
  );
}
