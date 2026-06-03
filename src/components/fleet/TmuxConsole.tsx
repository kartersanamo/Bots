"use client";

import { Button } from "@/components/ui/Button";
import { responseErrorMessage } from "@/lib/api/error-message";
import { hasAnsi, renderAnsiText, stripAnsi } from "@/lib/console/ansi";
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
  Hash,
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
  plainText: string;
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

function ConsoleToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        checked
          ? "border-accent/35 bg-accent/10 text-accent-light"
          : "border-border bg-background text-muted hover:border-border hover:text-white"
      )}
    >
      {label}
    </button>
  );
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
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);

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
        .filter(({ text }) => pattern.test(stripAnsi(text)));
    } catch {
      return rawLines
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => stripAnsi(text).toLowerCase().includes(needle));
    }
  }, [rawLines, search]);

  const renderLines = useMemo((): RenderLine[] => {
    let prevLevel: ConsoleLineLevel = "default";

    return filteredLines.map(({ text, index }) => {
      const plainText = stripAnsi(text);
      const parsed = parseConsoleLine(plainText, prevLevel);
      prevLevel = parsed.level;

      const seenAt = firstSeenAt[index] ?? null;
      const timestamp =
        parsed.embeddedAt ?? (seenAt != null ? new Date(seenAt) : null);

      return {
        key: `${index}-${plainText.slice(0, 48)}`,
        lineNumber: index + 1,
        text,
        plainText,
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
  }, [renderLines, followTail, scrollToBottom, showLineNumbers, showTimestamp]);

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

  const showGutter = showLineNumbers || showTimestamp;

  function renderLineContent(line: RenderLine, styles: (typeof LEVEL_STYLES)[ConsoleLineLevel]) {
    const query = search.trim();
    if (query && !hasAnsi(line.text)) {
      return (
        <span className={cn("min-w-0 whitespace-pre-wrap break-all", styles.text)}>
          {highlightSearch(line.plainText || " ", query)}
        </span>
      );
    }
    return (
      <span className="min-w-0 whitespace-pre-wrap break-all">
        {renderAnsiText(line.text || " ", styles.text)}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface",
        fullscreen && "mobile-fullscreen-inset max-h-none flex-col shadow-2xl ring-1 ring-border"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Terminal className="h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Live console</p>
            <p className="text-xs text-muted">tmux pane · read-only</p>
          </div>
          <span
            className={cn(
              "ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              isLive
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : autoRefresh
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-border text-muted"
            )}
          >
            <Radio
              className={cn("h-2.5 w-2.5", isLive && "animate-pulse")}
            />
            {isLive ? "Live" : autoRefresh ? "Syncing" : "Paused"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ConsoleToggle
            label="Line #"
            checked={showLineNumbers}
            onChange={setShowLineNumbers}
          />
          <ConsoleToggle
            label="Timestamp"
            checked={showTimestamp}
            onChange={setShowTimestamp}
          />

            <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px] sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Filter… ( / )"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-8 text-sm text-white placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white"
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
            className="h-8 px-2"
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
              "h-8 gap-1 px-2 text-xs",
              autoRefresh ? "text-emerald-300" : "text-muted"
            )}
          >
            {autoRefresh ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFollowTail((v) => !v);
              if (!followTail) scrollToBottom("smooth");
            }}
            className={cn(
              "h-8 gap-1 px-2 text-xs",
              followTail ? "text-accent-light" : "text-muted"
            )}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFullscreen((f) => !f)}
            className="h-8 px-2"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <p className="w-full text-xs text-muted">
          {renderLines.length.toLocaleString()}
          {search ? ` / ${rawLines.length.toLocaleString()}` : ""} line
          {renderLines.length !== 1 ? "s" : ""}
          {lastUpdatedAt && (
            <>
              {" · "}synced{" "}
              {formatConsoleTimestamp(lastUpdatedAt)}
            </>
          )}
          {tmuxAvailable === false && (
            <span className="text-amber-400"> · tmux unavailable</span>
          )}
        </p>
      </div>

      {fetchError && (
        <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {fetchError}
        </p>
      )}

      <div
        className={cn(
          "relative min-h-0 bg-[#0c0c0c]",
          fullscreen ? "flex-1" : "h-[min(68vh,720px)]"
        )}
      >
        <div
          className="h-full overflow-auto font-mono text-[12px] leading-[1.55] sm:text-[13px]"
          ref={scrollRef}
          onScroll={onScroll}
        >
          {showGutter && renderLines.length > 0 && (
            <div
              className={cn(
                "sticky top-0 z-10 flex gap-3 border-b border-border/60 bg-[#0c0c0c]/95 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#666666] backdrop-blur-sm",
                showLineNumbers && showTimestamp && "grid grid-cols-[2.5rem_6.5rem_1fr]",
                showLineNumbers && !showTimestamp && "grid grid-cols-[2.5rem_1fr]",
                !showLineNumbers && showTimestamp && "grid grid-cols-[6.5rem_1fr]"
              )}
            >
              {showLineNumbers && (
                <span className="flex items-center justify-end gap-0.5">
                  <Hash className="h-2.5 w-2.5" />
                </span>
              )}
              {showTimestamp && <span>Time</span>}
              <span>Output</span>
            </div>
          )}

          {renderLines.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
              <Terminal className="mb-3 h-8 w-8 text-[#666666]" />
              <p className="max-w-md text-sm text-[#23d18b]/70">{emptyMessage}</p>
            </div>
          ) : (
            <div>
              {renderLines.map((line) => {
                const styles = LEVEL_STYLES[line.level];
                return (
                  <div
                    key={line.key}
                    className={cn(
                      "flex gap-3 px-3 py-px hover:bg-white/[0.03]",
                      showLineNumbers &&
                        showTimestamp &&
                        "grid grid-cols-[2.5rem_6.5rem_1fr]",
                      showLineNumbers &&
                        !showTimestamp &&
                        "grid grid-cols-[2.5rem_1fr]",
                      !showLineNumbers &&
                        showTimestamp &&
                        "grid grid-cols-[6.5rem_1fr]",
                      !showGutter && "block",
                      styles.row,
                      line.isContinuation && "opacity-90"
                    )}
                  >
                    {showLineNumbers && (
                      <span
                        className={cn(
                          "select-none text-right tabular-nums text-[#666666]",
                          styles.gutter
                        )}
                      >
                        {line.lineNumber}
                      </span>
                    )}
                    {showTimestamp && (
                      <span
                        className={cn(
                          "select-none shrink-0 tabular-nums text-[#666666]",
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
                    )}
                    {renderLineContent(line, styles)}
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
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-accent-light shadow-md transition hover:bg-surface-hover"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Latest
          </button>
        )}
      </div>
    </div>
  );
}
