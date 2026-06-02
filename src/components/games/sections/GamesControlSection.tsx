"use client";

import { dashboardFetch } from "@/lib/api/dashboard-fetch";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useEffect, useState } from "react";

const CHAT_GAMES = [
  "unscramble",
  "flag_guesser",
  "math_quiz",
  "trivia",
  "emoji_quiz",
  "guess_the_number",
];

export function GamesControlSection() {
  const [status, setStatus] = useState<{
    chatGamesRunning: boolean;
    dmGamesRunning: boolean;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [forceGame, setForceGame] = useState("trivia");
  const [channelId, setChannelId] = useState("");
  const [triviaQ, setTriviaQ] = useState("");
  const [triviaA, setTriviaA] = useState("");
  const [triviaCh, setTriviaCh] = useState("");

  function loadStatus() {
    dashboardFetch("/api/games/control/status")
      .then((r) => r.json())
      .then((d) => setStatus(d.status));
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function post(path: string, body?: object) {
    setMsg(null);
    const res = await dashboardFetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "OK" : d.error || "Failed");
    loadStatus();
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Live status</h3>
        {status ? (
          <div className="flex gap-3">
            <Badge variant={status.chatGamesRunning ? "success" : "danger"}>
              Chat {status.chatGamesRunning ? "on" : "off"}
            </Badge>
            <Badge variant={status.dmGamesRunning ? "success" : "danger"}>
              DM {status.dmGamesRunning ? "on" : "off"}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Games bot API unavailable. Set GAMES_BOT_API_SECRET and restart
            MinecadiaGames.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => post("/api/games/control/toggle-chat")}
          >
            Toggle chat games
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => post("/api/games/control/toggle-dm")}
          >
            Toggle DM games
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => post("/api/games/control/force-dm")}
          >
            Force DM refresh
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => post("/api/games/control/reload-config")}
          >
            Reload config
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Force chat game</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={forceGame}
            onChange={(e) => setForceGame(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm text-white"
          >
            {CHAT_GAMES.map((g) => (
              <option key={g} value={g}>
                {g.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            placeholder="Channel ID (optional)"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm text-white"
          />
          <Button
            size="sm"
            onClick={() =>
              post("/api/games/control/force-chat", {
                game: forceGame,
                channelId: channelId || undefined,
              })
            }
          >
            Start
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Add trivia</h3>
        <div className="space-y-2">
          <input
            placeholder="Channel ID"
            value={triviaCh}
            onChange={(e) => setTriviaCh(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-white"
          />
          <input
            placeholder="Question"
            value={triviaQ}
            onChange={(e) => setTriviaQ(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-white"
          />
          <input
            placeholder="Answer"
            value={triviaA}
            onChange={(e) => setTriviaA(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-white"
          />
          <Button
            size="sm"
            onClick={() =>
              post("/api/games/control/add-trivia", {
                channelId: triviaCh,
                question: triviaQ,
                answer: triviaA,
              })
            }
          >
            Add question
          </Button>
        </div>
      </Card>

      {msg && <p className="text-sm text-accent-light">{msg}</p>}
    </div>
  );
}
