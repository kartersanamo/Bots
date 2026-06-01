import { BotPanels } from "@/components/panels/BotPanels";
import { Header } from "@/components/layout/Header";
import { getBotById } from "@/lib/bots/registry";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function BotPanelPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "bot.panels")) redirect("/unauthorized");

  const { botId } = await params;
  const bot = getBotById(botId);
  if (!bot) notFound();

  return (
    <>
      <Header
        title={`${bot.shortName} Actions`}
        description="Bot-specific write operations (tickets, leveling, moderation, and more)."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bots", href: "/dashboard/bots" },
          { label: bot.shortName, href: `/dashboard/bots/${botId}` },
          { label: "Actions" },
        ]}
      />
      <BotPanels botId={botId} />
    </>
  );
}
