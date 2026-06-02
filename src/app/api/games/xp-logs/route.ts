import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { listXpLogs, listXpLogSources } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";
import {
  parseSortDirection,
  parseXpLogsSortField,
  type ListXpLogsOptions,
} from "@/lib/games/xp-logs-query";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";

function parseListOpts(url: URL, forExport: boolean): ListXpLogsOptions {
  const minXp = url.searchParams.get("minXp");
  const maxXp = url.searchParams.get("maxXp");
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");

  const limit = forExport
    ? Math.min(5000, Number(url.searchParams.get("limit") || 5000))
    : Number(url.searchParams.get("limit") || 50);

  return {
    page: Number(url.searchParams.get("page") || 1),
    limit,
    userId: url.searchParams.get("userId") || undefined,
    source: url.searchParams.get("source") || undefined,
    sourceContains: url.searchParams.get("sourceContains") || undefined,
    gameId: url.searchParams.get("gameId") || undefined,
    minXp: minXp != null && minXp !== "" ? Number(minXp) : undefined,
    maxXp: maxXp != null && maxXp !== "" ? Number(maxXp) : undefined,
    since: since != null && since !== "" ? Number(since) : undefined,
    until: until != null && until !== "" ? Number(until) : undefined,
    sortBy: parseXpLogsSortField(url.searchParams.get("sortBy")),
    sortDir: parseSortDirection(url.searchParams.get("sortDir")),
  };
}

export const GET = handleApiRoute(async (request) => {
  const session = await requireAction("games.read");
  const url = new URL(request.url);

  if (!isDbConfigured()) {
    return Response.json({ rows: [], total: 0, configured: false });
  }

  if (url.searchParams.get("meta") === "sources") {
    const sources = await listXpLogSources();
    return Response.json({ sources, configured: true });
  }

  const forExport = url.searchParams.get("export") === "1";
  if (forExport) {
    const limited = checkRateLimit(`games:xp-export:${session.id}`, {
      windowMs: 60_000,
      max: 5,
    });
    if (!limited.ok) {
      return Response.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec ?? 60) },
        }
      );
    }
  }
  const opts = parseListOpts(url, forExport);
  const result = await listXpLogs({
    ...opts,
    maxLimit: forExport ? 5000 : 100,
  });

  const rows = result.rows.map((r) => ({
    ...r,
    user_id: snowflakeString(r.user_id),
    game_id: Number(r.game_id),
  }));
  const users = await discordUsersForIds(rows.map((r) => r.user_id));

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(forExport ? 5000 : 100, Math.max(1, opts.limit ?? 50));
  const pageCount = Math.max(1, Math.ceil(result.total / limit));

  return Response.json({
    ...result,
    rows,
    users,
    configured: true,
    page,
    limit,
    pageCount,
    sortBy: opts.sortBy,
    sortDir: opts.sortDir,
  });
});
