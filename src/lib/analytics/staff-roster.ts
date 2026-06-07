import { staffActiveWhereClause } from "@/lib/analytics/staff-stat-fields";

/**
 * Departed staff keep a `staff_statistics` row with every counter at zero.
 * Only roster members with at least one non-zero stat are active staff.
 */
export const ACTIVE_STAFF_WHERE_STATISTICS = `(${staffActiveWhereClause()})`;

/** `staff_statistics` join condition for analytics queries (e.g. member messages). */
export function activeStaffStatisticsJoin(alias: string): string {
  return `(${staffActiveWhereClause(alias)})`;
}

export const ACTIVE_STAFF_USER_IDS_SUBQUERY = `
  SELECT user_id FROM staff_statistics WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}`;

/** Exclude users on the active staff roster (staff_statistics). */
export function nonStaffMemberFilter(memberAlias = "m"): string {
  const col = `${memberAlias}.user_id`;
  return `${col} NOT IN (${ACTIVE_STAFF_USER_IDS_SUBQUERY})`;
}
