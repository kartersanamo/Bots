"use client";

import { Header } from "@/components/layout/Header";
import { TicketStatsBar } from "@/components/tickets/TicketStatsBar";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { TicketTable } from "@/components/tickets/TicketTable";
import { TicketDetailDrawer } from "@/components/tickets/TicketDetailDrawer";
import { useTicketsList } from "@/hooks/useTicketsList";
import { useTicketEnrichment } from "@/hooks/useTicketEnrichment";
import { Button } from "@/components/ui/Button";
import type { TicketRow } from "@/lib/tickets/types";
import { can, type PermissionTier } from "@/lib/permissions";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

interface TicketsPageClientProps {
  userTier: PermissionTier;
}

export function TicketsPageClient({ userTier }: TicketsPageClientProps) {
  const {
    state,
    setParams,
    tickets,
    total,
    stats,
    types,
    loading,
    configured,
    refresh,
    pageCount,
  } = useTicketsList();

  const enrichEnabled = state.status === "open";
  const { enrichments, loading: enrichLoading, refresh: refreshEnrich } =
    useTicketEnrichment(tickets, enrichEnabled);

  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      refresh();
      refreshEnrich();
    }, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, refresh, refreshEnrich]);

  function exportCsv() {
    const headers = [
      "number",
      "type",
      "ownerID",
      "channelID",
      "opened_at",
      "active",
      "intake",
      "lastMessage",
    ];
    const rows = tickets.map((t) => {
      const e = enrichments[t.channelID];
      return [
        t.number,
        t.type,
        t.ownerID,
        t.channelID,
        t.opened_at,
        t.active,
        (e?.intakePreview || "").replace(/"/g, '""'),
        (e?.lastOwnerPreview || "").replace(/"/g, '""'),
      ];
    });
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${state.status}-page${state.page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header
        title="Tickets"
        description="Command center for support tickets — intake, activity, and quick access to Discord."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Tickets" },
        ]}
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={exportCsv}
            disabled={!tickets.length}
          >
            <Download className="h-4 w-4" />
            Export page
          </Button>
        }
      />

      {!configured && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          Database not configured. Check your .env file.
        </div>
      )}

      <div className="mb-6">
        <TicketStatsBar stats={stats} loading={loading} />
      </div>

      <div className="mb-6">
        <TicketFilters
          state={state}
          types={types}
          onChange={setParams}
          onRefresh={() => {
            refresh();
            refreshEnrich();
          }}
          loading={loading}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          canViewPrivate={can(userTier, "tickets.view_private")}
        />
      </div>

      <TicketTable
        tickets={tickets}
        enrichments={enrichments}
        enrichLoading={enrichLoading}
        loading={loading}
        onSelect={setSelected}
      />

      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted">
            {total} ticket{total !== 1 ? "s" : ""} · Page {state.page} of{" "}
            {pageCount}
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
        channelId={selected?.channelID ?? null}
        onClose={() => setSelected(null)}
        userTier={userTier}
        onClosed={() => {
          refresh();
          setSelected(null);
        }}
      />
    </>
  );
}
