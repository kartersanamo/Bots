import { NextResponse } from "next/server";

/** JSON API response with CDN/browser caching (stale-while-revalidate). */
export function jsonCached(
  body: unknown,
  maxAgeSeconds: number,
  opts?: { staleWhileRevalidate?: number; private?: boolean }
) {
  const swr = opts?.staleWhileRevalidate ?? maxAgeSeconds;
  const visibility = opts?.private ? "private" : "public";
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": `${visibility}, max-age=${maxAgeSeconds}, stale-while-revalidate=${swr}`,
    },
  });
}
