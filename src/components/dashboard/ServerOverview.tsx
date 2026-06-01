"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHANNEL_TYPE_LABELS } from "@/lib/discord/api";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import { Hash, Server, Users, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  approximatePresenceCount?: number;
  premiumTier: number;
}

interface GuildRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

interface GuildChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
}

export function ServerOverview() {
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/server/info")
      .then((r) => r.json())
      .then((data) => {
        setGuild(data.guild);
        setRoles(data.roles ?? []);
        setChannels(data.channels ?? []);
        setConfigured(data.configured);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  if (!configured || !guild) {
    return (
      <EmptyState
        icon={Server}
        title="Discord API not configured"
        description="Add DISCORD_BOT_TOKEN and DISCORD_GUILD_ID to your .env file to view server information."
      />
    );
  }

  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
  const voiceChannels = channels.filter((c) => c.type === 2);
  const categories = channels.filter((c) => c.type === 4);
  const staffRoles = roles.filter((r) => r.name !== "@everyone" && r.color !== 0).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Members", value: formatNumber(guild.memberCount), icon: Users },
          {
            label: "Online",
            value: formatNumber(guild.approximatePresenceCount ?? 0),
            icon: Users,
          },
          { label: "Boost Tier", value: `Tier ${guild.premiumTier}`, icon: Server },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="flex items-center gap-4">
              <div className="rounded-lg bg-accent/10 p-3">
                <stat.icon className="h-5 w-5 text-accent-light" />
              </div>
              <div>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Hash className="h-4 w-4 text-accent-light" />
            <h2 className="text-lg font-semibold text-white">
              Channels ({textChannels.length + voiceChannels.length})
            </h2>
          </div>
          <div className="mb-3 flex gap-2">
            <Badge variant="info">{categories.length} categories</Badge>
            <Badge variant="default">{textChannels.length} text</Badge>
            <Badge variant="default">{voiceChannels.length} voice</Badge>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {channels.slice(0, 40).map((ch) => (
              <div
                key={ch.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-hover"
              >
                {ch.type === 2 ? (
                  <Volume2 className="h-3.5 w-3.5 text-muted" />
                ) : (
                  <Hash className="h-3.5 w-3.5 text-muted" />
                )}
                <span className="text-white">{ch.name}</span>
                <span className="ml-auto text-xs text-muted">
                  {CHANNEL_TYPE_LABELS[ch.type] ?? "Other"}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent-light" />
            <h2 className="text-lg font-semibold text-white">
              Roles ({roles.length})
            </h2>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {staffRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-hover"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99aab5",
                  }}
                />
                <span className="text-white">{role.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
