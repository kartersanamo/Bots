import { BotWorkspace } from "@/components/bots/BotWorkspace";
import { getSession } from "@/lib/auth/session";
import { getBotById } from "@/lib/bots/registry";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface BotPageProps {
  params: Promise<{ botId: string }>;
}

export default async function BotWorkspacePage({ params }: BotPageProps) {
  const session = await getSession();
  if (!session || session.tier === "none") redirect("/login");
  if (!can(session.tier, "fleet.view")) redirect("/unauthorized");

  const { botId } = await params;
  const bot = getBotById(botId);
  if (!bot) notFound();

  return (
    <Suspense
      fallback={
        <div className="animate-pulse text-muted">Loading bot workspace…</div>
      }
    >
      <BotWorkspace
        bot={bot}
        userTier={session.tier}
        canRestart={can(session.tier, "fleet.restart")}
        canEditConfig={can(session.tier, "config.edit")}
        canSendDm={can(session.tier, "dm.send")}
      />
    </Suspense>
  );
}
