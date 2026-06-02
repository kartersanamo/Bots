export interface GuildRoleLite {
  id: string;
  name: string;
  color: number;
  position: number;
  icon?: string | null;
  unicode_emoji?: string | null;
}

export function roleColorHex(color?: number): string | undefined {
  if (!color || color <= 0) return undefined;
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function roleIconUrl(role: GuildRoleLite): string | null {
  if (!role.icon) return null;
  return `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=64`;
}

/** Permission-only role; sits at top of hierarchy but has no display color/icon. */
export const PERMISSION_ONLY_ROLE_NAME = "*";

export function isPermissionOnlyRole(role: GuildRoleLite): boolean {
  return role.name === PERMISSION_ONLY_ROLE_NAME;
}

export function topRoleForMember(
  roleIds: string[] | undefined,
  roleById: Map<string, GuildRoleLite>
): GuildRoleLite | null {
  if (!roleIds?.length) return null;
  const resolved = roleIds
    .map((id) => roleById.get(id))
    .filter((r): r is GuildRoleLite => Boolean(r))
    .filter((r) => !isPermissionOnlyRole(r))
    .sort((a, b) => b.position - a.position);
  return resolved[0] ?? null;
}
