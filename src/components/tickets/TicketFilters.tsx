"use client";

import { Button } from "@/components/ui/Button";
import type { TicketsListState } from "@/hooks/useTicketsList";
import { RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketFiltersProps {
  state: TicketsListState;
  types: string[];
  onChange: (updates: Partial<TicketsListState>) => void;
  onRefresh: () => void;
  loading: boolean;
  autoRefresh: boolean;
  onAutoRefreshChange: (v: boolean) => void;
  canViewPrivate: boolean;
}

export function TicketFilters({
  state,
  types,
  onChange,
  onRefresh,
  loading,
  autoRefresh,
  onAutoRefreshChange,
  canViewPrivate,
}: TicketFiltersProps) {
  return (
    <div className="glass space-y-4 rounded-xl p-4">
      <div className="flex flex-wrap gap-2">
        {(["open", "closed", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ status: s, page: 1 })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              state.status === s
                ? "bg-accent/25 text-accent-light"
                : "text-muted hover:bg-surface-hover hover:text-white"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search channel, owner, #, type..."
            defaultValue={state.q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange({ q: (e.target as HTMLInputElement).value, page: 1 });
              }
            }}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-white"
          />
        </div>
        <select
          value={state.type}
          onChange={(e) => onChange({ type: e.target.value, page: 1 })}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          placeholder="Owner ID"
          defaultValue={state.ownerId}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange({
                ownerId: (e.target as HTMLInputElement).value,
                page: 1,
              });
            }
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        />
        <input
          placeholder="Ticket #"
          defaultValue={state.number}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange({
                number: (e.target as HTMLInputElement).value,
                page: 1,
              });
            }
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        />
        <select
          value={`${state.sort}-${state.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split("-");
            onChange({
              sort,
              order: order as "asc" | "desc",
              page: 1,
            });
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        >
          <option value="opened_at-desc">Newest opened</option>
          <option value="opened_at-asc">Oldest opened</option>
          <option value="number-desc">Ticket # ↓</option>
          <option value="number-asc">Ticket # ↑</option>
          <option value="type-asc">Type A–Z</option>
        </select>
        {canViewPrivate && (
          <select
            value={state.privated}
            onChange={(e) => onChange({ privated: e.target.value, page: 1 })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          >
            <option value="">All visibility</option>
            <option value="public">Public only</option>
            <option value="Admin">Admin</option>
            <option value="Management">Management</option>
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange(e.target.checked)}
          />
          Auto-refresh (30s)
        </label>
      </div>
    </div>
  );
}
