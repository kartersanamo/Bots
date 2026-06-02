"use client";

import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface AuthRejectedLiveEvent {
  id: number;
  createdAt: number;
  kind: "auth_rejected";
  userId: string;
  username: string;
  globalName: string | null;
}

const POLL_MS = 5000;
const DISMISS_STORAGE_KEY = "bots_auth_rejected_dismissed";

function playAlarm() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const tones = [440, 554, 440, 659];
    let t = ctx.currentTime;
    for (const freq of tones) {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.2);
      t += 0.22;
    }
    window.setTimeout(() => {
      void ctx.close();
    }, 1200);
  } catch {
    // Ignore audio failures (autoplay/browser policy)
  }
}

function loadDismissedIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<number>) {
  try {
    const trimmed = [...ids].slice(-100);
    sessionStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage failures
  }
}

export function AuthRejectedNotifications() {
  const [banner, setBanner] = useState<AuthRejectedLiveEvent | null>(null);
  const [enabled, setEnabled] = useState(true);
  const sinceRef = useRef(0);
  const startedRef = useRef(false);
  const dismissedRef = useRef<Set<number>>(loadDismissedIds());

  useEffect(() => {
    let stopped = false;

    async function poll() {
      if (stopped || !enabled) return;
      try {
        const res = await fetch(
          `/api/auth/live-events?since=${sinceRef.current}`,
          { cache: "no-store" }
        );
        if (res.status === 401 || res.status === 403) {
          setEnabled(false);
          return;
        }
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const events = Array.isArray(payload.events)
          ? (payload.events as AuthRejectedLiveEvent[])
          : [];
        const lastEventId = Number(payload.lastEventId || sinceRef.current);
        if (Number.isFinite(lastEventId) && lastEventId >= sinceRef.current) {
          sinceRef.current = lastEventId;
        }

        if (!startedRef.current) {
          startedRef.current = true;
          return;
        }

        const unread = events.filter((e) => !dismissedRef.current.has(e.id));
        if (!unread.length) return;

        const newest = unread[unread.length - 1];
        setBanner(newest);
        playAlarm();
      } catch {
        // Ignore transient polling failures
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
    };
  }, [enabled]);

  const displayName = useMemo(() => {
    if (!banner) return "";
    return banner.globalName || banner.username;
  }, [banner]);

  function dismiss() {
    if (banner) {
      dismissedRef.current.add(banner.id);
      saveDismissedIds(dismissedRef.current);
    }
    setBanner(null);
  }

  if (!banner || !enabled) return null;

  return (
    <div
      role="alert"
      className="fixed left-1/2 top-3 z-[130] w-[min(960px,calc(100vw-1rem))] -translate-x-1/2 rounded-xl border-2 border-red-500/70 bg-red-950/95 px-5 py-4 shadow-2xl shadow-red-900/40 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
            <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold tracking-tight text-red-100">
              Unauthorized login attempt
            </p>
            <p className="mt-1 text-sm text-red-200/90">
              Someone without Staff Team or{" "}
              <span className="font-mono text-red-100">*</span> access tried to
              sign in to the dashboard.
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-200">
              <span className="font-medium text-white">{displayName}</span>
              <DiscordUserChip
                userId={banner.userId}
                compact
                className="inline-flex max-w-[16rem] shrink-0 rounded px-1 py-0.5 hover:bg-red-900/50"
              />
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/dashboard/audit"
            className="rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-400"
          >
            Audit log
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md border border-red-700/80 px-3 py-2 text-sm text-red-100 hover:bg-red-900/60"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
