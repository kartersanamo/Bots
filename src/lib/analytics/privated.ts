import type { PermissionTier } from "@/lib/permissions";
import { hasMinimumTier } from "@/lib/permissions";

export function analyticsPrivatedClause(tier: PermissionTier): {
  sql: string;
  params: string[];
} {
  if (hasMinimumTier(tier, "admin")) {
    return { sql: "", params: [] };
  }
  return {
    sql: " AND (privated IS NULL OR TRIM(privated) = '')",
    params: [],
  };
}
