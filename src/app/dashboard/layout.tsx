import { DashboardDiscordProviders } from "@/components/discord/DashboardDiscordProviders";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.tier === "none") redirect("/unauthorized");

  return (
    <DashboardDiscordProviders
      viewerId={session.id}
      viewerRoleIds={session.roleIds}
      userTier={session.tier}
    >
      <div className="flex min-h-screen bg-background">
        <Sidebar user={session} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardDiscordProviders>
  );
}
