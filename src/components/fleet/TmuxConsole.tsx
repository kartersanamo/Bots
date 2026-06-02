"use client";

import { Button } from "@/components/ui/Button";
import { responseErrorMessage } from "@/lib/api/error-message";
import {
  formatConsoleTimestamp,
  LEVEL_STYLES,
  parseConsoleLine,
  syncLineFirstSeen,
  type ConsoleLineLevel,
} from "@/lib/console/parse-console-line";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Terminal,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface TmuxConsoleProps {
  botId: string;
}

interface RenderLine {
  key: string;
  lineNumber: number;
  text: string;
  displayText: string;
  level: ConsoleLineLevel;
  isContinuation: boolean;
  timestamp: Date | null;
  firstSeenAt: number | null;
  hasEmbeddedTimestamp: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSearch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;

  try {
    const pattern = new RegExp(`(${escapeRegExp(query)})`, "gi");
    const parts = text.split(pattern);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <mark
          key={i}
          className="rounded-sm bg-accent/35 px-0.5 text-white"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

/** Live mirror of the bot's tmux pane — never reads log files. */
export function TmuxConsole({ botId }: TmuxConsoleProps) {
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [firstSeenAt, setFirstSeenAt] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [followTail, setFollowTail] = useState(true);
  const [search, setSearch] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tmuxAvailable, setTmuxAvailable] = useState<boolean | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const prevLinesRef = useRef<string[]>([]);
  const prevFirstSeenRef = useRef<number[]>([]);
  const userScrolledRef = useRef(false);

  const fetchConsole = useCallback(async () => {
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        lines: "2000",
        source: "console",
      });
      const res = await fetch(`/api/bots/${botId}/logs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(responseErrorMessage(data, "Failed to load console"));
        setRawLines([]);
        setFirstSeenAt([]);
        return;
      }

      const nextLines: string[] = data.lines || [];
      const synced = syncLineFirstSeen(
        prevLinesRef.current,
        nextLines,
        prevFirstSeenRef.current
      );

      prevLinesRef.current = nextLines;
      prevFirstSeenRef.current = synced;

      setRawLines(nextLines);
      setFirstSeenAt(synced);
      setTmuxAvailable(data.tmuxAvailable !== false);
      setLastUpdatedAt(new Date());
    } catch {
      setFetchError("Could not reach console API");
      setRawLines([]);
      setFirstSeenAt([]);
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    setLoading(true);
    prevLinesRef.current = [];
    prevFirstSeenRef.current = [];
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

  const filteredLines = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return rawLines.map((text, index) => ({ text, index }));
    }

    try {
      const pattern = new RegExp(needle, "i");
      return rawLines
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => pattern.test(text));
    } catch {
      return rawLines
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => text.toLowerCase().includes(needle));
    }
  }, [rawLines, search]);

  const renderLines = useMemo((): RenderLine[] => {
    let prevLevel: ConsoleLineLevel = "default";

    return filteredLines.map(({ text, index }) => {
      const parsed = parseConsoleLine(text, prevLevel);
      prevLevel = parsed.level;

      const seenAt = firstSeenAt[index] ?? null;
      const timestamp =
        parsed.embeddedAt ?? (seenAt != null ? new Date(seenAt) : null);

      return {
        key: `${index}-${text.slice(0, 48)}`,
        lineNumber: index + 1,
        text,
        displayText: parsed.displayText,
        level: parsed.level,
        isContinuation: parsed.isContinuation,
        timestamp,
        firstSeenAt: seenAt,
        hasEmbeddedTimestamp: parsed.embeddedAt != null,
      };
    });
  }, [filteredLines, firstSeenAt]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    userScrolledRef.current = false;
    setShowJumpToBottom(false);
  }, []);

  useEffect(() => {
    if (!followTail || userScrolledRef.current) return;
    scrollToBottom("auto");
  }, [renderLines, followTail, scrollToBottom]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 40;
    userScrolledRef.current = !atBottom;
    setShowJumpToBottom(!atBottom && renderLines.length > 0);
    if (!atBottom && followTail) {
      setFollowTail(false);
    }
  }, [renderLines.length, followTail]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && search) {
        setSearch("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [search]);

  const isLive = autoRefresh && tmuxAvailable !== false && !fetchError;
  const emptyMessage = loading
    ? "Connecting to tmux pane…"
    : tmuxAvailable === false
      ? "Tmux pane not available. Ensure the bots session and this bot's window exist on the host."
      : "No output yet. Use Start to run ./run.sh in the window.";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border/80 bg-[#070709] shadow-[0_0_0_1px_rgba(139,92,246,0.06),0_20px_50px_-20px_rgba(0,0,0,0.8)]",
        isLive && "ring-1 ring-accent/15",
        fullscreen &&
          "fixed inset-3 z-50 flex max-h-none flex-col rounded-2xl shadow-2xl ring-1 ring-accent/25"
      )}
    >
      {/* Terminal chrome */}
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-[#121218] to-[#0d0d12] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Terminal className="h-4 w-4 shrink-0 text-accent-light/80" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  Live Console
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  tmux pane mirror · read-only
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                isLive
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : autoRefresh
                    ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                    : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
              )}
            >
              <Radio
                className={cn(
                  "h-3 w-3",
                  isLive && "animate-pulse text-emerald-400"
                )}
              />
              {isLive ? "Live" : autoRefresh ? "Syncing" : "Paused"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:min-w-[220px] sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Filter output…  ( / )"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-black/40 py-1.5 pl-9 pr-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 hover:text-zinc-300"
                  aria-label="Clear filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => fetchConsole()}
              disabled={loading}
              className="h-8 border-white/[0.08] bg-white/[0.04] px-2.5"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "h-8 gap-1.5 px-2.5 text-xs",
                autoRefresh ? "text-emerald-300" : "text-zinc-400"
              )}
            >
              {autoRefresh ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {autoRefresh ? "Live" : "Resume"}
              </span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFollowTail((v) => !v);
                if (!followTail) scrollToBottom("smooth");
              }}
              className={cn(
                "h-8 gap-1.5 px-2.5 text-xs",
                followTail ? "text-accent-light" : "text-zinc-400"
              )}
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tail</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFullscreen((f) => !f)}
              className="h-8 px-2.5"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span>
            {renderLines.length.toLocaleString()}
            {search ? ` / ${rawLines.length.toLocaleString()}` : ""} line
            {renderLines.length !== 1 ? "s" : ""}
          </span>
          <span className="text-zinc-700">·</span>
          <span>
            {lastUpdatedAt
              ? `Updated ${lastUpdatedAt.toLocaleTimeString(undefined, { hour12: false })}`
              : "Waiting for first sync"}
          </span>
          {tmuxAvailable === false && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-amber-400/80">tmux unavailable</span>
            </>
          )}
        </div>
      </div>

      {fetchError && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {fetchError}
        </div>
      )}

      {/* Console viewport */}
      <div
        className={cn(
          "relative min-h-0 bg-[#050508]",
          fullscreen ? "flex-1" : "h-[min(68vh,720px)]"
        )}
      >
        <div
          className="h-full overflow-auto"
          ref={scrollRef}
          onScroll={onScroll}
        >
          <div className="sticky top-0 z-10 grid grid-cols-[3rem_5.5rem_1fr] gap-x-3 border-b border-white/[0.05] bg-[#08080c]/95 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600 backdrop-blur-sm sm:grid-cols-[3.5rem_6.5rem_1fr]">
            <span className="text-right">#</span>
            <span>Time</span>
            <span>Output</span>
          </div>

          {renderLines.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <Terminal className="h-7 w-7 text-zinc-600" />
              </div>
              <p className="max-w-md text-sm text-zinc-400">{emptyMessage}</p>
              {!loading && tmuxAvailable !== false && (
                <p className="mt-2 text-xs text-zinc-600">
                  Output appears here as the bot writes to its tmux window.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03] font-mono text-[12px] leading-[1.65] sm:text-[13px]">
              {renderLines.map((line) => {
                const styles = LEVEL_STYLES[line.level];
                return (
                  <div
                    key={line.key}
                    className={cn(
                      "group grid grid-cols-[3rem_5.5rem_1fr] gap-x-3 px-3 py-[3px] transition-colors hover:bg-white/[0.02] sm:grid-cols-[3.5rem_6.5rem_1fr]",
                      styles.row,
                      line.isContinuation && "opacity-90"
                    )}
                  >
                    <span
                      className={cn(
                        "select-none text-right tabular-nums text-zinc-600 group-hover:text-zinc-500",
                        styles.gutter
                      )}
                    >
                      {line.lineNumber}
                    </span>
                    <span
                      className={cn(
                        "select-none tabular-nums text-zinc-500",
                        styles.gutter
                      )}
                      title={
                        line.firstSeenAt && !line.hasEmbeddedTimestamp
                          ? "First seen during this session"
                          : undefined
                      }
                    >
                      {formatConsoleTimestamp(line.timestamp)}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 whitespace-pre-wrap break-all",
                        styles.text,
                        line.isContinuation && "pl-2 text-zinc-400"
                      )}
                    >
                      {highlightSearch(
                        line.displayText || " ",
                        search.trim()
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showJumpToBottom && (
          <button
            type="button"
            onClick={() => {
              setFollowTail(true);
              scrollToBottom("smooth");
            }}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-[#12121a]/95 px-3 py-1.5 text-xs font-medium text-accent-light shadow-lg backdrop-blur-sm transition hover:border-accent/50 hover:bg-accent/10"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Jump to latest
          </button>
        )}
      </div>
    </div>
  );
}
