import { requireSession } from "@/lib/auth/session";
import { getOverviewStats } from "@/lib/db/queries";
import { isDbConfigured } from "@/lib/db/pool";
import { NextResponse } from "next/server";

const EMPTY_STATS = {
  totalTickets: 0,
  openTickets: 0,
  closedTickets: 0,
  totalPolls: 0,
  totalLevelingUsers: 0,
  totalBlacklists: 0,
  ticketsToday: 0,
};

export async function GET() {
  try {
    await requireSession();
    const configured = isDbConfigured();
    const stats = configured ? await getOverviewStats() : null;

    return NextResponse.json({
      stats: stats ?? EMPTY_STATS,
      configured,
      connected: stats !== null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
