import { mkdir, appendFile, readFile } from "fs/promises";
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

export async function getRecentAudit(limit = 100): Promise<AuditEntry[]> {
  try {
    const raw = await readFile(AUDIT_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
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
