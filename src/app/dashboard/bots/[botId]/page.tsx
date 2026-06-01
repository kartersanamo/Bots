import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBotById } from "@/lib/bots/registry";
import {
  Bot,
  Crown,
  Gamepad2,
  Shield,
  Ticket,
  Users,
  Wrench,
} from "lucide-react";
import { notFound } from "next/navigation";
import type { ElementType } from "react";

const ICON_MAP: Record<string, ElementType> = {
  Gamepad2,
  Ticket,
  Shield,
  Wrench,
  Users,
  Crown,
};

interface BotDetailPageProps {
  params: Promise<{ botId: string }>;
}

export default async function BotDetailPage({ params }: BotDetailPageProps) {
  const { botId } = await params;
  const bot = getBotById(botId);

  if (!bot) notFound();

  const Icon = ICON_MAP[bot.icon] || Bot;

  return (
    <>
      <Header
        title={bot.shortName}
        description={bot.description}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bots", href: "/dashboard/bots" },
          { label: bot.shortName },
        ]}
        action={<Badge variant="warning">Status: Phase 2</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${bot.accentColor}20` }}
          >
            <Icon className="h-10 w-10" style={{ color: bot.accentColor }} />
          </div>
          <h2 className="text-center text-xl font-bold text-white">
            {bot.name}
          </h2>
          <p className="mt-1 text-center text-sm text-muted">{bot.id}</p>
          <div className="mt-6 space-y-3 text-sm">
            <div>
              <p className="text-muted">Commands</p>
              <p className="font-medium text-white">{bot.commands.length}</p>
            </div>
            <div>
              <p className="text-muted">Config Files</p>
              <p className="font-medium text-white">{bot.configFiles.length}</p>
            </div>
            <div>
              <p className="text-muted">DB Tables</p>
              <p className="font-medium text-white">
                {bot.databaseTables.length}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-white">Features</h3>
            <ul className="space-y-2">
              {bot.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-muted"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: bot.accentColor }}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Commands
              </h3>
              <div className="flex flex-wrap gap-2">
                {bot.commands.map((cmd) => (
                  <code
                    key={cmd}
                    className="rounded bg-surface-hover px-2 py-1 text-xs text-accent-light"
                  >
                    {cmd}
                  </code>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Database Tables
              </h3>
              <div className="flex flex-wrap gap-2">
                {bot.databaseTables.map((t) => (
                  <Badge key={t} variant="info">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-lg font-semibold text-white">
              Config Files
            </h3>
            <div className="space-y-1">
              {bot.configFiles.map((f) => (
                <p key={f} className="font-mono text-xs text-muted">
                  {f}
                </p>
              ))}
            </div>
          </Card>

          <EmptyState
            icon={Bot}
            title="Bot control coming in Phase 2"
            description="Live status, log tailing, config editing, and cog management will be available once the Bot Control API is built."
          />
        </div>
      </div>
    </>
  );
}
