import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL ?? "./data/compliance.db";
  const resolved = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return resolved;
}

const globalForDb = globalThis as unknown as {
  __complianceSqlite?: Database.Database;
  __complianceDb?: ReturnType<typeof drizzle>;
};

export function getSqlite(): Database.Database {
  if (!globalForDb.__complianceSqlite) {
    const dbPath = resolveDbPath();
    const sqlite = new Database(dbPath);
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("journal_mode = WAL");
    globalForDb.__complianceSqlite = sqlite;
  }
  return globalForDb.__complianceSqlite;
}

export function getDb() {
  if (!globalForDb.__complianceDb) {
    globalForDb.__complianceDb = drizzle(getSqlite(), { schema });
  }
  return globalForDb.__complianceDb;
}

export * from "./schema";
