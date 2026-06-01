import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { editChannel, sendChannelMessage } from "@/lib/discord/actions";

export const PATCH = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("discord.channels");
  const { channelId } = await params;
  const data = await request.json();
  const result = await withAudit(
    request,
    session,
    "discord.channel.edit",
    channelId,
    () => editChannel(channelId, data)
  );
  return Response.json(result);
});

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("discord.channels");
  const { channelId } = await params;
  const { content, embed } = await request.json();
  if (!content) {
    return Response.json({ error: "content required" }, { status: 400 });
  }
  const result = await withAudit(
    request,
    session,
    "discord.channel.message",
    channelId,
    () => sendChannelMessage(channelId, content, embed)
  );
  return Response.json(result);
});
