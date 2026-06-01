"use client";

import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRelativeTime } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Bot,
  Ticket,
  Users,
  BarChart3,
  Ban,
  MessageSquare,
} from "lucide-react";
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
  active: number;
}

interface GuildInfo {
  name: string;
  memberCount: number;
  approximatePresenceCount?: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [tickets, setTickets] = useState<RecentTicket[]>([]);
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbConfigured, setDbConfigured] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, ticketsRes, serverRes] = await Promise.all([
          fetch("/api/stats/overview"),
          fetch("/api/tickets/recent?limit=5"),
          fetch("/api/server/info"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setDbConfigured(data.configured);
        }

        if (ticketsRes.ok) {
          const data = await ticketsRes.json();
          setTickets(data.tickets);
        }

        if (serverRes.ok) {
          const data = await serverRes.json();
          if (data.guild) setGuild(data.guild);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open Tickets"
          value={stats?.openTickets ?? "—"}
          icon={Ticket}
          loading={loading}
          trend={stats ? `${stats.ticketsToday} opened today` : undefined}
          delay={0}
        />
        <StatCard
          label="Total Tickets"
          value={stats?.totalTickets ?? "—"}
          icon={BarChart3}
          loading={loading}
          delay={0.05}
        />
        <StatCard
          label="Server Members"
          value={guild?.memberCount ?? "—"}
          icon={Users}
          loading={loading}
          trend={
            guild?.approximatePresenceCount
              ? `${guild.approximatePresenceCount} online`
              : undefined
          }
          delay={0.1}
        />
        <StatCard
          label="Leveling Users"
          value={stats?.totalLevelingUsers ?? "—"}
          icon={MessageSquare}
          loading={loading}
          delay={0.15}
        />
      </div>

      {!dbConfigured && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400"
        >
          Database not configured. Add DB credentials to <code className="text-amber-300">.env</code> to see live stats.
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
            <Badge variant="info">Live</Badge>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-hover" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted">No tickets found or DB not connected.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div
                  key={t.channelID}
                  className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium capitalize text-white">
                      {t.type}
                    </p>
                    <p className="text-xs text-muted">
                      {t.opened ? formatRelativeTime(t.opened) : "Unknown"}
                    </p>
                  </div>
                  <Badge variant={t.active ? "success" : "default"}>
                    {t.active ? "Open" : "Closed"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Bot Fleet</h2>
            <Badge variant="warning">Phase 2</Badge>
          </div>
          <p className="mb-4 text-sm text-muted">
            Live bot status monitoring will be available in Phase 2 via the Bot Control API.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {["Games", "Tickets", "Management", "Utilities", "Staff", "Leader"].map(
              (name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2"
                >
                  <Bot className="h-4 w-4 text-accent-light" />
                  <span className="text-sm text-white">{name}</span>
                  <span className="ml-auto h-2 w-2 rounded-full bg-amber-400" />
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Polls"
          value={stats?.totalPolls ?? "—"}
          icon={BarChart3}
          loading={loading}
          delay={0}
        />
        <StatCard
          label="Blacklists"
          value={stats?.totalBlacklists ?? "—"}
          icon={Ban}
          loading={loading}
          delay={0.05}
        />
        <StatCard
          label="Closed Tickets"
          value={stats?.closedTickets ?? "—"}
          icon={Ticket}
          loading={loading}
          delay={0.1}
        />
      </div>
    </div>
  );
}
