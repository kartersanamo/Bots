export const DASHBOARD_FETCH_HEADER = "X-Requested-With";
export const DASHBOARD_FETCH_VALUE = "BotsDashboard";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Browser fetch wrapper that adds CSRF protection header on mutating requests. */
export function dashboardFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  if (!MUTATING.has(method)) {
    return fetch(input, init);
  }

  const headers = new Headers(init?.headers);
  headers.set(DASHBOARD_FETCH_HEADER, DASHBOARD_FETCH_VALUE);
  return fetch(input, { ...init, headers });
}
