"use client";

import { ClosedByStaffFilter } from "@/components/analytics/ticketlogs/ClosedByStaffFilter";
import { Button } from "@/components/ui/Button";
import type { TicketlogsSearchState } from "@/hooks/useTicketlogsSearch";
import { cn } from "@/lib/utils";
import { ChevronDown, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

interface TicketlogsFiltersProps {
  state: TicketlogsSearchState;
  types: string[];
  closedByStaff: string[];
  onChange: (
    updates: Partial<TicketlogsSearchState>,
    opts?: { debounce?: boolean }
  ) => void;
  onRefresh: () => void;
  loading: boolean;
  canViewPrivate: boolean;
}

export function TicketlogsFilters({
  state,
  types,
  closedByStaff,
  onChange,
  onRefresh,
  loading,
  canViewPrivate,
}: TicketlogsFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          placeholder="Search channel, owner, #, type, name, reason, staff ID…"
          defaultValue={state.q}
          onChange={(e) =>
            onChange({ q: e.target.value, page: 1 }, { debounce: true })
          }
          className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-base text-white placeholder:text-muted"
        />
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted hover:text-white"
      >
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")}
        />
        Advanced filters
      </button>

      {advancedOpen && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="block text-xs text-muted">
            Closed from
            <input
              type="date"
              value={state.closedFrom}
              onChange={(e) =>
                onChange({ closedFrom: e.target.value, page: 1 })
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-muted">
            Closed to
            <input
              type="date"
              value={state.closedTo}
              onChange={(e) =>
                onChange({ closedTo: e.target.value, page: 1 })
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-muted">
            Type
            <select
              value={state.type}
              onChange={(e) => onChange({ type: e.target.value, page: 1 })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Any</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            Owner ID
            <input
              value={state.ownerId}
              onChange={(e) =>
                onChange({ ownerId: e.target.value, page: 1 }, { debounce: true })
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white font-mono"
            />
          </label>
          <label className="block text-xs text-muted">
            Ticket #
            <input
              value={state.number}
              onChange={(e) =>
                onChange({ number: e.target.value, page: 1 }, { debounce: true })
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
          </label>
          <ClosedByStaffFilter
            value={state.closedBy}
            staffIds={closedByStaff}
            onChange={(closedBy) => onChange({ closedBy, page: 1 })}
          />
          <label className="block text-xs text-muted">
            Transcript
            <select
              value={state.hasTranscript}
              onChange={(e) =>
                onChange({ hasTranscript: e.target.value, page: 1 })
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">Any</option>
              <option value="1">Has transcript link</option>
              <option value="0">No transcript</option>
            </select>
          </label>
          {canViewPrivate && (
            <label className="block text-xs text-muted">
              Visibility
              <select
                value={state.privated}
                onChange={(e) =>
                  onChange({ privated: e.target.value, page: 1 })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
              >
                <option value="">All</option>
                <option value="public">Public only</option>
              </select>
            </label>
          )}
          <label className="block text-xs text-muted">
            Sort
            <select
              value={`${state.sort}-${state.order}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split("-");
                onChange({ sort, order, page: 1 });
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            >
              <option value="closed_at-desc">Closed (newest)</option>
              <option value="closed_at-asc">Closed (oldest)</option>
              <option value="opened_at-desc">Opened (newest)</option>
              <option value="opened_at-asc">Opened (oldest)</option>
            </select>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange({
              q: "",
              type: "",
              ownerId: "",
              number: "",
              closedFrom: "",
              closedTo: "",
              closedBy: "",
              hasTranscript: "",
              privated: "",
              page: 1,
            })
          }
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
