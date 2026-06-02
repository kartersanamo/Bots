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
import { recordModAction } from "@/lib/db/analytics-tracking";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("discord.moderate");
  const body = await request.json();
  const { action, userId, reason, durationSeconds, deleteMessageDays } = body;
  const gid = guildId();

  if (!userId || !action) {
    return Response.json({ error: "action and userId required" }, { status: 400 });
  }

  const modActionMap: Record<string, string> = {
    timeout: "timeout",
    untimeout: "untimeout",
    kick: "kick",
    ban: "ban",
    unban: "unban",
  };

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
          return { unbanned: true };
        default:
          throw new Error("Unknown action");
      }
    },
    { before: { action, userId } }
  );

  const modType = modActionMap[action];
  if (modType) {
    try {
      await recordModAction({
        actionType: modType,
        actorId: session.id,
        targetId: userId,
        reason: typeof reason === "string" ? reason : undefined,
        durationSeconds:
          action === "timeout" ? durationSeconds || 3600 : undefined,
      });
    } catch {
      /* analytics tables may not exist yet */
    }
  }

  return Response.json({ ok: true, result });
});
