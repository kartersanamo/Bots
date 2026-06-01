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

type StateKey = keyof TicketlogsSearchState;

const PARAM_KEYS: Record<StateKey, string> = {
  sort: "sort",
  order: "order",
  page: "page",
  limit: "limit",
  type: "type",
  ownerId: "ownerId",
  number: "number",
  q: "q",
  privated: "privated",
  closedFrom: "closedFrom",
  closedTo: "closedTo",
  closedBy: "closedBy",
  hasTranscript: "hasTranscript",
};

function readState(searchParams: URLSearchParams): TicketlogsSearchState {
  return {
    sort: searchParams.get("sort") || DEFAULTS.sort,
    order: searchParams.get("order") || DEFAULTS.order,
    page: Number(searchParams.get("page") || DEFAULTS.page),
    limit: Number(searchParams.get("limit") || DEFAULTS.limit),
    type: searchParams.get("type") || "",
    ownerId: searchParams.get("ownerId") || "",
    number: searchParams.get("number") || "",
    q: searchParams.get("q") || "",
    privated: searchParams.get("privated") || "",
    closedFrom: searchParams.get("closedFrom") || "",
    closedTo: searchParams.get("closedTo") || "",
    closedBy: searchParams.get("closedBy") || "",
    hasTranscript: searchParams.get("hasTranscript") || "",
  };
}

function stateKey(s: TicketlogsSearchState): string {
  return Object.values(s).join("|");
}

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
        const params = new URLSearchParams();

        (Object.keys(PARAM_KEYS) as StateKey[]).forEach((key) => {
          const paramKey = PARAM_KEYS[key];
          const val = next[key];
          const def = DEFAULTS[key];
          if (val !== def && val !== "" && val !== 0) {
            params.set(paramKey, String(val));
          }
        });

        const qs = params.toString();
        router.replace(`/dashboard/ticketlogs${qs ? `?${qs}` : ""}`);
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
