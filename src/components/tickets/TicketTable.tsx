"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { TicketRow } from "@/lib/tickets/types";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import { isTicketOpen } from "@/lib/tickets/types";
import { formatRelativeTime } from "@/lib/utils";
import { discordChannelUrl } from "@/lib/discord/guild";
import { Avatar } from "@/components/ui/Avatar";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketTableProps {
  tickets: TicketRow[];
  enrichments: Record<string, TicketEnrichment>;
  enrichLoading: boolean;
  loading: boolean;
  onSelect: (ticket: TicketRow) => void;
}

function openedAtDate(openedAt: string): Date {
  const n = Number(openedAt);
  if (!Number.isNaN(n) && n > 0) return new Date(n * 1000);
  return new Date(openedAt);
}

export function TicketTable({
  tickets,
  enrichments,
  enrichLoading,
  loading,
  onSelect,
}: TicketTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-md bg-surface-hover"
          />
        ))}
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="rounded-lg border border-border py-12 text-center text-sm text-muted">
        No tickets found.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-3 pr-4 font-medium">#</th>
              <th className="pb-3 pr-4 font-medium">Type</th>
              <th className="pb-3 pr-4 font-medium">Owner</th>
              <th className="pb-3 pr-4 font-medium">Opened</th>
              <th className="pb-3 pr-4 font-medium min-w-[200px]">Intake</th>
              <th className="pb-3 pr-4 font-medium min-w-[200px]">Last message</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const e = enrichments[t.channelID];
              const awaiting = e?.awaitingUser && !e?.enrichmentError;
              return (
                <tr
                  key={t.channelID}
                  onClick={() => onSelect(t)}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors hover:bg-surface-hover",
                    awaiting && "bg-amber-500/5"
                  )}
                >
                  <td className="py-3 pr-4 font-mono text-accent-light">
                    {t.number}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="line-clamp-2 text-white">{t.type}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Avatar
                        userId={t.ownerID}
                        avatarHash={null}
                        size={28}
                        alt={t.ownerID}
                      />
                      <span className="font-mono text-xs text-muted">
                        {t.ownerID.slice(0, 8)}…
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted whitespace-nowrap">
                    {formatRelativeTime(openedAtDate(t.opened_at))}
                  </td>
                  <td className="py-3 pr-4">
                    {enrichLoading && !e ? (
                      <div className="h-4 w-full animate-pulse rounded bg-surface-hover" />
                    ) : e?.enrichmentError ? (
                      <span className="text-xs text-red-400">{e.enrichmentError}</span>
                    ) : (
                      <p className="line-clamp-2 text-xs text-muted">
                        {e?.intakePreview || "—"}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {enrichLoading && !e ? (
                      <div className="h-4 w-full animate-pulse rounded bg-surface-hover" />
                    ) : (
                      <p className="line-clamp-2 text-xs text-white">
                        {e?.lastOwnerPreview ||
                          (e
                            ? (
                                <span className="text-amber-400">
                                  Awaiting user
                                </span>
                              )
                            : "—")}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={isTicketOpen(t.active) ? "success" : "default"}>
                      {isTicketOpen(t.active) ? "Open" : "Closed"}
                    </Badge>
                    {awaiting && (
                      <Badge variant="warning" className="ml-1">
                        New
                      </Badge>
                    )}
                  </td>
                  <td className="py-3" onClick={(ev) => ev.stopPropagation()}>
                    <a
                      href={discordChannelUrl(t.channelID)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="primary">
                        <ExternalLink className="h-3 w-3" />
                        Discord
                      </Button>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {tickets.map((t) => {
          const e = enrichments[t.channelID];
          return (
            <button
              key={t.channelID}
              type="button"
              onClick={() => onSelect(t)}
              className="w-full rounded-lg border border-border bg-surface p-4 text-left hover:bg-surface-hover"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-accent-light">#{t.number}</span>
                <Badge variant={isTicketOpen(t.active) ? "success" : "default"}>
                  {isTicketOpen(t.active) ? "Open" : "Closed"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-white">{t.type}</p>
              {e?.intakePreview ? (
                <p className="mt-2 text-xs text-muted line-clamp-2">
                  {e.intakePreview}
                </p>
              ) : null}
              {e?.lastOwnerPreview ? (
                <p className="mt-1 text-xs text-white line-clamp-2">
                  {e.lastOwnerPreview}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
