"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TicketRow } from "@/lib/tickets/types";

export interface TicketlogsSearchState {
  sort: string;
  order: string;
  page: number;
  limit: number;
  type: string;
  ownerId: string;
  number: string;
  q: string;
  privated: string;
  closedFrom: string;
  closedTo: string;
  closedBy: string;
  hasTranscript: string;
}

function readState(searchParams: URLSearchParams): TicketlogsSearchState {
  return {
    sort: searchParams.get("tl_sort") || "closed_at",
    order: searchParams.get("tl_order") || "desc",
    page: Number(searchParams.get("tl_page") || 1),
    limit: Number(searchParams.get("tl_limit") || 50),
    type: searchParams.get("tl_type") || "",
    ownerId: searchParams.get("tl_ownerId") || "",
    number: searchParams.get("tl_number") || "",
    q: searchParams.get("tl_q") || "",
    privated: searchParams.get("tl_privated") || "",
    closedFrom: searchParams.get("tl_closedFrom") || "",
    closedTo: searchParams.get("tl_closedTo") || "",
    closedBy: searchParams.get("tl_closedBy") || "",
    hasTranscript: searchParams.get("tl_hasTranscript") || "",
  };
}

function stateKey(s: TicketlogsSearchState): string {
  return [
    s.sort,
    s.order,
    s.page,
    s.limit,
    s.type,
    s.ownerId,
    s.number,
    s.q,
    s.privated,
    s.closedFrom,
    s.closedTo,
    s.closedBy,
    s.hasTranscript,
  ].join("|");
}

const TL_KEYS: Record<keyof TicketlogsSearchState, string> = {
  sort: "tl_sort",
  order: "tl_order",
  page: "tl_page",
  limit: "tl_limit",
  type: "tl_type",
  ownerId: "tl_ownerId",
  number: "tl_number",
  q: "tl_q",
  privated: "tl_privated",
  closedFrom: "tl_closedFrom",
  closedTo: "tl_closedTo",
  closedBy: "tl_closedBy",
  hasTranscript: "tl_hasTranscript",
};

const DEFAULTS: TicketlogsSearchState = {
  sort: "closed_at",
  order: "desc",
  page: 1,
  limit: 50,
  type: "",
  ownerId: "",
  number: "",
  q: "",
  privated: "",
  closedFrom: "",
  closedTo: "",
  closedBy: "",
  hasTranscript: "",
};

export function useTicketlogsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const state = useMemo(
    () => readState(new URLSearchParams(searchKey)),
    [searchKey]
  );
  const filterKey = stateKey(state);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParams = useCallback(
    (updates: Partial<TicketlogsSearchState>, opts?: { debounce?: boolean }) => {
      const apply = () => {
        const current = readState(searchParams);
        const next = { ...current, ...updates };
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "ticketlogs");

        (Object.keys(TL_KEYS) as (keyof TicketlogsSearchState)[]).forEach(
          (key) => {
            const paramKey = TL_KEYS[key];
            const val = next[key];
            const def = DEFAULTS[key];
            if (val !== def && val !== "" && val !== 0) {
              params.set(paramKey, String(val));
            } else {
              params.delete(paramKey);
            }
          }
        );

        router.replace(`/dashboard/analytics?${params.toString()}`);
      };

      if (opts?.debounce) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(apply, 300);
        return;
      }
      apply();
    },
    [router, searchParams]
  );

  const fetchList = useCallback(
    async (options?: { silent?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!options?.silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(state.page),
          limit: String(Math.min(100, state.limit)),
          sort: state.sort,
          order: state.order,
          status: "closed",
        });
        if (state.type) params.set("type", state.type);
        if (state.ownerId) params.set("ownerId", state.ownerId);
        if (state.number) params.set("number", state.number);
        if (state.q) params.set("q", state.q);
        if (state.privated) params.set("privated", state.privated);
        if (state.closedFrom) params.set("closedFrom", state.closedFrom);
        if (state.closedTo) params.set("closedTo", state.closedTo);
        if (state.closedBy) params.set("closedBy", state.closedBy);
        if (state.hasTranscript === "1") params.set("hasTranscript", "1");
        if (state.hasTranscript === "0") params.set("hasTranscript", "0");

        const res = await fetch(`/api/tickets?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (res.ok) {
          setTickets(data.tickets || []);
          setTotal(data.total || 0);
          setTypes(data.types || []);
          setConfigured(data.configured !== false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("[ticketlogs] fetch failed:", err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey]
  );

  useEffect(() => {
    fetchList();
    return () => abortRef.current?.abort();
  }, [fetchList]);

  const refresh = useCallback(() => fetchList({ silent: true }), [fetchList]);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams({
      page: String(state.page),
      limit: String(state.limit),
      sort: state.sort,
      order: state.order,
      status: "closed",
    });
    if (state.type) params.set("type", state.type);
    if (state.ownerId) params.set("ownerId", state.ownerId);
    if (state.number) params.set("number", state.number);
    if (state.q) params.set("q", state.q);
    if (state.privated) params.set("privated", state.privated);
    if (state.closedFrom) params.set("closedFrom", state.closedFrom);
    if (state.closedTo) params.set("closedTo", state.closedTo);
    if (state.closedBy) params.set("closedBy", state.closedBy);
    if (state.hasTranscript === "1") params.set("hasTranscript", "1");
    if (state.hasTranscript === "0") params.set("hasTranscript", "0");
    return params.toString();
  }, [state]);

  return {
    state,
    setParams,
    tickets,
    total,
    types,
    loading,
    configured,
    refresh,
    buildQueryString,
    pageCount: Math.max(1, Math.ceil(total / state.limit)),
  };
}
