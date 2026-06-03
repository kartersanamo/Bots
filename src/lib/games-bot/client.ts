import { env } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

const DEFAULT_URL = "http://127.0.0.1:8789";

export class GamesBotApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "GamesBotApiError";
  }
}

function baseUrl(): string {
  return env("GAMES_BOT_API_URL") || DEFAULT_URL;
}

function secret(): string {
  const dedicated = env("GAMES_BOT_API_SECRET");
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV !== "production") {
    const fallback = env("CONTROL_API_SECRET");
    if (fallback) return fallback;
  }
  throw new Error("GAMES_BOT_API_SECRET not configured");
}

export function isGamesBotApiConfigured(): boolean {
  if (env("GAMES_BOT_API_SECRET")) return true;
  return (
    process.env.NODE_ENV !== "production" && !!env("CONTROL_API_SECRET")
  );
}

async function gamesFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetchWithTimeout(
    url,
    {
      ...options,
      headers: {
        "X-Games-Key": secret(),
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
    8000
  );
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new GamesBotApiError(detail, res.status, data);
  }
  return data as T;
}

export async function getGamesBotStatus(): Promise<{
  chatGamesRunning: boolean;
  dmGamesRunning: boolean;
}> {
  return gamesFetch("/status");
}

export async function toggleChatGames(): Promise<{ running: boolean }> {
  return gamesFetch("/toggle-chat-games", { method: "POST" });
}

export async function toggleDmGames(): Promise<{ running: boolean }> {
  return gamesFetch("/toggle-dm-games", { method: "POST" });
}

export async function forceChatGame(game: string, channelId?: string): Promise<void> {
  await gamesFetch("/force-chat-game", {
    method: "POST",
    body: JSON.stringify({ game, channel_id: channelId }),
  });
}

export async function forceDmRefresh(): Promise<void> {
  await gamesFetch("/force-dm-refresh", { method: "POST" });
}

export async function addTriviaQuestion(body: {
  channelId: string;
  question: string;
  answer: string;
}): Promise<void> {
  await gamesFetch("/add-trivia", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function wipeLevels(
  month: string,
  actorId?: string
): Promise<unknown> {
  return gamesFetch("/wipe-levels", {
    method: "POST",
    body: JSON.stringify({ month, actor_id: actorId }),
  });
}

export async function reloadGamesConfig(): Promise<void> {
  await gamesFetch("/reload-config", { method: "POST" });
}

export async function getActiveChatGameIds(): Promise<{ gameIds: number[] }> {
  return gamesFetch("/sessions/active");
}

export async function getSessionLiveState(gameId: number): Promise<{
  active: boolean;
  messageId?: string;
  messageUrl?: string;
  gameType?: string;
  xpMultiplier?: number;
  testMode?: boolean;
  winners?: { user_id: string | null; xp: number }[];
  activityLog?: unknown[];
  answer?: string;
  revealed?: boolean;
}> {
  return gamesFetch(`/session/${gameId}`);
}

export async function sessionChatAction(
  gameId: number,
  action: string
): Promise<unknown> {
  return gamesFetch("/session/chat-action", {
    method: "POST",
    body: JSON.stringify({ game_id: gameId, action }),
  });
}
