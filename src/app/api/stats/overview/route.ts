import { requireSession } from "@/lib/auth/session";
import { getOverviewStats } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    const stats = await getOverviewStats();

    return NextResponse.json({
      stats: stats ?? {
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
        totalPolls: 0,
        totalLevelingUsers: 0,
        totalBlacklists: 0,
        ticketsToday: 0,
      },
      configured: stats !== null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
