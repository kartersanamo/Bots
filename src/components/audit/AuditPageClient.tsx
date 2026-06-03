"use client";

import { DashboardAuditLog } from "@/components/audit/DashboardAuditLog";
import { DiscordAuditLog } from "@/components/audit/DiscordAuditLog";
import { ScrollableTabNav } from "@/components/ui/ScrollableTabNav";
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
      <ScrollableTabNav tabs={TABS} activeId={tab} onSelect={setTab} />

      {tab === "dashboard" ? <DashboardAuditLog /> : <DiscordAuditLog />}
    </div>
  );
}
