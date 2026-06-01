import { env, envInt } from "@/lib/env";
import type { QueryValues } from "mysql2";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env("DB_HOST") || "localhost",
      port: envInt("DB_PORT", 3306),
      user: env("DB_USER"),
      password: env("DB_PASSWORD"),
      database: env("DB_NAME"),
      waitForConnections: true,
      connectionLimit: 15,
      enableKeepAlive: true,
      connectTimeout: 5000,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
  }
  return pool;
}

export async function query<T>(
  sql: string,
  params: QueryValues = []
): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function queryOne<T>(
  sql: string,
  params: QueryValues = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export function isDbConfigured(): boolean {
  return !!(env("DB_HOST") && env("DB_USER") && env("DB_NAME"));
}
