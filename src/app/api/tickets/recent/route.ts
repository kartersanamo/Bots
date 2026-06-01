import { requireSession } from "@/lib/auth/session";
import { getRecentTickets } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const limit = Number(request.nextUrl.searchParams.get("limit") || 10);
    const tickets = await getRecentTickets(Math.min(limit, 50));

    return NextResponse.json({ tickets, configured: tickets.length > 0 || process.env.DB_HOST !== undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
