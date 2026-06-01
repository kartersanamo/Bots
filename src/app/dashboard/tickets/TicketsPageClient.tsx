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
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <>
      <Header
        title="Tickets"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Tickets" },
        ]}
      />

      {!configured && (
        <p className="mb-4 text-sm text-amber-400">Database not configured.</p>
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
