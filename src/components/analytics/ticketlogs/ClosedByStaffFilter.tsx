"use client";

import {
  useGamesDiscordUsers,
  useResolveDiscordUsers,
} from "@/components/games/GamesDiscordUsersProvider";
import { snowflakeString } from "@/lib/games/snowflake";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

interface ClosedByStaffFilterProps {
  value: string;
  staffIds: string[];
  onChange: (closedBy: string) => void;
}

function staffLabel(
  id: string,
  users: Record<string, { displayName: string }>
): string {
  const user = users[id];
  if (user?.displayName) return `${user.displayName} (${id})`;
  return id;
}

export function ClosedByStaffFilter({
  value,
  staffIds,
  onChange,
}: ClosedByStaffFilterProps) {
  const normalizedValue = value.trim() ? snowflakeString(value.trim()) : "";
  const inStaffList =
    normalizedValue && staffIds.includes(normalizedValue);

  const [manualOpen, setManualOpen] = useState(
    () => Boolean(normalizedValue && !inStaffList)
  );

  useResolveDiscordUsers(staffIds);
  useResolveDiscordUsers(normalizedValue ? [normalizedValue] : []);
  const { users } = useGamesDiscordUsers();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedStaff = useMemo(() => {
    return [...staffIds].sort((a, b) => {
      const na = users[a]?.displayName ?? a;
      const nb = users[b]?.displayName ?? b;
      return na.localeCompare(nb, undefined, { sensitivity: "base" });
    });
  }, [staffIds, users]);

  const applyChange = (closedBy: string, debounce = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!debounce) {
      onChange(closedBy);
      return;
    }
    debounceRef.current = setTimeout(() => onChange(closedBy), 300);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  useEffect(() => {
    if (!normalizedValue) {
      setManualOpen(false);
      return;
    }
    if (!staffIds.includes(normalizedValue)) {
      setManualOpen(true);
    }
  }, [normalizedValue, staffIds]);

  const selectValue = manualOpen
    ? "__manual__"
    : normalizedValue || "";

  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted">
        Closed by
        <select
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "__manual__") {
              setManualOpen(true);
              return;
            }
            setManualOpen(false);
            applyChange(next);
          }}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        >
          <option value="">Any staff member</option>
          {sortedStaff.map((id) => (
            <option key={id} value={id}>
              {staffLabel(id, users)}
            </option>
          ))}
          <option value="__manual__">Enter ID manually…</option>
        </select>
      </label>

      {manualOpen && (
        <label className="block text-xs text-muted">
          Staff ID
          <input
            value={value}
            onChange={(e) => applyChange(e.target.value, true)}
            placeholder="Discord user ID"
            className={cn(
              "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2",
              "text-sm text-white font-mono placeholder:text-muted"
            )}
          />
        </label>
      )}

      {sortedStaff.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-[10px] uppercase tracking-wide text-muted">
            From results
          </span>
          {sortedStaff.slice(0, 12).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setManualOpen(false);
                applyChange(id);
              }}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                normalizedValue === id && !manualOpen
                  ? "border-accent bg-accent/15 text-white"
                  : "border-border bg-background text-muted hover:border-border hover:text-white"
              )}
              title={id}
            >
              {users[id]?.displayName ?? id}
            </button>
          ))}
          {sortedStaff.length > 12 && (
            <span className="self-center text-xs text-muted">
              +{sortedStaff.length - 12} more in list
            </span>
          )}
        </div>
      )}
    </div>
  );
}
