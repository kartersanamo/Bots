import { FleetControl } from "@/components/fleet/FleetControl";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function FleetPage() {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");

  return (
    <>
      <Header
        title="Fleet Control"
        description="Start, stop, and restart Minecadia bots. Monitor live process status."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Fleet" },
        ]}
      />
      <FleetControl
        canRestart={can(session.tier, "fleet.restart")}
        canRestartAll={can(session.tier, "fleet.restart_all")}
      />
    </>
  );
}
