import {
  fillDayOfWeekBuckets,
  fillHourOfDayBuckets,
} from "@/lib/analytics/buckets";
import { analyticsPrivatedClause } from "@/lib/analytics/privated";
import {
  closedAtRangeClause,
  openedAtRangeClause,
  rangeSinceUnix,
} from "@/lib/analytics/range";
import {
  bucketKeySqlFromUnix,
  getTimeBucketSpec,
  normalizeTimeSeries,
  percentileFromHistogram,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsRange,
  CloseTimeByTypeRow,
  DailyCount,
  LongestTicketRow,
  NamedCount,
  TicketAnalytics,
  TicketGapRow,
  UserCountRow,
} from "@/lib/analytics/types";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";
import type { PermissionTier } from "@/lib/permissions";

const EXCLUDED_OPENER_IDS = ["837793755838939157", "220576008372355072"];

const VALID_CLOSED =
  "TRIM(closed_at) != '' AND closed_at IS NOT NULL AND closed_at NOT IN ('0', '00000000')";

const SAMPLE_TIMING_LIMIT = 25_000;

type SliceRow = {
  metric: string;
  k1: string | null;
  k2: string | null;
  val: number;
};

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
  const bucketSpec = getTimeBucketSpec(range);
  const openedBucket = bucketKeySqlFromUnix("opened_at", bucketSpec);
  const closedBucket = bucketKeySqlFromUnix("closed_at", bucketSpec);

  try {
    const closedWhere = `${base.sql} AND ${VALID_CLOSED}${closedRange.sql}`;
    const closedParams = [...base.params, ...closedRange.params];

    const [
      slices,
      closedSlices,
      countsRow,
      closedPerDay,
      topInRange,
      topAllTime,
      topClosers,
      topReasons,
      visibility,
      transcriptRow,
      closeByType,
      mostInDay,
      longestOpen,
      heavyStats,
    ] = await Promise.all([
      queryRangeSlices(rangeWhere, rangeParams, range),
      queryClosedSlices(closedWhere, closedParams),
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
        `SELECT ${closedBucket} AS date, COUNT(*) AS count
         FROM tickets ${base.sql} AND ${VALID_CLOSED}${closedRange.sql}
         GROUP BY date ORDER BY date`,
        [...base.params, ...closedRange.params]
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
      query<{ closed_by: string; ticket_count: number }>(
        `SELECT closed_by, COUNT(*) AS ticket_count FROM tickets ${closedWhere}
         AND TRIM(closed_by) != ''
         GROUP BY closed_by ORDER BY ticket_count DESC LIMIT 20`,
        closedParams
      ),
      query<{ name: string; count: number }>(
        `SELECT COALESCE(NULLIF(TRIM(reason), ''), 'No reason') AS name, COUNT(*) AS count
         FROM tickets ${closedWhere}
         GROUP BY name ORDER BY count DESC LIMIT 12`,
        closedParams
      ),
      query<{ name: string; count: number }>(
        `SELECT
          CASE
            WHEN LOWER(TRIM(privated)) IN ('true', '1', 'yes') THEN 'Private'
            ELSE 'Public'
          END AS name,
          COUNT(*) AS count
         FROM tickets ${rangeWhere}
         GROUP BY name`,
        rangeParams
      ),
      queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM tickets ${closedWhere}
         AND TRIM(transcript) LIKE 'http%'`,
        closedParams
      ),
      query<{ type: string; median_s: number; cnt: number }>(
        `SELECT type, AVG(dur) AS median_s, COUNT(*) AS cnt FROM (
           SELECT type,
             TIMESTAMPDIFF(SECOND,
               FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)),
               FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))
             ) AS dur
           FROM tickets ${closedWhere}
         ) t WHERE dur > 0
         GROUP BY type ORDER BY cnt DESC LIMIT 12`,
        closedParams
      ),
      query<{ ownerID: string; ticket_date: string; ticket_count: number }>(
        `SELECT ownerID,
          DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS ticket_date,
          COUNT(*) AS ticket_count
         FROM tickets ${rangeWhere}
         AND ownerID NOT IN (?, ?)
         GROUP BY ownerID, ticket_date
         ORDER BY ticket_count DESC LIMIT 10`,
        [...rangeParams, ...EXCLUDED_OPENER_IDS]
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
      queryTimingStats(base, closedRange, range),
    ]);

    const openedPerDay = normalizeTimeSeries(slices.openedPerDay, range);
    const closedDaily = normalizeTimeSeries(mapDaily(closedPerDay), range);
    const avgTicketsPerDay =
      openedPerDay.length > 0
        ? openedPerDay.reduce((s, d) => s + d.count, 0) / openedPerDay.length
        : 0;

    const openedInRange = Number(countsRow?.openedInRange ?? 0);
    const closedInRange = Number(countsRow?.closedInRange ?? 0);
    const closeRatePercent =
      openedInRange > 0
        ? Math.round((closedInRange / openedInRange) * 1000) / 10
        : null;

    const longestGap = heavyStats?.longestGap ?? null;

    return {
      range,
      kpis: {
        avgTicketsPerDay,
        avgTimeBetweenTicketsSeconds: heavyStats?.avgBetween ?? null,
        longestGapSeconds: longestGap?.gapSeconds ?? null,
        openCount: Number(countsRow?.openCount ?? 0),
        closedInRange,
        openedInRange,
        medianCloseSeconds: heavyStats?.medianClose ?? null,
        p90CloseSeconds: heavyStats?.p90Close ?? null,
        closeRatePercent,
        withTranscriptCount: Number(transcriptRow?.count ?? 0),
        backlogDelta: openedInRange - closedInRange,
      },
      openedPerDay,
      closedPerDay: closedDaily,
      netQueuePerDay: computeNetQueue(openedPerDay, closedDaily),
      byType: slices.byType,
      byTypeClosed: closedSlices.byType,
      byHour: fillHourOfDayBuckets(slices.byHour),
      byHourClosed: fillHourOfDayBuckets(closedSlices.byHour),
      byDayOfWeek: fillDayOfWeekBuckets(slices.byDayOfWeek),
      byDayOfWeekClosed: fillDayOfWeekBuckets(closedSlices.byDayOfWeek),
      visibilitySplit: visibility.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topOpenersInRange: mapOpeners(topInRange),
      topOpenersAllTime: mapOpeners(topAllTime),
      topClosersInRange: topClosers.map(
        (r): UserCountRow => ({
          userId: String(r.closed_by),
          count: Number(r.ticket_count),
        })
      ),
      topCloseReasons: topReasons.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
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
      closeTimeByType: closeByType.map(
        (r): CloseTimeByTypeRow => ({
          type: String(r.type),
          medianSeconds: Math.round(Number(r.median_s)),
          count: Number(r.cnt),
        })
      ),
      longestGap,
    };
  } catch (err) {
    console.error("[analytics] getTicketAnalytics failed:", err);
    return null;
  }
}

async function queryRangeSlices(
  rangeWhere: string,
  rangeParams: (string | number)[],
  range: AnalyticsRange
): Promise<{
  openedPerDay: DailyCount[];
  byHour: { hour: number; count: number }[];
  byDayOfWeek: { dow: number; count: number }[];
  byType: { name: string; count: number }[];
}> {
  const bucket = bucketKeySqlFromUnix("opened_at", getTimeBucketSpec(range));
  const rows = await query<SliceRow>(
    `SELECT 'day' AS metric,
      ${bucket} AS k1,
      NULL AS k2,
      COUNT(*) AS val
     FROM tickets ${rangeWhere}
     GROUP BY k1
     UNION ALL
     SELECT 'hour', CAST(HOUR(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS CHAR), NULL, COUNT(*)
     FROM tickets ${rangeWhere}
     GROUP BY HOUR(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)))
     UNION ALL
     SELECT 'dow', CAST(DAYOFWEEK(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) AS CHAR), NULL, COUNT(*)
     FROM tickets ${rangeWhere}
     GROUP BY DAYOFWEEK(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)))
     UNION ALL
     SELECT 'type', type, NULL, COUNT(*)
     FROM tickets ${rangeWhere}
     GROUP BY type`,
    [...rangeParams, ...rangeParams, ...rangeParams, ...rangeParams]
  );

  const openedPerDay: DailyCount[] = [];
  const byHour: { hour: number; count: number }[] = [];
  const byDayOfWeek: { dow: number; count: number }[] = [];
  const byType: { name: string; count: number }[] = [];

  for (const row of rows) {
    const val = Number(row.val);
    switch (row.metric) {
      case "day":
        if (row.k1)
          openedPerDay.push({ date: String(row.k1).slice(0, 10), count: val });
        break;
      case "hour":
        byHour.push({ hour: Number(row.k1), count: val });
        break;
      case "dow":
        byDayOfWeek.push({ dow: Number(row.k1), count: val });
        break;
      case "type":
        if (row.k1) byType.push({ name: row.k1, count: val });
        break;
    }
  }

  openedPerDay.sort((a, b) => a.date.localeCompare(b.date));
  byType.sort((a, b) => b.count - a.count);

  return {
    openedPerDay,
    byHour,
    byDayOfWeek,
    byType: byType.slice(0, 16),
  };
}

async function queryClosedSlices(
  closedWhere: string,
  closedParams: (string | number)[]
): Promise<{
  byHour: { hour: number; count: number }[];
  byDayOfWeek: { dow: number; count: number }[];
  byType: NamedCount[];
}> {
  const rows = await query<SliceRow>(
    `SELECT 'hour' AS metric,
      CAST(HOUR(FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))) AS CHAR) AS k1,
      NULL AS k2,
      COUNT(*) AS val
     FROM tickets ${closedWhere}
     GROUP BY HOUR(FROM_UNIXTIME(CAST(closed_at AS UNSIGNED)))
     UNION ALL
     SELECT 'dow',
      CAST(DAYOFWEEK(FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))) AS CHAR), NULL, COUNT(*)
     FROM tickets ${closedWhere}
     GROUP BY DAYOFWEEK(FROM_UNIXTIME(CAST(closed_at AS UNSIGNED)))
     UNION ALL
     SELECT 'type', type, NULL, COUNT(*)
     FROM tickets ${closedWhere}
     GROUP BY type`,
    [...closedParams, ...closedParams, ...closedParams]
  );

  const byHour: { hour: number; count: number }[] = [];
  const byDayOfWeek: { dow: number; count: number }[] = [];
  const byType: NamedCount[] = [];

  for (const row of rows) {
    const val = Number(row.val);
    switch (row.metric) {
      case "hour":
        byHour.push({ hour: Number(row.k1), count: val });
        break;
      case "dow":
        byDayOfWeek.push({ dow: Number(row.k1), count: val });
        break;
      case "type":
        if (row.k1) byType.push({ name: row.k1, count: val });
        break;
    }
  }

  byType.sort((a, b) => b.count - a.count);
  return { byHour, byDayOfWeek, byType: byType.slice(0, 16) };
}

function computeNetQueue(
  opened: DailyCount[],
  closed: DailyCount[]
): DailyCount[] {
  const map = new Map<string, number>();
  for (const r of opened) {
    map.set(r.date, (map.get(r.date) ?? 0) + r.count);
  }
  for (const r of closed) {
    map.set(r.date, (map.get(r.date) ?? 0) - r.count);
  }
  return [...map.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function queryTimingStats(
  base: { sql: string; params: (string | number)[] },
  closedRange: { sql: string; params: number[] },
  range: AnalyticsRange
): Promise<{
  avgBetween: number | null;
  longestGap: TicketGapRow | null;
  medianClose: number | null;
  p90Close: number | null;
}> {
  const since = rangeSinceUnix(range);
  const rangeTs =
    since != null
      ? ` AND CAST(opened_at AS UNSIGNED) >= ${since}`
      : "";
  const useSample = range === "365d" || range === "all";
  const limitClause = useSample ? ` LIMIT ${SAMPLE_TIMING_LIMIT}` : "";

  const closedWhere = `${base.sql} AND ${VALID_CLOSED}${closedRange.sql}`;
  const closedParams = [...base.params, ...closedRange.params];

  const [gapRow, timingRow, histRows] = await Promise.all([
    queryOne<{
      current_channelID: string;
      current_opened_at: string;
      previous_channelID: string;
      previous_opened_at: string;
      max_gap: number;
    }>(
      `WITH ordered AS (
        SELECT channelID, CAST(opened_at AS UNSIGNED) AS ts
        FROM tickets ${base.sql}${rangeTs}
        ORDER BY ts${limitClause}
      ),
      gaps AS (
        SELECT channelID AS current_channelID, ts AS current_opened_at,
          LAG(channelID) OVER (ORDER BY ts) AS previous_channelID,
          LAG(ts) OVER (ORDER BY ts) AS previous_opened_at,
          ts - LAG(ts) OVER (ORDER BY ts) AS gap
        FROM ordered
      )
      SELECT current_channelID, current_opened_at, previous_channelID,
        previous_opened_at, gap AS max_gap
      FROM gaps WHERE gap IS NOT NULL ORDER BY gap DESC LIMIT 1`,
      base.params
    ),
    queryOne<{ avg_between: number | null }>(
      `WITH ordered AS (
        SELECT CAST(opened_at AS UNSIGNED) AS ts
        FROM tickets ${base.sql}${rangeTs}
        ORDER BY ts${limitClause}
      )
      SELECT AVG(ts - prev_ts) AS avg_between FROM (
        SELECT ts, LAG(ts) OVER (ORDER BY ts) AS prev_ts FROM ordered
      ) d WHERE prev_ts IS NOT NULL`,
      base.params
    ),
    query<{ bucket: number; cnt: number }>(
      `SELECT LEAST(FLOOR(dur / 60), 10080) AS bucket, COUNT(*) AS cnt
       FROM (
         SELECT TIMESTAMPDIFF(SECOND,
           FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)),
           FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))
         ) AS dur
         FROM tickets ${closedWhere}
       ) t
       WHERE dur > 0
       GROUP BY bucket`,
      closedParams
    ),
  ]);

  const longestGap: TicketGapRow | null = gapRow?.max_gap
    ? {
        currentChannelId: String(gapRow.current_channelID),
        currentOpenedAt: Number(gapRow.current_opened_at),
        previousChannelId: String(gapRow.previous_channelID),
        previousOpenedAt: Number(gapRow.previous_opened_at),
        gapSeconds: Number(gapRow.max_gap),
      }
    : null;

  return {
    avgBetween:
      timingRow?.avg_between != null ? Number(timingRow.avg_between) : null,
    longestGap,
    medianClose: percentileFromHistogram(histRows, 0.5),
    p90Close: percentileFromHistogram(histRows, 0.9),
  };
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

function mapOpeners(rows: { ownerID: string; ticket_count: number }[]) {
  return rows.map((r) => ({
    ownerId: String(r.ownerID),
    count: Number(r.ticket_count),
  }));
}
