import type { DiscordEmbed, DiscordResolvedMember } from "@/lib/discord/chat-types";

export const USER_MENTION_RE = /<@!?(\d{15,22})>/g;

export function extractMentionUserIds(content: string): string[] {
  return Array.from(content.matchAll(USER_MENTION_RE), (m) => m[1]);
}

export function extractMentionUserIdsFromEmbeds(
  embeds: DiscordEmbed[] | undefined
): string[] {
  if (!embeds?.length) return [];
  const out: string[] = [];
  for (const embed of embeds) {
    if (embed.title) out.push(...extractMentionUserIds(embed.title));
    if (embed.description) out.push(...extractMentionUserIds(embed.description));
    if (embed.footer?.text) out.push(...extractMentionUserIds(embed.footer.text));
    for (const field of embed.fields ?? []) {
      if (field.name) out.push(...extractMentionUserIds(field.name));
      if (field.value) out.push(...extractMentionUserIds(field.value));
    }
  }
  return out;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDiscordTimestampToken(
  unixSeconds: number,
  style?: string
): string {
  if (!Number.isFinite(unixSeconds)) return "";
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return "";

  const locale = undefined;
  const shortDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const longDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const shortTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  const longTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  const longDateTime = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  switch (style) {
    case "t":
      return shortTime.format(date);
    case "T":
      return longTime.format(date);
    case "d":
      return shortDate.format(date);
    case "D":
      return longDate.format(date);
    case "f":
      return `${longDate.format(date)} ${shortTime.format(date)}`;
    case "F":
      return longDateTime.format(date);
    case "R": {
      const now = Date.now();
      const diffSec = Math.round((date.getTime() - now) / 1000);
      const abs = Math.abs(diffSec);
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      if (abs < 60) return rtf.format(diffSec, "second");
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
      if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
      if (abs < 31536000)
        return rtf.format(Math.round(diffSec / 2592000), "month");
      return rtf.format(Math.round(diffSec / 31536000), "year");
    }
    default:
      return `${longDate.format(date)} ${shortTime.format(date)}`;
  }
}

export function renderDiscordMarkdown(
  raw: string,
  memberProfiles: Record<string, DiscordResolvedMember>
): string {
  if (!raw.trim()) return "";
  const token = {
    mention: (i: number) => `[[[MENTION${i}]]]`,
    block: (i: number) => `[[[BLOCK${i}]]]`,
    inline: (i: number) => `[[[INLINE${i}]]]`,
  };

  const mentionLinks: string[] = [];
  let text = raw
    .replace(USER_MENTION_RE, (_, id: string) => {
      const p = memberProfiles[id];
      const name = p?.displayName || p?.username || id;
      const html = `<button type="button" data-user-id="${id}" class="rounded bg-accent/25 px-1 text-accent-light hover:underline">@${escapeHtml(
        name
      )}</button>`;
      const idx = mentionLinks.push(html);
      return token.mention(idx - 1);
    })
    .replace(/<@&(\d{15,22})>/g, (_m, id: string) => `@role:${id}`)
    .replace(/<#(\d{15,22})>/g, (_m, id: string) => `#channel:${id}`)
    .replace(/@everyone/g, "@everyone")
    .replace(/@here/g, "@here");

  text = text.replace(
    /<t:(\d{1,12})(?::([tTdDfFR]))?>?/g,
    (_m, unixRaw: string, styleRaw?: string) => {
      const rendered = formatDiscordTimestampToken(
        Number(unixRaw),
        styleRaw || undefined
      );
      return rendered || `<t:${unixRaw}${styleRaw ? `:${styleRaw}` : ""}>`;
    }
  );

  text = escapeHtml(text).replaceAll("\r\n", "\n");

  const blockCodes: string[] = [];
  text = text.replace(/```([a-zA-Z0-9+\-_.]*)?\n?([\s\S]*?)```/g, (_, lang, body) => {
    const langLabel = lang ? escapeHtml(String(lang)) : "";
    const idx = blockCodes.push(
      `<pre class="my-2 overflow-x-auto rounded bg-black/30 p-2"><code>${
        langLabel
          ? `<span class="mr-2 text-[10px] uppercase text-muted">${langLabel}</span>\n`
          : ""
      }${escapeHtml(String(body))}</code></pre>`
    );
    return token.block(idx - 1);
  });

  const inlineCodes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_, body) => {
    const idx = inlineCodes.push(
      `<code class="rounded bg-black/35 px-1 py-0.5 text-[0.95em]">${escapeHtml(
        String(body)
      )}</code>`
    );
    return token.inline(idx - 1);
  });

  text = text
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">$1</a>'
    )
    .replace(
      /&lt;(https?:\/\/[^&\s]+)&gt;/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">$1</a>'
    )
    .replace(
      /\|\|([^|]+)\|\|/g,
      '<span class="rounded bg-white/10 px-1 text-transparent hover:text-white">$1</span>'
    )
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  const lines = text.split("\n");
  const formattedLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("&gt; ")) {
      formattedLines.push(
        `<blockquote class="my-1 border-l-2 border-border pl-2 text-white/85">${line.slice(5)}</blockquote>`
      );
      continue;
    }
    if (line.startsWith("&gt;&gt;&gt; ")) {
      formattedLines.push(
        `<blockquote class="my-1 border-l-2 border-border pl-2 text-white/85">${line.slice(13)}</blockquote>`
      );
      continue;
    }
    formattedLines.push(line);
  }
  text = formattedLines.join("<br />");

  text = text
    .replace(/\[\[\[INLINE(\d+)\]\]\]/g, (_, i: string) => inlineCodes[Number(i)] ?? "")
    .replace(/\[\[\[BLOCK(\d+)\]\]\]/g, (_, i: string) => blockCodes[Number(i)] ?? "")
    .replace(/\[\[\[MENTION(\d+)\]\]\]/g, (_, i: string) => mentionLinks[Number(i)] ?? "");

  return text;
}

export function embedBorderColor(color?: number): string {
  if (!color || color <= 0) return "#5865F2";
  return `#${color.toString(16).padStart(6, "0")}`;
}
