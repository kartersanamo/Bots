import { requireSession } from "@/lib/auth/session";
import { getAllBots } from "@/lib/bots/registry";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    const bots = getAllBots().map((bot) => ({
      ...bot,
      status: "unknown" as const,
    }));

    return NextResponse.json({ bots });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
