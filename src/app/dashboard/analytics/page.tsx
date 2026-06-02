import { AnalyticsPageClient } from "@/app/dashboard/analytics/AnalyticsPageClient";
import { Header } from "@/components/layout/Header";
import { hasDashboardAccess } from "@/lib/auth/dashboard-access";
import { getAnalyticsBundleData, getAnalyticsSummaryData } from "@/lib/data/analytics";
import { defaultGroupByForRange } from "@/lib/analytics/group-by";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session || !hasDashboardAccess(session)) redirect("/login");
  if (!can(session.tier, "analytics.read")) redirect("/unauthorized");

  const range = parseAnalyticsRange(null);
  const groupBy = defaultGroupByForRange(range);
  const [initialSummary, initialBundle] = await Promise.all([
    getAnalyticsSummaryData(session.tier, range),
    getAnalyticsBundleData(
      session.tier,
      range,
      groupBy,
      ["metrics", "games", "staff-total", "audit"],
      { includeSummary: false }
    ),
  ]);

  return (
    <>
      <Header
        title="Analytics"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analytics" },
        ]}
      />
      <AnalyticsPageClient
        userTier={session.tier}
        initialSummary={initialSummary}
        initialBundle={initialBundle}
        initialRange={range}
        initialGroupBy={groupBy}
      />
    </>
  );
}
