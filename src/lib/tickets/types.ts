export interface TicketRow {
  channelID: string;
  ownerID: string;
  type: string;
  name: string;
  number: string;
  active: string;
  opened_at: string;
  closed_at: string;
  closed_by: string;
  reason: string;
  transcript: string;
  privated: string;
}

export type TicketStatusFilter = "open" | "closed" | "all";
export type TicketSortField =
  | "opened_at"
  | "closed_at"
  | "number"
  | "type"
  | "ownerID";

export interface TicketStats {
  openCount: number;
  closedCount: number;
  openedToday: number;
  byType: { type: string; count: number }[];
}

export function isTicketOpen(active: string): boolean {
  return active === "True" || active === "1";
}
