"use client";

import { Button } from "@/components/ui/Button";
import type { TicketRow } from "@/lib/tickets/types";
import { isTicketOpen } from "@/lib/tickets/types";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import {
  X,
  ExternalLink,
  Copy,
  MessageSquare,
  FileText,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { can } from "@/lib/permissions";
import type { PermissionTier } from "@/lib/permissions";

interface TicketDetailDrawerProps {
  channelId: string | null;
  onClose: () => void;
  userTier: PermissionTier;
  onClosed?: () => void;
  /** Render inside a column (no overlay) for split layouts */
  embedded?: boolean;
}

interface DetailData {
  ticket: TicketRow;
  enrichment: TicketEnrichment | null;
  owner: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  } | null;
  discordUrl: string;
}

function openedAtDate(openedAt: string): Date {
  const n = Number(openedAt);
  if (!Number.isNaN(n) && n > 0) return new Date(n * 1000);
  return new Date(openedAt);
}

export function TicketDetailDrawer({
  channelId,
  onClose,
  userTier,
  onClosed,
  embedded = false,
}: TicketDetailDrawerProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) {
      setData(null);
      setShowCloseForm(false);
      setCloseReason("");
      setCloseError(null);
      return;
    }
    setLoading(true);
    fetch(`/api/tickets/${channelId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ticket) setData(d as DetailData);
        else setData(null);
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function submitCloseTicket() {
    if (!channelId) return;
    const reason = closeReason.trim();
    if (reason.length < 2) {
      setCloseError("Please enter a reason (at least 2 characters).");
      return;
    }
    setCloseError(null);
    setClosing(true);
    try {
      const res = await fetch(`/api/tickets/${channelId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCloseError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to close ticket"
        );
        return;
      }
      setShowCloseForm(false);
      onClosed?.();
      onClose();
    } finally {
      setClosing(false);
    }
  }

  const canWrite = can(userTier, "tickets.write");

  const body = (
    <>
            <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
              <h2 className="text-lg font-semibold text-white">
                Ticket #{data?.ticket.number ?? "…"}
              </h2>
              {!embedded && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-surface-hover"
                    />
                  ))}
                </div>
              )}

              {data && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={data.discordUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="primary">
                        <ExternalLink className="h-4 w-4" />
                        Open in Discord
                      </Button>
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText(data.ticket.channelID)}
                    >
                      <Copy className="h-4 w-4" />
                      Channel ID
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText(data.ticket.ownerID)}
                    >
                      <Copy className="h-4 w-4" />
                      Owner ID
                    </Button>
                    {canWrite && isTicketOpen(data.ticket.active) && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setCloseError(null);
                          setShowCloseForm(true);
                        }}
                        disabled={closing}
                      >
                        Close ticket
                      </Button>
                    )}
                  </div>

                  {showCloseForm && (
                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <p className="text-sm font-medium text-white">Close ticket</p>
                      <label className="block text-xs text-muted">Reason</label>
                      <textarea
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        placeholder="e.g. Resolved — player unbanned"
                        rows={3}
                        maxLength={500}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white resize-none"
                      />
                      {closeError && (
                        <p className="text-sm text-red-400">{closeError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={submitCloseTicket}
                          disabled={closing}
                        >
                          {closing ? "Closing…" : "Close"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowCloseForm(false);
                            setCloseError(null);
                          }}
                          disabled={closing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {data.owner && (
                    <div className="flex items-center gap-3">
                      <Avatar
                        userId={data.owner.id}
                        avatarHash={data.owner.avatar}
                        size={40}
                        alt={data.owner.username}
                      />
                      <div>
                        <p className="font-medium text-white">
                          {data.owner.global_name || data.owner.username}
                        </p>
                        <p className="text-xs text-muted">@{data.owner.username}</p>
                      </div>
                    </div>
                  )}

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent-light">
                      <ClipboardList className="h-4 w-4" />
                      Intake information
                    </h3>
                    {data.enrichment?.enrichmentError ? (
                      <p className="text-sm text-red-400">
                        {data.enrichment.enrichmentError}
                      </p>
                    ) : data.enrichment?.intake ? (
                      <div className="space-y-3 rounded-xl bg-surface-hover/50 p-4">
                        {data.enrichment.intake.intro && (
                          <p className="text-sm text-muted whitespace-pre-wrap">
                            {data.enrichment.intake.intro}
                          </p>
                        )}
                        {data.enrichment.intake.fields.map((f) => (
                          <div key={f.label}>
                            <p className="text-xs font-medium text-accent-light">
                              {f.label}
                            </p>
                            <p className="mt-1 text-sm text-white whitespace-pre-wrap">
                              {f.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        No intake embed found (user may not have submitted the form yet).
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent-light">
                      <MessageSquare className="h-4 w-4" />
                      Last owner message
                    </h3>
                    {data.enrichment?.lastOwnerMessage ? (
                      <div className="rounded-xl bg-surface-hover/50 p-4">
                        <p className="text-sm text-white whitespace-pre-wrap">
                          {data.enrichment.lastOwnerMessage.content}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {formatRelativeTime(
                            data.enrichment.lastOwnerMessage.timestamp
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-400">
                        No messages from the ticket owner yet.
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent-light">
                      <FileText className="h-4 w-4" />
                      Ticket record
                    </h3>
                    <dl className="grid gap-2 text-sm">
                      {[
                        ["Channel ID", data.ticket.channelID],
                        ["Owner ID", data.ticket.ownerID],
                        ["Type", data.ticket.type],
                        ["Name", data.ticket.name?.trim() || "—"],
                        ["Number", data.ticket.number],
                        [
                          "Status",
                          isTicketOpen(data.ticket.active) ? "Open" : "Closed",
                        ],
                        [
                          "Opened",
                          formatRelativeTime(
                            openedAtDate(data.ticket.opened_at)
                          ),
                        ],
                        ["Privated", data.ticket.privated?.trim() || "Public"],
                        ["Closed by", data.ticket.closed_by?.trim() || "—"],
                        ["Reason", data.ticket.reason?.trim() || "—"],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-4 border-b border-border/40 py-1.5"
                        >
                          <dt className="text-muted">{k}</dt>
                          <dd className="text-right font-mono text-xs text-white break-all">
                            {v}
                          </dd>
                        </div>
                      ))}
                      {data.ticket.transcript?.trim() &&
                        data.ticket.transcript.startsWith("http") && (
                          <div className="pt-2">
                            <a
                              href={data.ticket.transcript.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-light hover:underline"
                            >
                              View transcript
                            </a>
                          </div>
                        )}
                    </dl>
                  </section>
                </>
              )}
            </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
        {!channelId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">
            Select a ticket from the queue to view details and resolve it.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{body}</div>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {channelId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-2xl"
          >
            {body}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
