"use client";

import { dashboardFetch } from "@/lib/api/dashboard-fetch";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import type { TicketRow } from "@/lib/tickets/types";

function enrichmentKey(tickets: TicketRow[]): string {
  return tickets.map((t) => `${t.channelID}:${t.ownerID}`).join(",");
}

export function useTicketEnrichment(tickets: TicketRow[], enabled: boolean) {
  const [enrichments, setEnrichments] = useState<
    Record<string, TicketEnrichment>
  >({});
  const [loading, setLoading] = useState(false);

  const ticketKey = enrichmentKey(tickets);
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  const abortRef = useRef<AbortController | null>(null);

  const fetchEnrichment = useCallback(
    async (options?: { silent?: boolean }) => {
      abortRef.current?.abort();

      if (!enabled || !ticketKey) {
        setEnrichments({});
        setLoading(false);
        return;
      }

      const current = ticketsRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      if (!options?.silent) setLoading(true);
      try {
        const channelIds = current.map((t) => t.channelID);
        const owners: Record<string, string> = {};
        for (const t of current) owners[t.channelID] = t.ownerID;

        const res = await dashboardFetch("/api/tickets/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelIds, owners }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (res.ok) setEnrichments(data.enrichments || {});
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("[tickets] enrich failed:", err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [ticketKey, enabled]
  );

  useEffect(() => {
    fetchEnrichment();
    return () => abortRef.current?.abort();
  }, [fetchEnrichment]);

  const refresh = useCallback(
    () => fetchEnrichment({ silent: true }),
    [fetchEnrichment]
  );

  return { enrichments, loading, refresh };
}
