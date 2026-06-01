import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { addTriviaQuestion, isGamesBotApiConfigured } from "@/lib/games-bot/client";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("games.control");
  if (!isGamesBotApiConfigured()) {
    return Response.json({ error: "Games bot API not configured" }, { status: 503 });
  }

  const body = await request.json();
  if (!body.channelId || !body.question || !body.answer) {
    return Response.json(
      { error: "channelId, question, answer required" },
      { status: 400 }
    );
  }

  await withAudit(request, session, "games.add_trivia", body.channelId, () =>
    addTriviaQuestion({
      channelId: String(body.channelId),
      question: String(body.question),
      answer: String(body.answer),
    })
  );
  return Response.json({ ok: true });
});
