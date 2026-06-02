import { env } from "@/lib/env";

export type PermissionTier =
  | "owner"
  | "manager"
  | "admin"
  | "moderator"
  | "helper"
  | "none";

export type PermissionAction =
  | "fleet.view"
  | "fleet.restart"
  | "fleet.restart_all"
  | "logs.view"
  | "config.view"
  | "config.edit"
  | "dm.view"
  | "dm.send"
  | "audit.view"
  | "analytics.read"
  | "tickets.read"
  | "tickets.write"
  | "tickets.view_private"
  | "bans.read"
  | "bans.write"
  | "leveling.read"
  | "leveling.write"
  | "factions.write"
  | "discord.moderate"
  | "discord.channels"
  | "bot.panels"
  | "games.read"
  | "games.write"
  | "games.control"
  | "games.wipe";

const TIER_RANK: Record<PermissionTier, number> = {
  owner: 100,
  manager: 80,
  admin: 60,
  moderator: 40,
  helper: 20,
  none: 0,
};

/** Minimum tier required per action */
export const ACTION_TIER: Record<PermissionAction, PermissionTier> = {
  "fleet.view": "helper",
  "fleet.restart": "manager",
  "fleet.restart_all": "owner",
  "logs.view": "helper",
  "config.view": "admin",
  "config.edit": "manager",
  "dm.view": "admin",
  "dm.send": "admin",
  "audit.view": "admin",
  "analytics.read": "moderator",
  "tickets.read": "helper",
  "tickets.write": "admin",
  "tickets.view_private": "admin",
  "bans.read": "moderator",
  "bans.write": "admin",
  "leveling.read": "helper",
  "leveling.write": "admin",
  "factions.write": "admin",
  "discord.moderate": "admin",
  "discord.channels": "manager",
  "bot.panels": "admin",
  "games.read": "helper",
  "games.write": "admin",
  "games.control": "admin",
  "games.wipe": "manager",
};

/** Role IDs from MinecadiaTickets config ROLE_HIERARCHY */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  Helpers: [
    "1223479636797685921",
    "1223479482564739183",
    "1223479577678970880",
    "918899899108577290",
  ],
  Mods: [
    "1223479976733446208",
    "1223479788010737734",
    "1223479914704146485",
    "918899851893284935",
  ],
  "Sr. Mods": [
    "1223480358339612713",
    "1223480153464770730",
    "1223480285212053545",
    "918899817634218065",
  ],
  "Jr Admins": [
    "1223480993470746726",
    "1223480738133839922",
    "1223480907172679731",
    "952952934604369950",
  ],
  Admins: [
    "1223484462617202748",
    "1223484322871251026",
    "1223484398750666853",
    "918899729897779331",
  ],
  "Sr Admin": ["1052722994511892551"],
  Managers: ["1221840429998411806", "693919516861923408"],
  Owner: ["680584954136100890"],
};

const TIER_FOR_GROUP: Record<string, PermissionTier> = {
  Helpers: "helper",
  Mods: "moderator",
  "Sr. Mods": "moderator",
  "Jr Admins": "admin",
  Admins: "admin",
  "Sr Admin": "manager",
  Managers: "manager",
  Owner: "owner",
};

export function resolvePermissionTier(
  userId: string,
  roleIds: string[]
): PermissionTier {
  const ownerId = env("OWNER_DISCORD_ID");
  if (ownerId && userId === ownerId) return "owner";

  let highest: PermissionTier = "none";

  for (const [group, ids] of Object.entries(ROLE_HIERARCHY)) {
    const tier = TIER_FOR_GROUP[group];
    if (ids.some((id) => roleIds.includes(id))) {
      if (TIER_RANK[tier] > TIER_RANK[highest]) {
        highest = tier;
      }
    }
  }

  return highest;
}

export function hasMinimumTier(
  userTier: PermissionTier,
  required: PermissionTier
): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required];
}

export function can(
  userTier: PermissionTier,
  action: PermissionAction
): boolean {
  return hasMinimumTier(userTier, ACTION_TIER[action]);
}

export function tierLabel(tier: PermissionTier): string {
  const labels: Record<PermissionTier, string> = {
    owner: "Owner",
    manager: "Manager",
    admin: "Admin",
    moderator: "Moderator",
    helper: "Helper",
    none: "No Access",
  };
  return labels[tier];
}

export function tierColor(tier: PermissionTier): string {
  const colors: Record<PermissionTier, string> = {
    owner: "text-accent-glow",
    manager: "text-purple-300",
    admin: "text-violet-400",
    moderator: "text-indigo-400",
    helper: "text-blue-400",
    none: "text-muted",
  };
  return colors[tier];
}
