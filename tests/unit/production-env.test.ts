import { describe, expect, it } from "vitest";
import { productionEnvSchema } from "../../scripts/production-env";

const valid = {
  DATABASE_URL:
    "postgresql://app:password@database.example.com:5432/reporadar?sslmode=require",
  AUTH_SECRET: "a".repeat(64),
  NEXTAUTH_URL: "https://reporadar.example.com",
  AUTH_GITHUB_ID: "github-client-id",
  AUTH_GITHUB_SECRET: "github-client-secret",
  DEMO_ENABLED: "false",
};

describe("configuración de producción", () => {
  it("acepta una configuración completa sin exponer valores", () => {
    expect(productionEnvSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    "postgresql://app:password@localhost:5432/reporadar",
    "postgresql://app:password@database.example.com:5432/reporadar_test",
    "https://database.example.com/reporadar",
  ])("rechaza DATABASE_URL no apta para producción", (DATABASE_URL) => {
    expect(
      productionEnvSchema.safeParse({ ...valid, DATABASE_URL }).success,
    ).toBe(false);
  });

  it("exige un origen HTTPS canónico y no local", () => {
    for (const NEXTAUTH_URL of [
      "http://reporadar.example.com",
      "https://localhost",
      "https://reporadar.example.com/ruta",
      "https://reporadar.example.com?debug=true",
    ])
      expect(
        productionEnvSchema.safeParse({ ...valid, NEXTAUTH_URL }).success,
      ).toBe(false);
  });

  it("exige secreto fuerte y las dos credenciales OAuth", () => {
    for (const override of [
      { AUTH_SECRET: "corto" },
      { AUTH_GITHUB_ID: "" },
      { AUTH_GITHUB_SECRET: "" },
    ])
      expect(
        productionEnvSchema.safeParse({ ...valid, ...override }).success,
      ).toBe(false);
  });
});
