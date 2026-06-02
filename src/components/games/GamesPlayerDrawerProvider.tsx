"use client";

import { GamesUserDrawer } from "@/components/games/GamesUserDrawer";
import { can, type PermissionTier } from "@/lib/permissions";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const GamesPlayerDrawerContext = createContext<{
  openGamesUser: (userId: string) => void;
} | null>(null);

export function GamesPlayerDrawerProvider({
  userTier,
  children,
}: {
  userTier: PermissionTier;
  children: React.ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const canReadGames = can(userTier, "games.read");

  const openGamesUser = useCallback(
    (id: string) => {
      if (!canReadGames) return;
      setUserId(id.trim());
    },
    [canReadGames]
  );

  const value = useMemo(
    () => (canReadGames ? { openGamesUser } : null),
    [canReadGames, openGamesUser]
  );

  return (
    <GamesPlayerDrawerContext.Provider value={value}>
      {children}
      {userId && canReadGames && (
        <GamesUserDrawer
          userId={userId}
          onClose={() => setUserId(null)}
          canWrite={can(userTier, "games.write")}
        />
      )}
    </GamesPlayerDrawerContext.Provider>
  );
}

/** Available on dashboard when the user can read games data. */
export function useGamesPlayerDrawer() {
  return useContext(GamesPlayerDrawerContext);
}
