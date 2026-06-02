import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isTicketOpen(active: string | number): boolean {
  return active === "True" || active === 1 || active === "1";
}

/** Leveling / games `active` and similar 0/1 flags */
export function isTruthyFlag(value: string | number | boolean | null | undefined): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const s = String(value).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export function formatBoolFlag(value: string | number | boolean | null | undefined): string {
  return isTruthyFlag(value) ? "True" : "False";
}

/** Unix epoch seconds (or ms if value > 1e12) */
export function formatUnixTimestamp(
  value: string | number | null | undefined
): string {
  if (value == null || value === "") return "—";
  let n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  if (n > 1e12) n = Math.floor(n / 1000);
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Percent from a ratio with extra precision when the value is small (e.g. 22/5667). */
export function formatPercentRatio(
  numerator: number,
  denominator: number
): string {
  if (!Number.isFinite(denominator) || denominator <= 0) return "—";
  if (!Number.isFinite(numerator) || numerator < 0) return "—";
  const pct = (numerator / denominator) * 100;
  if (pct === 0) return numerator > 0 ? "<0.0001%" : "0%";
  if (pct < 0.01) return `${pct.toFixed(4)}%`;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct * 10) / 10}%`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

export function discordAvatarUrl(
  userId: string | number,
  avatarHash: string | null,
  size = 128
): string {
  const id = String(userId);
  if (avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.${ext}?size=${size}`;
  }

  const numeric = Number.parseInt(id.slice(-4), 10);
  const defaultIndex = Number.isNaN(numeric) ? 0 : numeric % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

export function discordGuildIconUrl(
  guildId: string,
  iconHash: string | null,
  size = 128
): string | null {
  if (!iconHash) return null;
  const ext = iconHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}
