"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getBotById } from "@/lib/bots/registry";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfigEditorProps {
  botId: string;
  canEdit: boolean;
  initialPath?: string | null;
}

export function ConfigEditor({ botId, canEdit, initialPath }: ConfigEditorProps) {
  const bot = getBotById(botId);
  const [selectedPath, setSelectedPath] = useState(
    initialPath || bot?.configFiles[0] || ""
  );

  useEffect(() => {
    if (!initialPath) return;
    const known = bot?.configFiles.includes(initialPath);
    if (known || initialPath.startsWith("assets/Configs/")) {
      setSelectedPath(initialPath);
    }
  }, [initialPath, bot]);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPath) return;
    setLoading(true);
    setError(null);
    fetch(`/api/bots/${botId}/config?path=${encodeURIComponent(selectedPath)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRaw(
          typeof data.content === "object"
            ? JSON.stringify(data.content, null, 2)
            : data.raw || ""
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [botId, selectedPath]);

  async function save() {
    setError(null);
    setSaved(false);
    let content: unknown;
    try {
      content = JSON.parse(raw);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const res = await fetch(
      `/api/bots/${botId}/config?path=${encodeURIComponent(selectedPath)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!bot) return null;

  return (
    <Card>
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        >
          {bot.configFiles.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        {canEdit && (
          <Button onClick={save} disabled={loading}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : "Save"}
          </Button>
        )}
      </div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        readOnly={!canEdit}
        spellCheck={false}
        className="h-[min(60vh,500px)] w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-xs text-white"
      />
      <p className="mt-2 text-xs text-muted">
        Backups are created automatically on save in the bot&apos;s .backups folder.
      </p>
    </Card>
  );
}
