"use client";

import { useCallback, useEffect, useState } from "react";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import type { TicketRow } from "@/lib/tickets/types";

export function useTicketEnrichment(tickets: TicketRow[], enabled: boolean) {
  const [enrichments, setEnrichments] = useState<
    Record<string, TicketEnrichment>
  >({});
  const [loading, setLoading] = useState(false);

  const fetchEnrichment = useCallback(async () => {
    if (!enabled || !tickets.length) {
      setEnrichments({});
      return;
    }
    setLoading(true);
    try {
      const channelIds = tickets.map((t) => t.channelID);
      const owners: Record<string, string> = {};
      for (const t of tickets) owners[t.channelID] = t.ownerID;

      const res = await fetch("/api/tickets/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds, owners }),
      });
      const data = await res.json();
      if (res.ok) setEnrichments(data.enrichments || {});
    } finally {
      setLoading(false);
    }
  }, [tickets, enabled]);

  useEffect(() => {
    fetchEnrichment();
  }, [fetchEnrichment]);

  return { enrichments, loading, refresh: fetchEnrichment };
}
