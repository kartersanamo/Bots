"use client";

import { ActiveGuildBansTable } from "@/components/analytics/ActiveGuildBansTable";
import { ActiveGuildTimeoutsTable } from "@/components/analytics/ActiveGuildTimeoutsTable";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import { ModerationPanel } from "@/components/panels/ModerationPanel";

interface ModerationWorkspaceProps {
  canModerate: boolean;
}

export function ModerationWorkspace({ canModerate }: ModerationWorkspaceProps) {
  return (
    <GamesDiscordUsersProvider>
      <div className="space-y-10">
        {canModerate ? (
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Quick actions</h2>
              <p className="mt-1 text-sm text-muted">
                Ban, timeout, kick, or unban a member by Discord user ID.
              </p>
            </div>
            <ModerationPanel />
          </section>
        ) : (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
            You can view active bans and timeouts below. Quick moderation actions
            require Admin or higher.
          </div>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Active guild bans</h2>
            <p className="mt-1 text-sm text-muted">
              Everyone on the server ban list — revoke to unban through the bot.
            </p>
          </div>
          <ActiveGuildBansTable variant="manage" />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Active timeouts</h2>
            <p className="mt-1 text-sm text-muted">
              Members currently timed out — remove timeout to restore chat access
              early.
            </p>
          </div>
          <ActiveGuildTimeoutsTable variant="manage" />
        </section>
      </div>
    </GamesDiscordUsersProvider>
  );
}
