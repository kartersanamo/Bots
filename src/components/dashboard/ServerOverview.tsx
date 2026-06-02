"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchDedup } from "@/lib/api/fetch-dedup";
import type { GuildInfoPayload } from "@/lib/guild-info-types";
import { CHANNEL_TYPE_LABELS } from "@/lib/discord/api";
import { formatNumber } from "@/lib/utils";
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

export function ServerOverview({
  initialData,
}: {
  initialData?: GuildInfoPayload;
}) {
  const [guild, setGuild] = useState<GuildInfo | null>(
    (initialData?.guild as GuildInfo | null) ?? null
  );
  const [roles, setRoles] = useState<GuildRole[]>(
    (initialData?.roles as GuildRole[]) ?? []
  );
  const [channels, setChannels] = useState<GuildChannel[]>(
    (initialData?.channels as GuildChannel[]) ?? []
  );
  const [configured, setConfigured] = useState(initialData?.configured !== false);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    fetchDedup<GuildInfoPayload>("/api/server/info")
      .then((data) => {
        setGuild(data.guild as GuildInfo | null);
        setRoles((data.roles as GuildRole[]) ?? []);
        setChannels((data.channels as GuildChannel[]) ?? []);
        setConfigured(data.configured);
      })
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  if (!configured) {
    return (
      <EmptyState
        icon={Server}
        title="Discord not configured"
        description="Set DISCORD_BOT_TOKEN and GUILD_ID to load server info."
      />
    );
  }

  if (!guild) {
    return (
      <EmptyState
        icon={Server}
        title="Guild unavailable"
        description="Could not fetch guild from Discord."
      />
    );
  }

  const textChannels = channels.filter((c) => c.type === 0);
  const voiceChannels = channels.filter((c) => c.type === 2);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20">
            <Server className="h-7 w-7 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{guild.name}</h2>
            <p className="mt-1 text-sm text-muted">ID {guild.id}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="default">
                <Users className="mr-1 h-3 w-3" />
                {formatNumber(guild.memberCount)} members
              </Badge>
              {guild.approximatePresenceCount != null && (
                <Badge variant="success">
                  {formatNumber(guild.approximatePresenceCount)} online
                </Badge>
              )}
              <Badge variant="default">Boost tier {guild.premiumTier}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Roles ({roles.length})
          </h3>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {roles.slice(0, 30).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-surface-hover"
              >
                <span style={{ color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : undefined }}>
                  {r.name}
                </span>
                <span className="text-xs text-muted">pos {r.position}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Channels</h3>
          <p className="mb-2 text-xs text-muted">
            {textChannels.length} text · {voiceChannels.length} voice
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {channels.slice(0, 40).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-hover"
              >
                {c.type === 2 ? (
                  <Volume2 className="h-3.5 w-3.5 text-muted" />
                ) : (
                  <Hash className="h-3.5 w-3.5 text-muted" />
                )}
                <span className="truncate text-white">{c.name}</span>
                <span className="ml-auto text-xs text-muted">
                  {CHANNEL_TYPE_LABELS[c.type] ?? c.type}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
