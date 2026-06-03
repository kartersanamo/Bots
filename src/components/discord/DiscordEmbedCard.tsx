"use client";

import type { DiscordEmbed, DiscordResolvedMember } from "@/lib/discord/chat-types";
import { embedBorderColor, renderDiscordMarkdown } from "@/lib/discord/markdown";
import { formatRelativeTime } from "@/lib/utils";

export function DiscordEmbedCard({
  embed,
  memberProfiles,
  onUserMentionClick,
}: {
  embed: DiscordEmbed;
  memberProfiles: Record<string, DiscordResolvedMember>;
  onUserMentionClick: (userId: string) => void;
}) {
  const descriptionHtml = embed.description
    ? renderDiscordMarkdown(embed.description, memberProfiles)
    : "";

  function handleMentionClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement | null;
    const el = target?.closest?.("[data-user-id]") as HTMLElement | null;
    const userId = el?.getAttribute("data-user-id");
    if (userId) {
      e.preventDefault();
      onUserMentionClick(userId);
    }
  }

  return (
    <div
      className="mt-2 max-w-[520px] rounded-md border border-border/60 bg-surface/70 p-3"
      style={{ borderLeftWidth: 4, borderLeftColor: embedBorderColor(embed.color) }}
    >
      {embed.author?.name && (
        <p className="text-xs font-medium text-muted">{embed.author.name}</p>
      )}
      {embed.title && (
        <p className="mt-1 text-sm font-semibold text-white">
          {embed.url ? (
            <a
              href={embed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {embed.title}
            </a>
          ) : (
            embed.title
          )}
        </p>
      )}
      {embed.description && (
        <div
          className="mt-1 break-words text-sm text-white/90"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          onClick={handleMentionClick}
        />
      )}
      {embed.fields && embed.fields.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {embed.fields.map((f, i) => (
            <div
              key={`${f.name ?? "field"}-${i}`}
              className={f.inline ? "" : "sm:col-span-2"}
            >
              {f.name && (
                <div
                  className="text-xs font-medium text-accent-light"
                  dangerouslySetInnerHTML={{
                    __html: renderDiscordMarkdown(f.name, memberProfiles),
                  }}
                />
              )}
              {f.value && (
                <div
                  className="break-words text-xs text-white/85"
                  dangerouslySetInnerHTML={{
                    __html: renderDiscordMarkdown(f.value, memberProfiles),
                  }}
                  onClick={handleMentionClick}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {embed.thumbnail?.url && (
        <img
          src={embed.thumbnail.url}
          alt="Embed thumbnail"
          className="mt-2 h-16 w-16 rounded object-cover"
        />
      )}
      {embed.image?.url && (
        <img
          src={embed.image.url}
          alt="Embed image"
          className="mt-2 max-h-80 w-full rounded object-contain"
        />
      )}
      {(embed.footer?.text || embed.timestamp) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          {embed.footer?.icon_url && (
            <img
              src={embed.footer.icon_url}
              alt="Footer icon"
              className="h-3.5 w-3.5 rounded"
            />
          )}
          <p>
            {[
              embed.footer?.text,
              embed.timestamp
                ? formatRelativeTime(new Date(embed.timestamp))
                : null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
      )}
    </div>
  );
}
