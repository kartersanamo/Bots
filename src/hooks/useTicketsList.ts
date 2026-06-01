"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TicketRow, TicketStats } from "@/lib/tickets/types";

export interface TicketsListState {
  status: string;
  sort: string;
  order: string;
  page: number;
  type: string;
  ownerId: string;
  number: string;
  q: string;
  privated: string;
}

export function useTicketsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state: TicketsListState = {
    status: searchParams.get("status") || "open",
    sort: searchParams.get("sort") || "opened_at",
    order: searchParams.get("order") || "desc",
    page: Number(searchParams.get("page") || 1),
    type: searchParams.get("type") || "",
    ownerId: searchParams.get("ownerId") || "",
    number: searchParams.get("number") || "",
    q: searchParams.get("q") || "",
    privated: searchParams.get("privated") || "",
  };

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  const setParams = useCallback(
    (updates: Partial<TicketsListState>) => {
      const next = { ...state, ...updates };
      const params = new URLSearchParams();
      if (next.status !== "open") params.set("status", next.status);
      if (next.sort !== "opened_at") params.set("sort", next.sort);
      if (next.order !== "desc") params.set("order", next.order);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.type) params.set("type", next.type);
      if (next.ownerId) params.set("ownerId", next.ownerId);
      if (next.number) params.set("number", next.number);
      if (next.q) params.set("q", next.q);
      if (next.privated) params.set("privated", next.privated);
      const qs = params.toString();
      router.push(`/dashboard/tickets${qs ? `?${qs}` : ""}`);
    },
    [router, state]
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(state.page),
        limit: "25",
        sort: state.sort,
        order: state.order,
        status: state.status,
      });
      if (state.type) params.set("type", state.type);
      if (state.ownerId) params.set("ownerId", state.ownerId);
      if (state.number) params.set("number", state.number);
      if (state.q) params.set("q", state.q);
      if (state.privated) params.set("privated", state.privated);

      const res = await fetch(`/api/tickets?${params}`);
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
        setTotal(data.total || 0);
        setStats(data.stats);
        setTypes(data.types || []);
        setConfigured(data.configured !== false);
      }
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return {
    state,
    setParams,
    tickets,
    total,
    stats,
    types,
    loading,
    configured,
    refresh: fetchList,
    pageCount: Math.max(1, Math.ceil(total / 25)),
  };
}
