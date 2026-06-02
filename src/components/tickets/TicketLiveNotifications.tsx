"use client";

import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useEffect, useMemo, useRef, useState } from "react";

interface TicketLiveEvent {
  id: number;
  createdAt: number;
  kind: "ticket_created";
  channelId: string;
  ticketNumber: string;
  ticketType: string;
  ownerId: string;
  channelName?: string;
}

const POLL_MS = 6000;

function playDing() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
    window.setTimeout(() => {
      void ctx.close();
    }, 400);
  } catch {
    // Ignore audio failures (autoplay/browser policy)
  }
}

export function TicketLiveNotifications() {
  const [banner, setBanner] = useState<TicketLiveEvent | null>(null);
  const [enabled, setEnabled] = useState(true);
  const sinceRef = useRef(0);
  const startedRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      if (stopped || !enabled) return;
      try {
        const res = await fetch(
          `/api/tickets/live-events?since=${sinceRef.current}`,
          {
            cache: "no-store",
          }
        );
        if (res.status === 401 || res.status === 403) {
          // Not a tickets viewer; stop polling noise.
          setEnabled(false);
          return;
        }
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const events = Array.isArray(payload.events)
          ? (payload.events as TicketLiveEvent[])
          : [];
        const lastEventId = Number(payload.lastEventId || sinceRef.current);
        if (Number.isFinite(lastEventId) && lastEventId >= sinceRef.current) {
          sinceRef.current = lastEventId;
        }

        // First successful poll sets baseline, no ding/banner.
        if (!startedRef.current) {
          startedRef.current = true;
          return;
        }
        if (!events.length) return;

        const newest = events[events.length - 1];
        setBanner(newest);
        playDing();
        if (hideTimerRef.current) {
          window.clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = window.setTimeout(() => setBanner(null), 12000);
      } catch {
        // Ignore transient polling failures.
      }
    }

    const immediate = window.setTimeout(() => {
      void poll();
    }, 250);
    const interval = window.setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      stopped = true;
      window.clearTimeout(immediate);
      window.clearInterval(interval);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [enabled]);

  const title = useMemo(() => {
    if (!banner) return "";
    return banner.channelName || `Ticket #${banner.ticketNumber}`;
  }, [banner]);

  if (!banner || !enabled) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-3 z-[120] w-[min(860px,calc(100vw-1rem))] -translate-x-1/2 rounded-lg border border-accent/50 bg-zinc-950/95 px-4 py-3 shadow-xl backdrop-blur"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">New ticket — info submitted</p>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-300">
            <span className="truncate">{title}</span>
            <span className="shrink-0">•</span>
            <span className="truncate">{banner.ticketType}</span>
            <span className="shrink-0">• owner</span>
            <DiscordUserChip
              userId={banner.ownerId}
              compact
              className="inline-flex max-w-[14rem] shrink-0 rounded px-1 py-0.5 hover:bg-zinc-800/80"
            />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/dashboard/tickets?openChannelId=${encodeURIComponent(
              banner.channelId
            )}`}
            className="rounded bg-accent px-2.5 py-1.5 text-xs font-medium text-black hover:opacity-90"
          >
            Open
          </a>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
