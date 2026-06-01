const DISCORD_API = "https://discord.com/api/v10";

function botHeaders(): HeadersInit {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function discordRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: { ...botHeaders(), ...options.headers },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      typeof data === "object" && data?.message
        ? data.message
        : res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export async function timeoutMember(
  guildId: string,
  userId: string,
  durationSeconds: number,
  reason?: string
) {
  const until = new Date(Date.now() + durationSeconds * 1000).toISOString();
  return discordRequest(`/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      communication_disabled_until: until,
      ...(reason ? { reason } : {}),
    }),
  });
}

export async function removeTimeout(guildId: string, userId: string) {
  return discordRequest(`/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ communication_disabled_until: null }),
  });
}

export async function kickMember(
  guildId: string,
  userId: string,
  reason?: string
) {
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return discordRequest(`/guilds/${guildId}/members/${userId}${q}`, {
    method: "DELETE",
  });
}

export async function banMember(
  guildId: string,
  userId: string,
  deleteMessageDays = 0,
  reason?: string
) {
  return discordRequest(`/guilds/${guildId}/bans/${userId}`, {
    method: "PUT",
    body: JSON.stringify({
      delete_message_days: deleteMessageDays,
      ...(reason ? { reason } : {}),
    }),
  });
}

export async function unbanMember(
  guildId: string,
  userId: string,
  reason?: string
) {
  const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return discordRequest(`/guilds/${guildId}/bans/${userId}${q}`, {
    method: "DELETE",
  });
}

export async function addMemberRole(
  guildId: string,
  userId: string,
  roleId: string
) {
  return discordRequest(
    `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT" }
  );
}

export async function removeMemberRole(
  guildId: string,
  userId: string,
  roleId: string
) {
  return discordRequest(
    `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "DELETE" }
  );
}

export async function editChannel(
  channelId: string,
  data: {
    name?: string;
    topic?: string;
    rate_limit_per_user?: number;
  }
) {
  return discordRequest(`/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function sendChannelMessage(
  channelId: string,
  content: string,
  embed?: Record<string, unknown>
) {
  return discordRequest(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: content.slice(0, 2000),
      ...(embed ? { embeds: [embed] } : {}),
    }),
  });
}

export function guildId(): string {
  const id = process.env.DISCORD_GUILD_ID;
  if (!id) throw new Error("DISCORD_GUILD_ID not configured");
  return id;
}
