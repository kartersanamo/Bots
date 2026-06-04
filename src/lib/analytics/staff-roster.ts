import { staffActiveWhereClause } from "@/lib/analytics/staff-stat-fields";

/**
 * Departed staff keep a `statistics` row with every counter at zero.
 * Only roster members with at least one non-zero stat are active staff.
 */
export const ACTIVE_STAFF_WHERE_STATISTICS = `(${staffActiveWhereClause()})`;

/** `statistics` join condition for analytics queries (e.g. member messages). */
export function activeStaffStatisticsJoin(alias: string): string {
  return `(${staffActiveWhereClause(alias)})`;
}

export const ACTIVE_STAFF_USER_IDS_SUBQUERY = `
  SELECT user_ID FROM statistics WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}`;

/** Exclude users on the active staff roster (statistics). */
export function nonStaffMemberFilter(memberAlias = "m"): string {
  const col = `${memberAlias}.user_id`;
  return `${col} NOT IN (${ACTIVE_STAFF_USER_IDS_SUBQUERY})`;
}
