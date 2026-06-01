import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import {
  timeoutMember,
  removeTimeout,
  kickMember,
  banMember,
  unbanMember,
  guildId,
} from "@/lib/discord/actions";
import { setBanAppeal, removeBanRecord } from "@/lib/db/mutations";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("discord.moderate");
  const body = await request.json();
  const { action, userId, reason, durationSeconds, deleteMessageDays } = body;
  const gid = guildId();

  if (!userId || !action) {
    return Response.json({ error: "action and userId required" }, { status: 400 });
  }

  const result = await withAudit(
    request,
    session,
    `discord.${action}`,
    userId,
    async () => {
      switch (action) {
        case "timeout":
          return timeoutMember(gid, userId, durationSeconds || 3600, reason);
        case "untimeout":
          return removeTimeout(gid, userId);
        case "kick":
          return kickMember(gid, userId, reason);
        case "ban":
          await banMember(gid, userId, deleteMessageDays ?? 0, reason);
          return { banned: true };
        case "unban":
          await unbanMember(gid, userId, reason);
          try {
            await removeBanRecord(userId);
          } catch {
            /* db optional */
          }
          return { unbanned: true };
        case "set_appeal":
          await setBanAppeal(userId, !!body.canAppeal);
          return { ok: true };
        default:
          throw new Error("Unknown action");
      }
    },
    { before: { action, userId } }
  );

  return Response.json({ ok: true, result });
});
