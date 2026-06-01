import type { QueryValues } from "mysql2";
import mysql from "mysql2/promise";

let writePool: mysql.Pool | null = null;

export function getWritePool(): mysql.Pool | null {
  const user = process.env.DB_WRITE_USER || process.env.DB_USER;
  const password = process.env.DB_WRITE_PASSWORD || process.env.DB_PASSWORD;
  if (!process.env.DB_HOST || !user || !process.env.DB_NAME) return null;

  if (!writePool) {
    writePool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user,
      password,
      database: process.env.DB_NAME,
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
