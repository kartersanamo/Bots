"use client";

import { useGuildRoles } from "@/components/discord/GuildRolesProvider";
import { roleColorHex } from "@/lib/discord/guild-roles";
import { subtleViewerHighlightStyle } from "@/lib/discord/viewer-highlight";
import { snowflakeString } from "@/lib/games/snowflake";
import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";

interface ViewerHighlightContextValue {
  viewerId: string | null;
  viewerRoleIds: string[];
}

const ViewerHighlightContext = createContext<ViewerHighlightContextValue>({
  viewerId: null,
  viewerRoleIds: [],
});

export function ViewerHighlightProvider({
  viewerId,
  viewerRoleIds,
  children,
}: {
  viewerId: string;
  viewerRoleIds: string[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      viewerId: snowflakeString(viewerId),
      viewerRoleIds,
    }),
    [viewerId, viewerRoleIds]
  );

  return (
    <ViewerHighlightContext.Provider value={value}>
      {children}
    </ViewerHighlightContext.Provider>
  );
}

export function useViewerHighlight(targetUserId: string | null | undefined) {
  const { viewerId, viewerRoleIds } = useContext(ViewerHighlightContext);
  const { getTopRole } = useGuildRoles();

  const targetId = snowflakeString(targetUserId ?? "");
  const isViewer = Boolean(viewerId && targetId && viewerId === targetId);

  const viewerRoleColor = useMemo(() => {
    if (!isViewer) return undefined;
    return roleColorHex(getTopRole(viewerRoleIds)?.color);
  }, [isViewer, viewerRoleIds, getTopRole]);

  const highlightStyle = useMemo(
    () => (isViewer ? subtleViewerHighlightStyle(viewerRoleColor) : undefined),
    [isViewer, viewerRoleColor]
  );

  return { isViewer, viewerRoleColor, highlightStyle };
}

export function ViewerHighlightSpan({
  userId,
  className,
  style,
  children,
}: {
  userId: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { isViewer, highlightStyle } = useViewerHighlight(userId);

  return (
    <span
      className={cn(isViewer && "box-decoration-clone px-0.5", className)}
      style={isViewer ? { ...style, ...highlightStyle } : style}
    >
      {children}
    </span>
  );
}
