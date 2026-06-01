import { AnalyticsPageClient } from "@/app/dashboard/analytics/AnalyticsPageClient";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "analytics.read")) redirect("/unauthorized");

  return (
    <>
      <Header
        title="Analytics"
        description="Server-wide analytics — tickets, games, staff, moderation, audit, and cross-system overview."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analytics" },
        ]}
      />
      <Suspense
        fallback={
          <div className="animate-pulse text-muted">Loading analytics…</div>
        }
      >
        <AnalyticsPageClient userTier={session.tier} />
      </Suspense>
    </>
  );
}
