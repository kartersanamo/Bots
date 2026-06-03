"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { responseErrorMessage } from "@/lib/api/error-message";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface BotLogFileViewerProps {
  botId: string;
}

/** Read-only tail of bot log files on disk — never uses tmux. */
export function BotLogFileViewer({ botId }: BotLogFileViewerProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [pauseScroll, setPauseScroll] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ lines: "500", source: "file" });
      if (search) params.set("search", search);
      if (file) params.set("file", file);
      const res = await fetch(`/api/bots/${botId}/logs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(responseErrorMessage(data, "Failed to load logs"));
        setLines([]);
        return;
      }
      setLines(data.lines || []);
      setFiles(data.files || []);
      if (data.file && !file) setFile(data.file);
    } catch {
      setFetchError("Could not reach log API");
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [botId, search, file]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const tick = () => {
      if (document.visibilityState !== "hidden") fetchLogs();
    };
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    if (pauseScroll) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, pauseScroll]);

  return (
    <Card
      className={cn(
        "flex flex-col",
        fullscreen && "mobile-fullscreen-inset max-h-none shadow-2xl ring-1 ring-border"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Filter log lines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-white"
          />
        </div>
        {files.length > 0 && (
          <select
            value={file || ""}
            onChange={(e) => setFile(e.target.value || null)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          >
            {files.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" variant="secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh
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
        {lines.length} line{lines.length !== 1 ? "s" : ""}
        {file ? ` · ${file}` : ""}
        {" · log files only"}
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
              ? "Loading logs…"
              : fetchError
                ? "—"
                : "No log files found for this bot."}
          </span>
        )}
        <div ref={bottomRef} />
      </pre>
    </Card>
  );
}
