import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import {
  ensureMemberMessagesBackfillTable,
  getMemberMessagesBackfillState,
} from "@/lib/db/member-messages-backfill";
import { spawn } from "child_process";
import path from "path";

export const GET = handleApiRoute(async () => {
  await requireAction("analytics.read");
  const state = await getMemberMessagesBackfillState();
  return Response.json({ state });
});

export const POST = handleApiRoute(async () => {
  await requireAction("games.write");
  await ensureMemberMessagesBackfillTable();
  const state = await getMemberMessagesBackfillState();
  if (state.status === "running") {
    return Response.json(
      { error: "Backfill is already running", state },
      { status: 409 }
    );
  }

  const script = path.join(
    process.cwd(),
    "scripts",
    "backfill-member-messages.mjs"
  );
  const child = spawn(
    "nice",
    ["-n", "19", "ionice", "-c", "3", process.execPath, script],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_OPTIONS: "--max-old-space-size=192",
        BACKFILL_PAGE_DELAY_MS: process.env.BACKFILL_PAGE_DELAY_MS || "10000",
        BACKFILL_CHANNEL_DELAY_MS:
          process.env.BACKFILL_CHANNEL_DELAY_MS || "30000",
        BACKFILL_SKIP_ARCHIVED_THREADS:
          process.env.BACKFILL_SKIP_ARCHIVED_THREADS ?? "1",
        BACKFILL_MAX_ARCHIVED_THREAD_PAGES:
          process.env.BACKFILL_MAX_ARCHIVED_THREAD_PAGES || "2",
      },
    }
  );
  child.unref();

  return Response.json({
    ok: true,
    message: "Backfill started in background",
    pid: child.pid,
  });
});
