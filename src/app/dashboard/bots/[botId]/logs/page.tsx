import { LogViewer } from "@/components/fleet/LogViewer";
import { Header } from "@/components/layout/Header";
import { getBotById } from "@/lib/bots/registry";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function BotLogsPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "logs.view")) redirect("/unauthorized");

  const { botId } = await params;
  const bot = getBotById(botId);
  if (!bot) notFound();

  return (
    <>
      <Header
        title={`${bot.shortName} Logs`}
        description="Live log tail with search and file selection."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bots", href: "/dashboard/bots" },
          { label: bot.shortName, href: `/dashboard/bots/${botId}` },
          { label: "Logs" },
        ]}
      />
      <LogViewer botId={botId} />
    </>
  );
}
