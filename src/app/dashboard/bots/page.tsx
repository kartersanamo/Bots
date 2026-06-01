import { BotsHub } from "@/components/bots/BotsHub";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function BotsPage() {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");

  return (
    <>
      <Header
        title="Bots"
        description="Manage all Minecadia bots — process control, logs, config, DMs, and actions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bots" },
        ]}
      />
      <BotsHub
        canRestart={can(session.tier, "fleet.restart")}
        canRestartAll={can(session.tier, "fleet.restart_all")}
      />
    </>
  );
}
