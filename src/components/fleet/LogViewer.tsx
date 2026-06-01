"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LogViewerProps {
  botId: string;
}

export function LogViewer({ botId }: LogViewerProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lines: "200" });
      if (search) params.set("search", search);
      if (file) params.set("file", file);
      const res = await fetch(`/api/bots/${botId}/logs?${params}`);
      const data = await res.json();
      setLines(data.lines || []);
      setFiles(data.files || []);
      if (data.file && !file) setFile(data.file);
    } finally {
      setLoading(false);
    }
  }, [botId, search, file]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchLogs, 3000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-white"
          />
        </div>
        {files.length > 0 && (
          <select
            value={file || ""}
            onChange={(e) => setFile(e.target.value || null)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          >
            {files.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" variant="secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Live
        </label>
      </div>
      <pre className="mt-4 max-h-[60vh] overflow-auto rounded-lg bg-background p-4 font-mono text-xs leading-relaxed text-green-300/90">
        {lines.length ? lines.join("\n") : "No log lines."}
        <div ref={bottomRef} />
      </pre>
    </Card>
  );
}
