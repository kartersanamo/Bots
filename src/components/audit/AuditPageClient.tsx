"use client";

import { DashboardAuditLog } from "@/components/audit/DashboardAuditLog";
import { DiscordAuditLog } from "@/components/audit/DiscordAuditLog";
import { cn } from "@/lib/utils";
import { useState } from "react";

type AuditTab = "dashboard" | "discord";

const TABS: { id: AuditTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "discord", label: "Discord server" },
];

export function AuditPageClient() {
  const [tab, setTab] = useState<AuditTab>("dashboard");

  return (
    <div className="space-y-4">
      <nav className="flex gap-4 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 pb-2 text-sm transition-colors",
              tab === t.id
                ? "border-accent text-white"
                : "border-transparent text-muted hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" ? <DashboardAuditLog /> : <DiscordAuditLog />}
    </div>
  );
}
