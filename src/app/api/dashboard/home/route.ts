import { handleApiRoute } from "@/lib/api/helpers";
import { requireSession } from "@/lib/auth/session";
import { getAllBots } from "@/lib/bots/registry";
import {
  getAllBotStatus,
  isControlApiConfigured,
} from "@/lib/control-api/client";
import { getOverviewStats, getRecentTickets } from "@/lib/db/queries";
import { isDbConfigured } from "@/lib/db/pool";
import {
  fetchGuildChannels,
  fetchGuildInfo,
  fetchGuildRoles,
  isDiscordConfigured,
} from "@/lib/discord/api";
import { jsonCached } from "@/lib/http/json-cache";
import { cached } from "@/lib/server-cache";

const OVERVIEW_CACHE_MS = 60_000;
const RECENT_CACHE_MS = 30_000;
const SERVER_CACHE_MS = 120_000;
const BOTS_CACHE_MS = 12_000;

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

  const [stats, tickets, serverPayload, botsPayload] = await Promise.all([
    configured
      ? cached("db:overview-stats", OVERVIEW_CACHE_MS, getOverviewStats)
      : Promise.resolve(null),
    configured
      ? cached("db:recent-tickets:5", RECENT_CACHE_MS, () =>
          getRecentTickets(5)
        )
      : Promise.resolve([]),
    isDiscordConfigured()
      ? cached("discord:server-info", SERVER_CACHE_MS, () =>
          Promise.all([
            fetchGuildInfo(),
            fetchGuildRoles(),
            fetchGuildChannels(),
          ]).then(([guild, roles, channels]) => ({
            guild,
            roles: roles.slice(0, 50),
            channels: channels.slice(0, 100),
          }))
        ).catch(() => ({ guild: null }))
      : Promise.resolve({ guild: null }),
    cached("dashboard:home-bots", BOTS_CACHE_MS, async () => {
      const bots = getAllBots();
      if (!isControlApiConfigured()) {
        return bots.map((bot) => ({ ...bot, status: "unknown" as const }));
      }
      try {
        const data = await getAllBotStatus();
        const statusById = Object.fromEntries(
          data.bots.map((s) => [s.botId, s])
        );
        return bots.map((bot) => {
          const row = statusById[bot.id];
          return {
            id: bot.id,
            shortName: bot.shortName,
            status:
              (row?.status as
                | "online"
                | "offline"
                | "starting"
                | "degraded"
                | "unknown") || "unknown",
          };
        });
      } catch {
        return bots.map((bot) => ({
          id: bot.id,
          shortName: bot.shortName,
          status: "unknown" as const,
        }));
      }
    }),
  ]);

  return jsonCached(
    {
      stats: stats ?? EMPTY_STATS,
      tickets: tickets ?? [],
      configured,
      connected: stats !== null,
      guild: serverPayload?.guild ?? null,
      bots: botsPayload ?? [],
    },
    30,
    { staleWhileRevalidate: 60, private: true }
  );
});
