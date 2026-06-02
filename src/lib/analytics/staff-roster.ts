/**
 * Departed staff keep a `statistics` row with every counter at zero.
 * Only roster members with at least one non-zero stat are active staff.
 */
export const ACTIVE_STAFF_WHERE_STATISTICS = `(
  COALESCE(CAST(tickets_closed AS UNSIGNED), 0) > 0
  OR COALESCE(CAST(messages_sent AS UNSIGNED), 0) > 0
  OR COALESCE(CAST(warnings AS UNSIGNED), 0) > 0
  OR COALESCE(CAST(screenshares AS UNSIGNED), 0) > 0
)`;

/** `statistics` join condition for analytics queries (e.g. member messages). */
export function activeStaffStatisticsJoin(alias: string): string {
  return `(
    COALESCE(CAST(${alias}.tickets_closed AS UNSIGNED), 0) > 0
    OR COALESCE(CAST(${alias}.messages_sent AS UNSIGNED), 0) > 0
    OR COALESCE(CAST(${alias}.warnings AS UNSIGNED), 0) > 0
    OR COALESCE(CAST(${alias}.screenshares AS UNSIGNED), 0) > 0
  )`;
}

export const ACTIVE_STAFF_USER_IDS_SUBQUERY = `
  SELECT user_ID FROM statistics WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}`;
