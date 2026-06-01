export function ticketOpenedMs(openedAt: string): number {
  const n = Number(openedAt);
  if (Number.isFinite(n) && n > 0) return n * 1000;
  const parsed = Date.parse(openedAt);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function ticketAgeHours(openedAt: string): number {
  return (Date.now() - ticketOpenedMs(openedAt)) / 3_600_000;
}

export function ticketAgeBorderClass(hours: number): string {
  if (hours >= 72) return "border-red-500/60 ring-1 ring-red-500/20";
  if (hours >= 24) return "border-amber-500/50 ring-1 ring-amber-500/20";
  return "border-border hover:border-accent/40";
}

export function formatAgeLabel(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m open`;
  if (hours < 48) return `${Math.round(hours)}h open`;
  return `${Math.round(hours / 24)}d open`;
}
