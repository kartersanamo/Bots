import { type ReactNode } from "react";

/** Classic 16-color palette (xterm / default tmux). */
export const ANSI_PALETTE: Record<number, string> = {
  0: "#000000",
  1: "#cd3131",
  2: "#0dbc79",
  3: "#e5e510",
  4: "#2472c8",
  5: "#bc3fbc",
  6: "#11a8cd",
  7: "#e5e5e5",
  8: "#666666",
  9: "#f14c4c",
  10: "#23d18b",
  11: "#f5f543",
  12: "#3b8eea",
  13: "#d670d6",
  14: "#29b8db",
  15: "#e5e5e5",
};

const ANSI_RE = /\x1b\[([0-9;]*)m/g;

export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

export function hasAnsi(text: string): boolean {
  return /\x1b\[/.test(text);
}

interface AnsiState {
  color?: string;
  bold?: boolean;
}

function applyCodes(codes: number[], state: AnsiState): AnsiState {
  const next = { ...state };
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    if (code === 0) {
      return {};
    }
    if (code === 1) {
      next.bold = true;
      continue;
    }
    if (code === 22) {
      next.bold = false;
      continue;
    }
    if (code >= 30 && code <= 37) {
      next.color = ANSI_PALETTE[code - 30];
      continue;
    }
    if (code >= 90 && code <= 97) {
      next.color = ANSI_PALETTE[code - 90 + 8];
      continue;
    }
    if (code === 39) {
      delete next.color;
      continue;
    }
    if (code === 38 && codes[i + 1] === 5 && codes[i + 2] != null) {
      const idx = codes[i + 2];
      if (idx < 16) {
        next.color = ANSI_PALETTE[idx];
      }
      i += 2;
    }
  }
  return next;
}

function spanStyle(state: AnsiState): string | undefined {
  const parts: string[] = [];
  if (state.color) parts.push(`color:${state.color}`);
  if (state.bold) parts.push("font-weight:600");
  return parts.length ? parts.join(";") : undefined;
}

export function renderAnsiText(
  text: string,
  fallbackClassName?: string
): ReactNode {
  if (!hasAnsi(text)) {
    return <span className={fallbackClassName}>{text || " "}</span>;
  }

  const nodes: ReactNode[] = [];
  let state: AnsiState = {};
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  ANSI_RE.lastIndex = 0;
  while ((match = ANSI_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const chunk = text.slice(lastIndex, match.index);
      const style = spanStyle(state);
      nodes.push(
        style ? (
          <span
            key={key++}
            style={{
              color: state.color,
              fontWeight: state.bold ? 600 : undefined,
            }}
          >
            {chunk}
          </span>
        ) : (
          <span key={key++} className={fallbackClassName}>
            {chunk}
          </span>
        )
      );
    }

    const raw = match[1];
    const codes = raw
      ? raw.split(";").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n))
      : [0];
    state = applyCodes(codes, state);
    lastIndex = ANSI_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    const chunk = text.slice(lastIndex);
    const style = spanStyle(state);
    nodes.push(
      style ? (
        <span
          key={key++}
          style={{
            color: state.color,
            fontWeight: state.bold ? 600 : undefined,
          }}
        >
          {chunk}
        </span>
      ) : (
        <span key={key++} className={fallbackClassName}>
          {chunk}
        </span>
      )
    );
  }

  return <>{nodes.length ? nodes : " "}</>;
}
