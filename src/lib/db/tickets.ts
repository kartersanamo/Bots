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

export async function getTicketStats(
  viewerTier: PermissionTier
): Promise<TicketStats | null> {
  if (!isDbConfigured()) return null;

  const priv = privatedClause(viewerTier);
  const privSql = priv.sql;
  const privParams = priv.params;

  try {
    const counts = await queryOne<{
      openCount: number;
      closedCount: number;
      openedToday: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM tickets WHERE active = 'True'${privSql}) AS openCount,
        (SELECT COUNT(*) FROM tickets WHERE active IN ('False', '0')${privSql}) AS closedCount,
        (SELECT COUNT(*) FROM tickets
         WHERE active = 'True'${privSql}
           AND TRIM(opened_at) != ''
           AND DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) = CURDATE()) AS openedToday`,
      [...privParams, ...privParams, ...privParams]
    );

    const byType = await query<{ type: string; count: number }>(
      `SELECT type, COUNT(*) AS count FROM tickets
       WHERE active = 'True'${privSql}
       GROUP BY type ORDER BY count DESC LIMIT 12`,
      privParams
    );

    return {
      openCount: counts?.openCount ?? 0,
      closedCount: counts?.closedCount ?? 0,
      openedToday: counts?.openedToday ?? 0,
      byType,
    };
  } catch (err) {
    console.error("[db] getTicketStats failed:", err);
    return null;
  }
}

export async function getDistinctTicketTypes(
  viewerTier: PermissionTier,
  status: TicketStatusFilter = "open"
): Promise<string[]> {
  if (!isDbConfigured()) return [];

  const priv = privatedClause(viewerTier);
  const rows = await query<{ type: string }>(
    `SELECT DISTINCT type FROM tickets WHERE 1=1${statusClause(status)}${priv.sql} ORDER BY type`,
    priv.params
  );
  return rows.map((r) => r.type).filter(Boolean);
}
