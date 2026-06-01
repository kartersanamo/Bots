"use client";

import { TicketlogsFilters } from "@/components/analytics/ticketlogs/TicketlogsFilters";
import { TicketDetailDrawer } from "@/components/tickets/TicketDetailDrawer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useTicketlogsSearch } from "@/hooks/useTicketlogsSearch";
import { can, type PermissionTier } from "@/lib/permissions";
import type { TicketRow } from "@/lib/tickets/types";
import { formatUnixTimestamp } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { useState } from "react";

interface TicketlogsWorkspaceProps {
  userTier: PermissionTier;
}

function hasTranscriptUrl(t: TicketRow): boolean {
  return Boolean(t.transcript?.trim().startsWith("http"));
}

export function TicketlogsWorkspace({ userTier }: TicketlogsWorkspaceProps) {
  const {
    state,
    setParams,
    tickets,
    total,
    types,
    loading,
    configured,
    refresh,
    buildQueryString,
    pageCount,
  } = useTicketlogsSearch();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const exportCsv = () => {
    window.open(`/api/tickets?${buildQueryString()}&format=csv`, "_blank");
  };

  return (
    <div className="space-y-4">
      {!configured && (
        <p className="text-sm text-amber-400">Database not configured.</p>
      )}

      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent p-4">
        <h2 className="text-lg font-semibold text-white">Ticket logs</h2>
        <p className="mt-1 text-sm text-muted">
          Search closed tickets, view close reasons, and open transcripts from the
          archive.
        </p>
      </div>

      <TicketlogsFilters
        state={state}
        types={types}
        onChange={setParams}
        onRefresh={refresh}
        loading={loading}
        canViewPrivate={can(userTier, "tickets.view_private")}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {loading ? "Searching…" : `${total.toLocaleString()} result${total !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Export CSV (this page)
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Opened</th>
              <th className="px-4 py-3 font-medium">Closed</th>
              <th className="px-4 py-3 font-medium">Closed by</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Transcript</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-10 animate-pulse rounded bg-surface-hover" />
                  </td>
                </tr>
              ))}
            {!loading && !tickets.length && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted">
                  No tickets match your search.
                </td>
              </tr>
            )}
            {!loading &&
              tickets.map((t) => (
                <tr
                  key={t.channelID}
                  onClick={() => setSelectedId(t.channelID)}
                  className="cursor-pointer border-b border-border/50 hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-medium text-white">#{t.number}</td>
                  <td className="px-4 py-3">
                    <Badge>{t.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DiscordUserChip userId={t.ownerID} />
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {formatUnixTimestamp(t.opened_at)}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {formatUnixTimestamp(t.closed_at)}
                  </td>
                  <td className="px-4 py-3">
                    {t.closed_by?.trim() ? (
                      <DiscordUserChip userId={t.closed_by} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-white/80">
                    {t.reason?.trim() || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {hasTranscriptUrl(t) ? (
                      <a
                        href={t.transcript.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {state.page} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={state.page <= 1}
              onClick={() => setParams({ page: state.page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={state.page >= pageCount}
              onClick={() => setParams({ page: state.page + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <TicketDetailDrawer
        channelId={selectedId}
        onClose={() => setSelectedId(null)}
        userTier={userTier}
      />
    </div>
  );
}
