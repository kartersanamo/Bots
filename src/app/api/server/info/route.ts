import { hasDashboardAccess } from "@/lib/auth/dashboard-access";
import { getSession } from "@/lib/auth/session";
import { getGuildInfoPayload } from "@/lib/data/guild-info";
import type { GuildInfoPayload } from "@/lib/guild-info-types";
import { jsonCached } from "@/lib/http/json-cache";
import { NextResponse } from "next/server";

const EMPTY: GuildInfoPayload = {
  configured: false,
  guild: null,
  roles: [],
  channels: [],
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ...EMPTY, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDashboardAccess(session)) {
    return NextResponse.json({ ...EMPTY, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  try {
    const payload = await getGuildInfoPayload({
      allRoles: url.searchParams.get("roles") === "all",
      allChannels: url.searchParams.get("channels") === "all",
    });
    return jsonCached(payload, 120, {
      staleWhileRevalidate: 300,
      private: true,
    });
  } catch (err) {
    console.error("[api/server/info] failed:", err);
    return NextResponse.json(EMPTY, { status: 200 });
  }
}
