import { DmInbox } from "@/components/fleet/DmInbox";
import { Header } from "@/components/layout/Header";
import { getBotById } from "@/lib/bots/registry";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function BotInboxPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "dm.view")) redirect("/unauthorized");

  const { botId } = await params;
  const bot = getBotById(botId);
  if (!bot) notFound();

  return (
    <>
      <Header
        title={`${bot.shortName} DM Inbox`}
        description="View and reply to direct messages sent to this bot."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bots", href: "/dashboard/bots" },
          { label: bot.shortName, href: `/dashboard/bots/${botId}` },
          { label: "Inbox" },
        ]}
      />
      <DmInbox botId={botId} canSend={can(session.tier, "dm.send")} />
    </>
  );
}
