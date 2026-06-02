import { requireSession } from "@/lib/auth/session";
import { getGuildInfoPayload } from "@/lib/data/guild-info";
import { jsonCached } from "@/lib/http/json-cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const payload = await getGuildInfoPayload({
      allRoles: url.searchParams.get("roles") === "all",
      allChannels: url.searchParams.get("channels") === "all",
    });
    return jsonCached(payload, 120, {
      staleWhileRevalidate: 300,
      private: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
