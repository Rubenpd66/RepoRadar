import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl } from "@/lib/database-url";
const globalDb = globalThis as unknown as { db?: PrismaClient };
export function databaseUrl() {
  return normalizeDatabaseUrl(process.env.DATABASE_URL);
}
export const db =
  globalDb.db ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl() }),
  });
if (process.env.NODE_ENV !== "production") globalDb.db = db;
