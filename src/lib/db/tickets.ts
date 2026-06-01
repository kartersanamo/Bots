import { query, queryOne, isDbConfigured } from "@/lib/db/pool";
import type { PermissionTier } from "@/lib/permissions";
import { hasMinimumTier } from "@/lib/permissions";
import type {
  TicketRow,
  TicketSortField,
  TicketStats,
  TicketStatusFilter,
} from "@/lib/tickets/types";

export type {
  TicketRow,
  TicketSortField,
  TicketStats,
  TicketStatusFilter,
} from "@/lib/tickets/types";
export { isTicketOpen } from "@/lib/tickets/types";

export interface ListTicketsParams {
  page?: number;
  limit?: number;
  sort?: TicketSortField;
  order?: "asc" | "desc";
  status?: TicketStatusFilter;
  type?: string;
  ownerId?: string;
  number?: string;
  privated?: string;
  q?: string;
  viewerTier: PermissionTier;
}

export interface ListTicketsResult {
  tickets: TicketRow[];
  total: number;
  page: number;
  limit: number;
}

const SORT_COLUMNS: Record<TicketSortField, string> = {
  opened_at: "CAST(opened_at AS UNSIGNED)",
  closed_at: "CAST(NULLIF(TRIM(closed_at), '') AS UNSIGNED)",
  number: "CAST(number AS UNSIGNED)",
  type: "type",
  ownerID: "ownerID",
};

function canViewPrivateTickets(tier: PermissionTier): boolean {
  return hasMinimumTier(tier, "admin");
}

function privatedClause(tier: PermissionTier, privatedFilter?: string): {
  sql: string;
  params: string[];
} {
  if (privatedFilter && privatedFilter !== "all") {
    if (privatedFilter === "public") {
      return {
        sql: " AND (privated IS NULL OR TRIM(privated) = '')",
        params: [],
      };
    }
    return { sql: " AND privated = ?", params: [privatedFilter] };
  }
  if (!canViewPrivateTickets(tier)) {
    return {
      sql: " AND (privated IS NULL OR TRIM(privated) = '')",
      params: [],
    };
  }
  return { sql: "", params: [] };
}

function statusClause(status: TicketStatusFilter): string {
  if (status === "open") return " AND active = 'True'";
  if (status === "closed") return " AND active IN ('False', '0')";
  return "";
}

export async function listTickets(
  params: ListTicketsParams
): Promise<ListTicketsResult | null> {
  if (!isDbConfigured()) return null;

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const offset = (page - 1) * limit;
  const sort = params.sort ?? "opened_at";
  const order = params.order === "asc" ? "ASC" : "DESC";
  const status = params.status ?? "open";

  const statusSql = statusClause(status);
  const priv = privatedClause(params.viewerTier, params.privated);
  const conditions: string[] = [`1=1${statusSql}${priv.sql}`];
  const values: (string | number)[] = [...priv.params];

  if (params.type) {
    conditions.push("type = ?");
    values.push(params.type);
  }
  if (params.ownerId) {
    conditions.push("ownerID = ?");
    values.push(params.ownerId);
  }
  if (params.number) {
    conditions.push("number = ?");
    values.push(params.number);
  }
  if (params.q?.trim()) {
    const q = `%${params.q.trim()}%`;
    conditions.push(
      "(channelID LIKE ? OR ownerID LIKE ? OR number LIKE ? OR type LIKE ? OR name LIKE ?)"
    );
    values.push(q, q, q, q, q);
  }

  const where = conditions.join(" AND ");
  const orderCol = SORT_COLUMNS[sort] ?? SORT_COLUMNS.opened_at;

  try {
    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM tickets WHERE ${where}`,
      values
    );
    const total = countRow?.total ?? 0;

    const tickets = await query<TicketRow>(
      `SELECT channelID, ownerID, type, name, number, active, opened_at, closed_at,
              closed_by, reason, transcript, privated
       FROM tickets
       WHERE ${where}
       ORDER BY ${orderCol} ${order}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return { tickets, total, page, limit };
  } catch (err) {
    console.error("[db] listTickets failed:", err);
    return null;
  }
}

export async function getTicketByChannelId(
  channelId: string,
  viewerTier: PermissionTier
): Promise<TicketRow | null> {
  if (!isDbConfigured()) return null;

  const row = await queryOne<TicketRow>(
    `SELECT channelID, ownerID, type, name, number, active, opened_at, closed_at,
            closed_by, reason, transcript, privated
     FROM tickets WHERE channelID = ?`,
    [channelId]
  );

  if (!row) return null;
  if (
    !canViewPrivateTickets(viewerTier) &&
    row.privated &&
    row.privated.trim() !== ""
  ) {
    return null;
  }
  return row;
}

const statsCache = new Map<
  string,
  { expires: number; data: TicketStats }
>();
const STATS_CACHE_MS = 30_000;

export async function getTicketStats(
  viewerTier: PermissionTier
): Promise<TicketStats | null> {
  if (!isDbConfigured()) return null;

  const cacheKey = viewerTier;
  const hit = statsCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.data;

  const priv = privatedClause(viewerTier);
  const privSql = priv.sql;
  const privParams = priv.params;

  try {
    const [counts, byType] = await Promise.all([
      queryOne<{
        openCount: number;
        closedCount: number;
        openedToday: number;
      }>(
        `SELECT
          SUM(active = 'True') AS openCount,
          SUM(active IN ('False', '0')) AS closedCount,
          SUM(
            active = 'True'
            AND TRIM(opened_at) != ''
            AND DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) = CURDATE()
          ) AS openedToday
         FROM tickets
         WHERE 1=1${privSql}`,
        privParams
      ),
      query<{ type: string; count: number }>(
        `SELECT type, COUNT(*) AS count FROM tickets
         WHERE active = 'True'${privSql}
         GROUP BY type ORDER BY count DESC LIMIT 12`,
        privParams
      ),
    ]);

    const data: TicketStats = {
      openCount: Number(counts?.openCount ?? 0),
      closedCount: Number(counts?.closedCount ?? 0),
      openedToday: Number(counts?.openedToday ?? 0),
      byType,
    };
    statsCache.set(cacheKey, {
      expires: Date.now() + STATS_CACHE_MS,
      data,
    });
    return data;
  } catch (err) {
    console.error("[db] getTicketStats failed:", err);
    return null;
  }
}

const typesCache = new Map<string, { expires: number; data: string[] }>();
const TYPES_CACHE_MS = 60_000;

export async function getDistinctTicketTypes(
  viewerTier: PermissionTier,
  status: TicketStatusFilter = "open"
): Promise<string[]> {
  if (!isDbConfigured()) return [];

  const cacheKey = `${viewerTier}:${status}`;
  const hit = typesCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.data;

  const priv = privatedClause(viewerTier);
  const rows = await query<{ type: string }>(
    `SELECT DISTINCT type FROM tickets WHERE 1=1${statusClause(status)}${priv.sql} ORDER BY type`,
    priv.params
  );
  const data = rows.map((r) => r.type).filter(Boolean);
  typesCache.set(cacheKey, { expires: Date.now() + TYPES_CACHE_MS, data });
  return data;
}
