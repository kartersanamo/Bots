"use client";

import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRelativeTime, isTicketOpen } from "@/lib/utils";
import {
  Bot,
  Ticket,
  Users,
  BarChart3,
  Ban,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface OverviewStats {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  totalPolls: number;
  totalLevelingUsers: number;
  totalBlacklists: number;
  ticketsToday: number;
}

interface RecentTicket {
  channelID: string;
  ownerID: string;
  type: string;
  opened: string | null;
  closed: string | null;
  active: string | number;
}

interface GuildInfo {
  name: string;
  memberCount: number;
  approximatePresenceCount?: number;
}

interface BotStatusRow {
  id: string;
  shortName: string;
  status: string;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [tickets, setTickets] = useState<RecentTicket[]>([]);
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [botRows, setBotRows] = useState<BotStatusRow[]>([]);
  const [coreLoading, setCoreLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCore() {
      try {
        const [statsRes, ticketsRes] = await Promise.all([
          fetch("/api/stats/overview"),
          fetch("/api/tickets/recent?limit=5"),
        ]);

        if (cancelled) return;

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setDbConfigured(data.configured !== false);
          setDbConnected(data.connected !== false);
        }

        if (ticketsRes.ok) {
          const data = await ticketsRes.json();
          setTickets(data.tickets);
        }
      } finally {
        if (!cancelled) setCoreLoading(false);
      }
    }

    async function loadSecondary() {
      try {
        const [serverRes, botsRes] = await Promise.all([
          fetch("/api/server/info"),
          fetch("/api/bots"),
        ]);

        if (cancelled) return;

        if (serverRes.ok) {
          const data = await serverRes.json();
          if (data.guild) setGuild(data.guild);
        }

        if (botsRes.ok) {
          const data = await botsRes.json();
          setBotRows(
            (data.bots || []).map(
              (b: { id: string; shortName: string; status: string }) => ({
                id: b.id,
                shortName: b.shortName,
                status: b.status,
              })
            )
          );
        }
      } finally {
        if (!cancelled) setSecondaryLoading(false);
      }
    }

    loadCore();
    loadSecondary();

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = coreLoading;
  const onlineCount = botRows.filter((b) => b.status === "online").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tickets"
          value={stats?.openTickets ?? "—"}
          icon={Ticket}
          loading={loading}
          trend={stats ? `${stats.ticketsToday} today` : undefined}
        />
        <StatCard
          label="Total tickets"
          value={stats?.totalTickets ?? "—"}
          icon={BarChart3}
          loading={loading}
        />
        <StatCard
          label="Members"
          value={guild?.memberCount ?? (secondaryLoading ? "—" : "—")}
          icon={Users}
          loading={secondaryLoading && !guild}
          trend={
            guild?.approximatePresenceCount
              ? `${guild.approximatePresenceCount} online`
              : undefined
          }
        />
        <StatCard
          label="Leveling users"
          value={stats?.totalLevelingUsers ?? "—"}
          icon={MessageSquare}
          loading={loading}
        />
      </div>

      {!loading && !dbConfigured && (
        <p className="text-sm text-amber-400">Database not configured.</p>
      )}
      {!loading && dbConfigured && !dbConnected && (
        <p className="text-sm text-red-400">Database connection failed.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent tickets</h2>
            <Link
              href="/dashboard/tickets"
              className="text-xs text-muted hover:text-white"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-md bg-surface-hover"
                />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted">No tickets.</p>
          ) : (
            <div className="space-y-1">
              {tickets.map((t) => (
                <div
                  key={t.channelID}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-hover"
                >
                  <div>
                    <p className="text-sm capitalize text-white">{t.type}</p>
                    <p className="text-xs text-muted">
                      {t.opened ? formatRelativeTime(t.opened) : "—"}
                    </p>
                  </div>
                  <Badge variant={isTicketOpen(t.active) ? "success" : "default"}>
                    {isTicketOpen(t.active) ? "Open" : "Closed"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Bots</h2>
            <Link
              href="/dashboard/bots"
              className="text-xs text-muted hover:text-white"
            >
              Manage
            </Link>
          </div>
          <p className="mb-3 text-xs text-muted">
            {secondaryLoading
              ? "Loading…"
              : `${onlineCount} of ${botRows.length} online`}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {secondaryLoading && botRows.length === 0
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-md bg-surface-hover"
                  />
                ))
              : botRows.map((b) => (
                  <Link
                    key={b.id}
                    href={`/dashboard/bots/${b.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-surface-hover"
                  >
                    <Bot className="h-3.5 w-3.5 text-muted" />
                    <span className="text-sm text-white">{b.shortName}</span>
                    <span
                      className={`ml-auto h-1.5 w-1.5 rounded-full ${
                        b.status === "online"
                          ? "bg-green-500"
                          : b.status === "offline"
                            ? "bg-zinc-500"
                            : "bg-amber-500"
                      }`}
                    />
                  </Link>
                ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Polls"
          value={stats?.totalPolls ?? "—"}
          icon={BarChart3}
          loading={loading}
        />
        <StatCard
          label="Blacklists"
          value={stats?.totalBlacklists ?? "—"}
          icon={Ban}
          loading={loading}
        />
        <StatCard
          label="Closed tickets"
          value={stats?.closedTickets ?? "—"}
          icon={Ticket}
          loading={loading}
        />
      </div>
    </div>
  );
}
