import { env, envInt } from "@/lib/env";
import type { QueryValues } from "mysql2";
import mysql from "mysql2/promise";

let writePool: mysql.Pool | null = null;

export function getWritePool(): mysql.Pool | null {
  const user = env("DB_WRITE_USER") || env("DB_USER");
  const password = env("DB_WRITE_PASSWORD") || env("DB_PASSWORD");
  if (!env("DB_HOST") || !user || !env("DB_NAME")) return null;

  if (!writePool) {
    writePool = mysql.createPool({
      host: env("DB_HOST") || "localhost",
      port: envInt("DB_PORT", 3306),
      user,
      password,
      database: env("DB_NAME"),
      waitForConnections: true,
      connectionLimit: 3,
    });
  }
  return writePool;
}

export async function writeQuery<T>(
  sql: string,
  params: QueryValues = []
): Promise<T> {
  const pool = getWritePool();
  if (!pool) throw new Error("Database write not configured");
  const [result] = await pool.query(sql, params);
  return result as T;
}

export function isWriteDbConfigured(): boolean {
  return !!getWritePool();
}
