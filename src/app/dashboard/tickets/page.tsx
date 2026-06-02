import { OpenTicketsWorkspace } from "@/components/analytics/open-tickets/OpenTicketsWorkspace";
import { Header } from "@/components/layout/Header";
import { hasDashboardAccess } from "@/lib/auth/dashboard-access";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function TicketsPage() {
  const session = await getSession();
  if (!session || !hasDashboardAccess(session)) redirect("/login");
  if (!can(session.tier, "tickets.read")) redirect("/unauthorized");

  return (
    <>
      <Header
        title="Tickets"
        description="Open ticket queue — resolve active tickets quickly."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Tickets" },
        ]}
      />
      <Suspense
        fallback={
          <div className="animate-pulse text-muted">Loading open tickets…</div>
        }
      >
        <OpenTicketsWorkspace userTier={session.tier} />
      </Suspense>
    </>
  );
}
