import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
const globalDb = globalThis as unknown as { db?: PrismaClient };
export function databaseUrl() {
  return z
    .url()
    .refine(
      (v) => /^postgres(ql)?:/.test(v),
      "DATABASE_URL debe ser PostgreSQL",
    )
    .parse(process.env.DATABASE_URL);
}
export const db =
  globalDb.db ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl() }),
  });
if (process.env.NODE_ENV !== "production") globalDb.db = db;
