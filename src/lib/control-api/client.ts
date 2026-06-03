import { formatErrorDetail } from "@/lib/api/error-message";
import { env } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

const DEFAULT_URL = "http://127.0.0.1:8787";
const FETCH_TIMEOUT_MS = 4000;

export class ControlApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ControlApiError";
  }
}

function baseUrl(): string {
  return env("CONTROL_API_URL") || DEFAULT_URL;
}

function secret(): string {
  const s = env("CONTROL_API_SECRET");
  if (!s) throw new Error("CONTROL_API_SECRET not configured");
  return s;
}

export async function controlFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetchWithTimeout(
    url,
    {
      ...options,
      headers: {
        "X-Control-Key": secret(),
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
    },
    FETCH_TIMEOUT_MS
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
      typeof data === "object" && data && "detail" in data
        ? formatErrorDetail((data as { detail: unknown }).detail)
        : res.statusText;
    throw new ControlApiError(detail, res.status, data);
  }

  return data as T;
}

export interface BotProcessStatus {
  botId: string;
  status: "online" | "offline" | "starting" | "degraded" | "unknown";
  pid?: number | null;
  uptimeSeconds?: number | null;
  systemdUnit?: string | null;
  message?: string | null;
}

export async function getAllBotStatus(): Promise<{ bots: BotProcessStatus[] }> {
  return controlFetch("/bots/status");
}

export async function getBotStatus(botId: string): Promise<BotProcessStatus> {
  return controlFetch(`/bots/${botId}/status`);
}

export async function startBot(botId: string) {
  return controlFetch(`/bots/${botId}/start`, { method: "POST" });
}

export async function stopBot(botId: string) {
  return controlFetch(`/bots/${botId}/stop`, { method: "POST" });
}

export async function restartBot(botId: string) {
  return controlFetch(`/bots/${botId}/restart`, { method: "POST" });
}

export async function getBotConfig(botId: string, configPath: string) {
  return controlFetch<{ path: string; content: unknown; raw: string }>(
    `/bots/${botId}/config?path=${encodeURIComponent(configPath)}`
  );
}

export async function putBotConfig(
  botId: string,
  configPath: string,
  content: unknown
) {
  return controlFetch(`/bots/${botId}/config?path=${encodeURIComponent(configPath)}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function tailBotLogs(
  botId: string,
  opts: {
    lines?: number;
    search?: string;
    file?: string;
    source?: "auto" | "console" | "file";
  } = {}
) {
  const params = new URLSearchParams();
  if (opts.lines) params.set("lines", String(opts.lines));
  if (opts.search) params.set("search", opts.search);
  if (opts.file) params.set("file", opts.file);
  if (opts.source) params.set("source", opts.source);
  const q = params.toString();
  return controlFetch<{
    lines: string[];
    file: string | null;
    files: string[];
    source?: string;
  }>(`/bots/${botId}/logs${q ? `?${q}` : ""}`);
}

export async function listBotDms(
  botId: string,
  limit = 50,
  userIds?: string[]
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (userIds?.length) {
    params.set("user_ids", userIds.join(","));
  }
  const url = `${baseUrl()}/bots/${botId}/dms?${params}`;
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        "X-Control-Key": secret(),
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    90_000
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
      typeof data === "object" && data && "detail" in data
        ? formatErrorDetail((data as { detail: unknown }).detail)
        : res.statusText;
    throw new ControlApiError(detail, res.status, data);
  }
  return data as { channels: unknown[]; token_configured?: boolean };
}

export async function getDmMessages(
  botId: string,
  channelId: string,
  limit = 50,
  before?: string
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  return controlFetch<{ messages: unknown[] }>(
    `/bots/${botId}/dms/${channelId}/messages?${params}`
  );
}

export async function sendDmMessage(
  botId: string,
  channelId: string,
  content: string
) {
  return controlFetch(`/bots/${botId}/dms/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function isControlApiConfigured(): boolean {
  return !!env("CONTROL_API_SECRET");
}
