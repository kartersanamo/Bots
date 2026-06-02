import { handleApiRoute } from "@/lib/api/helpers";
import { requireSession } from "@/lib/auth/session";
import { getOverviewStats } from "@/lib/db/queries";
import { isDbConfigured } from "@/lib/db/pool";
import { jsonCached } from "@/lib/http/json-cache";
import { cached } from "@/lib/server-cache";

const OVERVIEW_CACHE_MS = 45_000;

const EMPTY_STATS = {
  totalTickets: 0,
  openTickets: 0,
  closedTickets: 0,
  totalLevelingUsers: 0,
  totalBlacklists: 0,
  ticketsToday: 0,
};

export const GET = handleApiRoute(async () => {
  await requireSession();
  const configured = isDbConfigured();
  const stats = configured
    ? await cached("db:overview-stats", OVERVIEW_CACHE_MS, getOverviewStats)
    : null;

  return jsonCached(
    {
      stats: stats ?? EMPTY_STATS,
      configured,
      connected: stats !== null,
    },
    45,
    { staleWhileRevalidate: 90, private: true }
  );
});
