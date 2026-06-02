"use client";

import { useEffect, useState } from "react";

const RELOAD_KEY = "bots:chunk-reload";

/**
 * Recover from transient CDN/HTTP2 chunk failures (ERR_HTTP2_PROTOCOL_ERROR, etc.)
 * by reloading once when a Next static script fails to load.
 */
export function ChunkLoadRecovery() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "");
      if (
        msg.includes("SESSION_SECRET") ||
        msg.includes("server-only") ||
        msg.includes("Missing required environment")
      ) {
        event.preventDefault();
        setShowBanner(true);
      }
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  useEffect(() => {
    const onError = (event: Event) => {
      const el = event.target;
      if (!(el instanceof HTMLScriptElement)) return;
      if (!el.src.includes("/_next/static/")) return;

      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        return;
      }
      setShowBanner(true);
    };

    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 30_000);
    return () => clearTimeout(t);
  }, []);

  if (!showBanner) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-lg border border-amber-500/40 bg-zinc-900 px-4 py-3 text-sm text-amber-100 shadow-lg lg:left-auto"
    >
      <p className="font-medium">Something went wrong loading the dashboard</p>
      <p className="mt-1 text-xs text-zinc-400">
        Try a hard refresh. If this keeps happening after a deploy, ask an admin
        to check server logs and restart the dashboard process.
      </p>
      <button
        type="button"
        className="mt-2 text-accent underline hover:no-underline"
        onClick={() => {
          sessionStorage.removeItem(RELOAD_KEY);
          window.location.reload();
        }}
      >
        Reload
      </button>
    </div>
  );
}
