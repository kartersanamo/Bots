/** Turn FastAPI / JSON error payloads into a human-readable string. */
export function formatErrorDetail(detail: unknown): string {
  if (detail == null) return "Request failed";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => formatErrorDetail(item)).filter(Boolean);
    return parts.length ? parts.join("; ") : "Request failed";
  }
  if (typeof detail === "object") {
    const rec = detail as Record<string, unknown>;
    if (typeof rec.message === "string") return rec.message;
    if (typeof rec.msg === "string") return rec.msg;
    try {
      return JSON.stringify(detail);
    } catch {
      return "Request failed";
    }
  }
  return String(detail);
}

export function responseErrorMessage(
  data: unknown,
  fallback = "Request failed"
): string {
  if (!data || typeof data !== "object") return fallback;
  const rec = data as Record<string, unknown>;
  if (rec.error != null) return formatErrorDetail(rec.error);
  if (rec.detail != null) return formatErrorDetail(rec.detail);
  if (typeof rec.message === "string") return rec.message;
  return fallback;
}
