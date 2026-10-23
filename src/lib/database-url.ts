import { z } from "zod";

const postgresUrlSchema = z
  .url()
  .refine(
    (value) => /^postgres(ql)?:/.test(value),
    "DATABASE_URL debe ser PostgreSQL",
  );

const legacyStrictModes = new Set(["prefer", "require", "verify-ca"]);

export function normalizeDatabaseUrl(value: unknown) {
  const url = new URL(postgresUrlSchema.parse(value));
  const sslMode = url.searchParams.get("sslmode");

  if (sslMode && legacyStrictModes.has(sslMode)) {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}
