import { analyticsPrivatedClause } from "@/lib/analytics/privated";
import {
  closedAtRangeClause,
  openedAtRangeClause,
} from "@/lib/analytics/range";
import type {
  AnalyticsRange,
  DailyCount,
  LongestTicketRow,
  TicketAnalytics,
  TicketGapRow,
  TicketOpenerRow,
} from "@/lib/analytics/types";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";
import type { PermissionTier } from "@/lib/permissions";

/** Staff / test accounts excluded from "most tickets in one day" (matches Discord bot) */
const EXCLUDED_OPENER_IDS = ["837793755838939157", "220576008372355072"];

const VALID_CLOSED =
  "TRIM(closed_at) != '' AND closed_at IS NOT NULL AND closed_at NOT IN ('0', '00000000')";

function baseWhere(tier: PermissionTier): { sql: string; params: (string | number)[] } {
  const priv = analyticsPrivatedClause(tier);
  return {
    sql: `WHERE CAST(opened_at AS UNSIGNED) > 0${priv.sql}`,
    params: [...priv.params],
  };
}

export async function getTicketAnalytics(
  tier: PermissionTier,
  range: AnalyticsRange
): Promise<TicketAnalytics | null> {
  if (!isDbConfigured()) return null;

  const base = baseWhere(tier);
  const openedRange = openedAtRangeClause(range);
  const closedRange = closedAtRangeClause(range);

  const rangeWhere = `${base.sql}${openedRange.sql}`;
  const rangeParams = [...base.params, ...openedRange.params];

  try {
    const [
      avgRow,
      avgBetweenRow,
      gapRow,
      countsRow,
      openedPerDay,
      closedPerDay,
      byType,
      byHour,
      byDayOfWeek,
      topInRange,
      topAllTime,
      mostInDay,
      longestOpen,
      percentiles,
    ] = await Promise.all([
      queryOne<{ avg: number | null }>(
        `SELECT AVG(daily_count) AS avg FROM (
          SELECT DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS d, COUNT(*) AS daily_count
          FROM tickets ${rangeWhere}
          GROUP BY d
        ) daily`,
        rangeParams
      ),
      queryOne<{ avg: number | null }>(
        `WITH diff AS (
          SELECT CAST(opened_at AS UNSIGNED) AS ts,
            LAG(CAST(opened_at AS UNSIGNED)) OVER (ORDER BY CAST(opened_at AS UNSIGNED)) AS prev
          FROM tickets ${base.sql}
        )
        SELECT AVG(ts - prev) AS avg FROM diff WHERE prev IS NOT NULL`,
        base.params
      ),
      queryOne<{
        current_channelID: string;
        current_opened_at: string;
        previous_channelID: string;
        previous_opened_at: string;
        max_gap: number;
      }>(
        `WITH diff AS (
          SELECT channelID, CAST(opened_at AS UNSIGNED) AS ts,
            LAG(channelID) OVER (ORDER BY CAST(opened_at AS UNSIGNED)) AS prev_channel,
            LAG(CAST(opened_at AS UNSIGNED)) OVER (ORDER BY CAST(opened_at AS UNSIGNED)) AS prev_ts
          FROM tickets ${base.sql}
        ),
        gaps AS (
          SELECT channelID, ts, prev_channel, prev_ts, ts - prev_ts AS gap
          FROM diff WHERE prev_ts IS NOT NULL
        )
        SELECT channelID AS current_channelID, ts AS current_opened_at,
          prev_channel AS previous_channelID, prev_ts AS previous_opened_at, gap AS max_gap
        FROM gaps ORDER BY gap DESC LIMIT 1`,
        base.params
      ),
      queryOne<{
        openCount: number;
        openedInRange: number;
        closedInRange: number;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM tickets ${base.sql} AND active = 'True') AS openCount,
          (SELECT COUNT(*) FROM tickets ${rangeWhere}) AS openedInRange,
          (SELECT COUNT(*) FROM tickets ${base.sql}${closedRange.sql}) AS closedInRange`,
        [...base.params, ...rangeParams, ...base.params, ...closedRange.params]
      ),
      query<{ date: string; count: number }>(
        `SELECT DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS date, COUNT(*) AS count
         FROM tickets ${rangeWhere}
         GROUP BY date ORDER BY date`,
        rangeParams
      ),
      query<{ date: string; count: number }>(
        `SELECT DATE(FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))) AS date, COUNT(*) AS count
         FROM tickets ${base.sql} AND ${VALID_CLOSED}${closedRange.sql}
         GROUP BY date ORDER BY date`,
        [...base.params, ...closedRange.params]
      ),
      query<{ name: string; count: number }>(
        `SELECT type AS name, COUNT(*) AS count FROM tickets ${rangeWhere}
         GROUP BY type ORDER BY count DESC LIMIT 16`,
        rangeParams
      ),
      query<{ hour: number; count: number }>(
        `SELECT HOUR(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS hour, COUNT(*) AS count
         FROM tickets ${rangeWhere}
         GROUP BY hour
         ORDER BY hour`,
        rangeParams
      ),
      query<{ dow: number; count: number }>(
        `SELECT DAYOFWEEK(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS dow, COUNT(*) AS count
         FROM tickets ${rangeWhere}
         GROUP BY dow
         ORDER BY dow`,
        rangeParams
      ),
      query<{ ownerID: string; ticket_count: number }>(
        `SELECT ownerID, COUNT(*) AS ticket_count FROM tickets ${rangeWhere}
         GROUP BY ownerID ORDER BY ticket_count DESC LIMIT 20`,
        rangeParams
      ),
      query<{ ownerID: string; ticket_count: number }>(
        `SELECT ownerID, COUNT(*) AS ticket_count FROM tickets ${base.sql}
         GROUP BY ownerID ORDER BY ticket_count DESC LIMIT 20`,
        base.params
      ),
      query<{ ownerID: string; ticket_date: string; ticket_count: number }>(
        `SELECT ownerID,
          DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS ticket_date,
          COUNT(*) AS ticket_count
         FROM tickets ${base.sql}
         AND ownerID NOT IN (?, ?)
         GROUP BY ownerID, ticket_date
         ORDER BY ticket_count DESC LIMIT 10`,
        [...base.params, ...EXCLUDED_OPENER_IDS]
      ),
      query<{
        channelID: string;
        ownerID: string;
        type: string;
        number: string;
        opened_at: string;
        closed_at: string;
        ticket_duration: number;
      }>(
        `SELECT channelID, ownerID, type, number, opened_at, closed_at,
          TIMESTAMPDIFF(SECOND,
            FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)),
            FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))
          ) AS ticket_duration
         FROM tickets ${base.sql} AND ${VALID_CLOSED}
         ORDER BY ticket_duration DESC LIMIT 5`,
        base.params
      ),
      queryOne<{ median_s: number | null; p90_s: number | null }>(
        `SELECT
          AVG(CASE WHEN rn = CEIL(0.5 * cnt) THEN dur END) AS median_s,
          AVG(CASE WHEN rn = CEIL(0.9 * cnt) THEN dur END) AS p90_s
        FROM (
          SELECT TIMESTAMPDIFF(SECOND,
            FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)),
            FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))
          ) AS dur,
          ROW_NUMBER() OVER (ORDER BY TIMESTAMPDIFF(SECOND,
            FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)),
            FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))
          )) AS rn,
          COUNT(*) OVER () AS cnt
          FROM tickets ${base.sql} AND ${VALID_CLOSED}${closedRange.sql}
        ) ranked`,
        [...base.params, ...closedRange.params]
      ),
    ]);

    const longestGap: TicketGapRow | null = gapRow
      ? {
          currentChannelId: String(gapRow.current_channelID),
          currentOpenedAt: Number(gapRow.current_opened_at),
          previousChannelId: String(gapRow.previous_channelID),
          previousOpenedAt: Number(gapRow.previous_opened_at),
          gapSeconds: Number(gapRow.max_gap),
        }
      : null;

    return {
      range,
      kpis: {
        avgTicketsPerDay: Number(avgRow?.avg ?? 0),
        avgTimeBetweenTicketsSeconds:
          avgBetweenRow?.avg != null ? Number(avgBetweenRow.avg) : null,
        longestGapSeconds: longestGap?.gapSeconds ?? null,
        openCount: Number(countsRow?.openCount ?? 0),
        closedInRange: Number(countsRow?.closedInRange ?? 0),
        openedInRange: Number(countsRow?.openedInRange ?? 0),
        medianCloseSeconds:
          percentiles?.median_s != null ? Number(percentiles.median_s) : null,
        p90CloseSeconds:
          percentiles?.p90_s != null ? Number(percentiles.p90_s) : null,
      },
      openedPerDay: mapDaily(openedPerDay),
      closedPerDay: mapDaily(closedPerDay),
      byType: byType.map((r) => ({ name: r.name, count: Number(r.count) })),
      byHour: fillHourOfDayBuckets(byHour),
      byDayOfWeek: fillDayOfWeekBuckets(byDayOfWeek),
      topOpenersInRange: mapOpeners(topInRange),
      topOpenersAllTime: mapOpeners(topAllTime),
      mostTicketsInOneDay: mostInDay.map((r) => ({
        ownerId: String(r.ownerID),
        date: String(r.ticket_date),
        count: Number(r.ticket_count),
      })),
      longestOpenTickets: longestOpen.map(
        (r): LongestTicketRow => ({
          channelId: String(r.channelID),
          ownerId: String(r.ownerID),
          type: String(r.type),
          number: String(r.number),
          openedAt: Number(r.opened_at),
          closedAt: Number(r.closed_at),
          durationSeconds: Number(r.ticket_duration),
        })
      ),
      longestGap,
    };
  } catch (err) {
    console.error("[analytics] getTicketAnalytics failed:", err);
    return null;
  }
}

function mapDaily(rows: { date: string | Date; count: number }[]): DailyCount[] {
  return rows.map((r) => ({
    date:
      r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10),
    count: Number(r.count),
  }));
}

function mapOpeners(
  rows: { ownerID: string; ticket_count: number }[]
): TicketOpenerRow[] {
  return rows.map((r) => ({
    ownerId: String(r.ownerID),
    count: Number(r.ticket_count),
  }));
}

/** Sum tickets at each hour (0–23) across every day in the selected range. */
function fillHourOfDayBuckets(
  rows: { hour: number; count: number }[]
): { name: string; count: number }[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    const h = Number(row.hour);
    if (h < 0 || h > 23) continue;
    totals.set(h, (totals.get(h) ?? 0) + Number(row.count));
  }
  return Array.from({ length: 24 }, (_, hour) => ({
    name: formatHourOfDayLabel(hour),
    count: totals.get(hour) ?? 0,
  }));
}

/** Sum tickets for each weekday (Sun–Sat) across every day in the selected range. */
function fillDayOfWeekBuckets(
  rows: { dow: number; count: number }[]
): { name: string; count: number }[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    const dow = Number(row.dow);
    if (dow < 1 || dow > 7) continue;
    totals.set(dow, (totals.get(dow) ?? 0) + Number(row.count));
  }
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return labels.map((name, i) => ({
    name,
    count: totals.get(i + 1) ?? 0,
  }));
}

function formatHourOfDayLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}
