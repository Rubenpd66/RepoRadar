import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "../../src/lib/database-url";

describe("URL de PostgreSQL", () => {
  it.each(["prefer", "require", "verify-ca"])(
    "conserva la verificación estricta de TLS para sslmode=%s",
    (sslMode) => {
      const result = new URL(
        normalizeDatabaseUrl(
          `postgresql://app:password@database.example.com/reporadar?sslmode=${sslMode}&channel_binding=require`,
        ),
      );

      expect(result.searchParams.get("sslmode")).toBe("verify-full");
      expect(result.searchParams.get("channel_binding")).toBe("require");
    },
  );

  it("conserva otros modos TLS y URLs locales sin ese parámetro", () => {
    expect(
      new URL(
        normalizeDatabaseUrl(
          "postgresql://localhost/reporadar?sslmode=disable",
        ),
      ).searchParams.get("sslmode"),
    ).toBe("disable");
    expect(normalizeDatabaseUrl("postgresql://localhost/reporadar")).toBe(
      "postgresql://localhost/reporadar",
    );
  });

  it("rechaza protocolos que no sean PostgreSQL", () => {
    expect(() =>
      normalizeDatabaseUrl("https://database.example.com/reporadar"),
    ).toThrow("DATABASE_URL debe ser PostgreSQL");
  });
});
