"use client";

import { Badge } from "@/components/ui/Badge";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import {
  formatAgeLabel,
  ticketAgeBorderClass,
  ticketAgeHours,
} from "@/lib/tickets/age";
import type { TicketRow } from "@/lib/tickets/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { discordChannelUrl } from "@/lib/discord/guild";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface OpenTicketCardProps {
  ticket: TicketRow;
  enrichment?: TicketEnrichment;
  channelName?: string;
  selected: boolean;
  onSelect: () => void;
}

export function OpenTicketCard({
  ticket,
  enrichment,
  channelName,
  selected,
  onSelect,
}: OpenTicketCardProps) {
  const hours = ticketAgeHours(ticket.opened_at);
  const opened =
    Number(ticket.opened_at) > 0
      ? new Date(Number(ticket.opened_at) * 1000)
      : new Date(ticket.opened_at);

  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border bg-surface p-4 text-left transition-all",
        ticketAgeBorderClass(hours),
        selected && "border-accent ring-2 ring-accent/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-lg font-semibold text-white">
            {channelName || ticket.channelID}
          </span>
          <Badge className="ml-2">{ticket.type}</Badge>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted">
          {formatAgeLabel(hours)}
        </span>
      </div>

      <div className="mt-3">
        <DiscordUserChip userId={ticket.ownerID} />
      </div>

      <p className="mt-2 text-xs text-muted">
        Opened {formatRelativeTime(opened)}
      </p>

      {enrichment?.awaitingUser && !enrichment.enrichmentError && (
        <p className="mt-2 text-xs text-amber-400">Awaiting user reply</p>
      )}
      {enrichment?.lastOwnerMessage?.content && (
        <p className="mt-2 line-clamp-2 text-xs text-white/80">
          {enrichment.lastOwnerMessage.content}
        </p>
      )}

      <a
        href={discordChannelUrl(ticket.channelID)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Discord
      </a>
    </motion.button>
  );
}
