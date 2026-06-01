import { mkdir, appendFile, open, stat } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";
import type { PermissionTier } from "@/lib/permissions";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorUsername?: string;
  tier: PermissionTier;
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  success: boolean;
  error?: string;
}

const AUDIT_DIR = path.join(process.cwd(), "data", "audit");
const AUDIT_FILE = path.join(AUDIT_DIR, "audit.jsonl");

async function ensureAuditDir() {
  await mkdir(AUDIT_DIR, { recursive: true });
}

export async function logAudit(entry: Omit<AuditEntry, "id" | "timestamp">) {
  await ensureAuditDir();
  const full: AuditEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  await appendFile(AUDIT_FILE, JSON.stringify(full) + "\n", "utf-8");
  return full;
}

async function tailLines(filePath: string, limit: number): Promise<string[]> {
  const { size } = await stat(filePath);
  if (size === 0) return [];

  const chunkSize = Math.min(size, 256 * 1024);
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(chunkSize);
    await handle.read(buffer, 0, chunkSize, size - chunkSize);
    const text = buffer.toString("utf-8");
    const lines = text.split("\n").filter(Boolean);
    if (chunkSize < size && lines.length) lines.shift();
    return lines.slice(-limit);
  } finally {
    await handle.close();
  }
}

export async function getRecentAudit(limit = 100): Promise<AuditEntry[]> {
  try {
    const fileStat = await stat(AUDIT_FILE);
    if (fileStat.size < 512 * 1024) {
      const lines = await tailLines(AUDIT_FILE, limit);
      return lines
        .map((line) => JSON.parse(line) as AuditEntry)
        .reverse();
    }

    const lines: string[] = [];
    const stream = createReadStream(AUDIT_FILE, {
      encoding: "utf-8",
      start: Math.max(0, fileStat.size - 512 * 1024),
    });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (line.trim()) lines.push(line);
    }
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line) as AuditEntry)
      .reverse();
  } catch {
    return [];
  }
}

export function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}
