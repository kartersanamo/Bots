import { ModerationPanel } from "@/components/panels/ModerationPanel";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function ModerationPage() {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "discord.moderate")) redirect("/unauthorized");

  return (
    <>
      <Header
        title="Moderation"
        description="Timeout, kick, ban, and unban members via Discord API."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Moderation" },
        ]}
      />
      <ModerationPanel />
    </>
  );
}
