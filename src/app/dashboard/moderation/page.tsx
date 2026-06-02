import { ModerationWorkspace } from "@/components/moderation/ModerationWorkspace";
import { Header } from "@/components/layout/Header";
import { hasDashboardAccess } from "@/lib/auth/dashboard-access";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function ModerationPage() {
  const session = await getSession();
  if (!session || !hasDashboardAccess(session)) redirect("/login");

  const canView =
    can(session.tier, "bans.read") || can(session.tier, "discord.moderate");
  if (!canView) redirect("/unauthorized");

  const canModerate = can(session.tier, "discord.moderate");

  return (
    <>
      <Header
        title="Moderation"
        description="Manage guild bans, timeouts, and member discipline."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Moderation" },
        ]}
      />
      <ModerationWorkspace canModerate={canModerate} />
    </>
  );
}
