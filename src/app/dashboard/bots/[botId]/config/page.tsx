import { ConfigEditor } from "@/components/fleet/ConfigEditor";
import { Header } from "@/components/layout/Header";
import { getBotById } from "@/lib/bots/registry";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function BotConfigPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "config.view")) redirect("/unauthorized");

  const { botId } = await params;
  const bot = getBotById(botId);
  if (!bot) notFound();

  return (
    <>
      <Header
        title={`${bot.shortName} Config`}
        description="Edit JSON configuration files with automatic backups."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bots", href: "/dashboard/bots" },
          { label: bot.shortName, href: `/dashboard/bots/${botId}` },
          { label: "Config" },
        ]}
      />
      <ConfigEditor botId={botId} canEdit={can(session.tier, "config.edit")} />
    </>
  );
}
