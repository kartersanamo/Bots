export type ConsoleLineLevel =
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "success"
  | "muted"
  | "default";

export interface ParsedConsoleLine {
  text: string;
  /** Timestamp extracted from the line text, if any. */
  embeddedAt: Date | null;
  /** Line text with a leading timestamp removed for display. */
  displayText: string;
  level: ConsoleLineLevel;
  isContinuation: boolean;
}

const TIMESTAMP_PATTERNS: RegExp[] = [
  /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})?)\s*/,
  /^(\[\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?\])\s*/,
  /^(\[\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?\])\s*/,
  /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?)\s*/,
  /^(\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?)\s+/,
];

function parseEmbeddedTimestamp(text: string): {
  embeddedAt: Date | null;
  displayText: string;
} {
  for (const pattern of TIMESTAMP_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    const raw = match[1].replace(/^\[|\]$/g, "");
    const normalized = raw.includes("/")
      ? raw.replace(
          /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?)$/,
          "$3-$1-$2 $4"
        )
      : raw.replace(",", ".");

    const parsed = new Date(
      normalized.includes("T") || normalized.includes("-")
        ? normalized
        : `1970-01-01T${normalized}`
    );

    if (!Number.isNaN(parsed.getTime())) {
      return {
        embeddedAt: parsed,
        displayText: text.slice(match[0].length),
      };
    }
  }

  return { embeddedAt: null, displayText: text };
}

function detectLevel(text: string): ConsoleLineLevel {
  const sample = text.toLowerCase();
  if (
    /\b(error|exception|traceback|fatal|critical|errno)\b/.test(sample) ||
    sample.includes("failed")
  ) {
    return "error";
  }
  if (/\b(warn|warning)\b/.test(sample)) return "warn";
  if (/\b(info)\b/.test(sample)) return "info";
  if (/\b(debug|trace)\b/.test(sample)) return "debug";
  if (/\b(success|ready|started|online|connected|listening)\b/.test(sample)) {
    return "success";
  }
  if (/^\s*$/.test(text)) return "muted";
  return "default";
}

function isContinuationLine(text: string, prevLevel: ConsoleLineLevel): boolean {
  const trimmed = text.trimStart();
  if (!trimmed) return true;
  if (/^[\s│|├└─>]+/.test(text)) return true;
  if (/^(File "|Traceback|During handling|^\s+at\s)/.test(trimmed)) return true;
  if (prevLevel === "error" && /^[\s"]/.test(text)) return true;
  return false;
}

export function parseConsoleLine(
  text: string,
  prevLevel: ConsoleLineLevel = "default"
): ParsedConsoleLine {
  const { embeddedAt, displayText } = parseEmbeddedTimestamp(text);
  const level = detectLevel(displayText || text);
  const continuation = isContinuationLine(text, prevLevel);

  return {
    text,
    embeddedAt,
    displayText: displayText || text,
    level: continuation && level === "default" ? prevLevel : level,
    isContinuation: continuation,
  };
}

const EST_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
});

/** HH:MM:SS TZ in US Eastern (EST/EDT per DST). */
export function formatConsoleTimestamp(date: Date | null): string {
  if (!date) return "—";
  const parts = EST_FORMATTER.formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const second = parts.find((p) => p.type === "second")?.value ?? "00";
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "EST";
  return `${hour}:${minute}:${second} ${tz}`;
}

export function syncLineFirstSeen(
  prevLines: string[],
  nextLines: string[],
  prevFirstSeen: number[]
): number[] {
  const now = Date.now();
  const nextFirstSeen: number[] = [];

  for (let i = 0; i < nextLines.length; i++) {
    if (i < prevLines.length && prevLines[i] === nextLines[i]) {
      nextFirstSeen.push(prevFirstSeen[i] ?? now);
    } else {
      nextFirstSeen.push(now);
    }
  }

  return nextFirstSeen;
}

export const LEVEL_STYLES: Record<
  ConsoleLineLevel,
  { row: string; text: string; gutter: string }
> = {
  error: {
    row: "bg-red-500/[0.06] border-l-2 border-l-red-400/70",
    text: "text-red-200/95",
    gutter: "text-red-400/50",
  },
  warn: {
    row: "bg-amber-500/[0.05] border-l-2 border-l-amber-400/60",
    text: "text-amber-100/90",
    gutter: "text-amber-400/45",
  },
  info: {
    row: "border-l-2 border-l-sky-400/30",
    text: "text-sky-100/85",
    gutter: "text-sky-400/40",
  },
  debug: {
    row: "",
    text: "text-violet-200/70",
    gutter: "text-violet-400/35",
  },
  success: {
    row: "bg-emerald-500/[0.04] border-l-2 border-l-emerald-400/50",
    text: "text-emerald-200/90",
    gutter: "text-emerald-400/45",
  },
  muted: {
    row: "opacity-40",
    text: "text-zinc-500",
    gutter: "text-zinc-600",
  },
  default: {
    row: "",
    text: "text-[#23d18b]",
    gutter: "text-[#666666]",
  },
};
