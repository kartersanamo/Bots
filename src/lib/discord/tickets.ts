const DISCORD_API = "https://discord.com/api/v10";

const enrichCache = new Map<
  string,
  { data: TicketEnrichment; expires: number }
>();
const CACHE_TTL_MS = 300_000;
const DISCORD_FETCH_MS = 4000;

export interface IntakeField {
  label: string;
  value: string;
}

export interface ParsedIntake {
  intro: string;
  fields: IntakeField[];
  rawDescription: string;
}

export interface OwnerMessage {
  id: string;
  content: string;
  timestamp: string;
  authorId: string;
}

export interface TicketEnrichment {
  intake: ParsedIntake | null;
  intakePreview: string;
  lastOwnerMessage: OwnerMessage | null;
  lastOwnerPreview: string;
  awaitingUser: boolean;
  enrichmentError?: string;
}

export interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: { id: string; username?: string; bot?: boolean };
  embeds?: { description?: string; title?: string }[];
}

function botHeaders(): HeadersInit {
  const token =
    process.env.BOT_TICKETS_TOKEN || process.env.DISCORD_BOT_TOKEN || "";
  return { Authorization: `Bot ${token}` };
}

export { discordChannelUrl } from "@/lib/discord/guild";

export function isDiscordConfigured(): boolean {
  return !!(process.env.DISCORD_BOT_TOKEN || process.env.BOT_TICKETS_TOKEN);
}

async function discordFetch(url: string, init?: RequestInit): Promise<Response> {
  const { fetchWithTimeout } = await import("@/lib/fetch-timeout");
  return fetchWithTimeout(
    url,
    { ...init, headers: { ...botHeaders(), ...init?.headers } },
    DISCORD_FETCH_MS
  );
}

export async function getTicketChannelMessages(
  channelId: string,
  limit = 50
): Promise<DiscordMessage[]> {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      res.status === 403
        ? "Bot cannot read this channel"
        : err || res.statusText
    );
  }
  return res.json();
}

export function parseEmbedDescription(description: string): ParsedIntake {
  const fields: IntakeField[] = [];
  const parts = description.split(/\n \n|\n\n/);
  let intro = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    if (
      i === 0 ||
      part.includes("You have created a new ticket") ||
      part.startsWith("Hey ")
    ) {
      if (!part.match(/^\*\*.+\*\*/)) {
        intro += (intro ? "\n\n" : "") + part;
        continue;
      }
    }
    const fieldMatch = part.match(/^\*\*(.+?)\*\*\n([\s\S]*)$/);
    if (fieldMatch) {
      fields.push({
        label: fieldMatch[1].trim(),
        value: fieldMatch[2].trim().replace(/^`|`$/g, ""),
      });
    } else if (part.includes("**") && part.includes("staff members")) {
      intro += (intro ? "\n\n" : "") + part;
    }
  }

  return { intro: intro.trim(), fields, rawDescription: description };
}

export function parseIntakeEmbed(
  messages: DiscordMessage[]
): ParsedIntake | null {
  const withEmbeds = messages.filter((m) => m.embeds?.length);
  if (!withEmbeds.length) return null;

  let target = withEmbeds.find((m) =>
    m.embeds?.[0]?.description?.includes("You have created a new ticket")
  );
  if (!target) {
    target = withEmbeds[withEmbeds.length - 1];
  }

  const desc = target.embeds?.[0]?.description;
  if (!desc) return null;
  return parseEmbedDescription(desc);
}

export function getLatestOwnerMessage(
  messages: DiscordMessage[],
  ownerId: string
): OwnerMessage | null {
  for (const m of messages) {
    if (m.author?.id === ownerId && !m.author?.bot) {
      const content = m.content?.trim() || "";
      if (!content && !m.embeds?.length) continue;
      return {
        id: m.id,
        content: content || "(embed/attachment)",
        timestamp: m.timestamp,
        authorId: ownerId,
      };
    }
  }
  return null;
}

function buildPreview(intake: ParsedIntake | null, maxLen = 120): string {
  if (!intake) return "";
  if (intake.fields.length >= 2) {
    const a = intake.fields[0];
    const b = intake.fields[1];
    const line = `${a.label}: ${a.value} · ${b.label}: ${b.value}`;
    return line.length > maxLen ? line.slice(0, maxLen) + "…" : line;
  }
  if (intake.fields.length === 1) {
    const f = intake.fields[0];
    const line = `${f.label}: ${f.value}`;
    return line.length > maxLen ? line.slice(0, maxLen) + "…" : line;
  }
  return intake.intro.length > maxLen
    ? intake.intro.slice(0, maxLen) + "…"
    : intake.intro;
}

export async function enrichTicket(
  channelId: string,
  ownerId: string
): Promise<TicketEnrichment> {
  const cached = enrichCache.get(channelId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const messages = await getTicketChannelMessages(channelId, 25);
    const intake = parseIntakeEmbed(messages);
    const lastOwnerMessage = getLatestOwnerMessage(messages, ownerId);
    const intakePreview = buildPreview(intake);
    const lastOwnerPreview = lastOwnerMessage
      ? lastOwnerMessage.content.length > 120
        ? lastOwnerMessage.content.slice(0, 120) + "…"
        : lastOwnerMessage.content
      : "";

    const data: TicketEnrichment = {
      intake,
      intakePreview,
      lastOwnerMessage,
      lastOwnerPreview,
      awaitingUser: !lastOwnerMessage,
    };
    enrichCache.set(channelId, {
      data,
      expires: Date.now() + CACHE_TTL_MS,
    });
    return data;
  } catch (err) {
    return {
      intake: null,
      intakePreview: "",
      lastOwnerMessage: null,
      lastOwnerPreview: "",
      awaitingUser: true,
      enrichmentError:
        err instanceof Error ? err.message : "Enrichment failed",
    };
  }
}

export async function enrichTicketsBatch(
  items: { channelId: string; ownerId: string }[]
): Promise<Record<string, TicketEnrichment>> {
  const result: Record<string, TicketEnrichment> = {};
  const concurrency = 3;
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const { channelId, ownerId } = items[idx];
      result[channelId] = await enrichTicket(channelId, ownerId);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return result;
}

export async function fetchDiscordUser(userId: string): Promise<{
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
} | null> {
  const res = await fetch(`${DISCORD_API}/users/${userId}`, {
    headers: botHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return {
    id: u.id,
    username: u.username,
    global_name: u.global_name ?? null,
    avatar: u.avatar ?? null,
  };
}
