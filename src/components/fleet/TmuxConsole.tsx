"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { responseErrorMessage } from "@/lib/api/error-message";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface TmuxConsoleProps {
  botId: string;
}

/** Live mirror of the bot's tmux pane — never reads log files. */
export function TmuxConsole({ botId }: TmuxConsoleProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [pauseScroll, setPauseScroll] = useState(false);
  const [search, setSearch] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tmuxAvailable, setTmuxAvailable] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConsole = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        lines: "2000",
        source: "console",
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/bots/${botId}/logs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(responseErrorMessage(data, "Failed to load console"));
        setLines([]);
        return;
      }
      setLines(data.lines || []);
      setTmuxAvailable(data.tmuxAvailable !== false);
    } catch {
      setFetchError("Could not reach console API");
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [botId, search]);

  useEffect(() => {
    fetchConsole();
  }, [fetchConsole]);

  useEffect(() => {
    if (!autoRefresh) return;
    const tick = () => {
      if (document.visibilityState !== "hidden") fetchConsole();
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchConsole]);

  useEffect(() => {
    if (pauseScroll) return;
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [lines, pauseScroll]);

  return (
    <Card
      className={cn(
        "flex flex-col",
        fullscreen &&
          "fixed inset-4 z-50 max-h-none shadow-2xl ring-1 ring-border"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Filter pane output..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchConsole()}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-white"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={fetchConsole}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Live (1s)
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={pauseScroll}
            onChange={(e) => setPauseScroll(e.target.checked)}
          />
          Pause scroll
        </label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setFullscreen((f) => !f)}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted">
        {lines.length} line{lines.length !== 1 ? "s" : ""} · live tmux pane
        {tmuxAvailable === false ? " · tmux unavailable" : ""}
      </p>

      {fetchError && (
        <p className="mt-2 text-sm text-red-400">{fetchError}</p>
      )}

      <pre
        className={cn(
          "mt-2 overflow-auto rounded-lg bg-background p-4 font-mono text-xs leading-relaxed text-green-300/90",
          fullscreen ? "max-h-[calc(100vh-12rem)] flex-1" : "max-h-[60vh]"
        )}
      >
        {lines.length ? (
          lines.join("\n")
        ) : (
          <span className="text-muted">
            {loading
              ? "Loading console…"
              : tmuxAvailable === false
                ? "Tmux pane not available. Ensure the bots session and this bot's window exist on the host."
                : "No output in tmux pane yet. Use Start to run ./run.sh in the window."}
          </span>
        )}
        <div ref={bottomRef} />
      </pre>
    </Card>
  );
}
