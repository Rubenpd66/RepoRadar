import { describe, it, expect } from "vitest";
import {
  searchSchema,
  buildQuery,
  assess,
  prSchema,
  updateSchema,
  preferencesSchema,
} from "../../src/lib/domain";
import { demoOpportunities, searchDemo } from "../../src/lib/demo";
import { signDemo, verifyDemo } from "../../src/lib/demo-token";
describe("búsqueda y recomendaciones", () => {
  it("limita consultas y páginas", () => {
    expect(searchSchema.safeParse({ page: 51 }).success).toBe(false);
    expect(searchSchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
    expect(searchSchema.safeParse({ language: "invalid" }).success).toBe(false);
  });
  it("genera filtros de GitHub y fecha, citando texto libre", () => {
    const q = buildQuery(
      searchSchema.parse({
        q: 'is:closed "hello"',
        language: "TypeScript",
        days: "7",
      }),
      new Date("2026-10-23"),
    );
    expect(q).toContain("is:open");
    expect(q).toContain('"is:closed  hello "');
    expect(q).toContain("updated:>=2026-10-16");
    expect(q).toContain("language:TypeScript");
  });
  it("explica coincidencias y no declara dificultad garantizada", () => {
    const result = assess(demoOpportunities[0], {
      languages: ["TypeScript"],
      technologies: ["React"],
      interests: [],
    });
    expect(result.difficulty).toBe("Primeros pasos");
    expect(result.reasons).toContain("Coincide con tu interés: TypeScript.");
    expect(result.rank).toBe(3);
  });
  it("filtra y pagina ejemplos sin atribuirlos a GitHub", () => {
    const result = searchDemo(
      searchSchema.parse({ source: "demo", language: "TypeScript" }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0].source).toBe("demo");
    expect(
      searchDemo(searchSchema.parse({ source: "demo", page: 2 })).items,
    ).toHaveLength(0);
  });
  it("valida PR y datos de usuario", () => {
    expect(
      prSchema.safeParse("https://github.com/org/repo/pull/1").success,
    ).toBe(true);
    for (const url of [
      "http://localhost/a",
      "https://github.com.evil.com/a/b/pull/1",
      "https://github.com/a/b/issues/1",
      "https://github.com/a/b/pull/0",
      "javascript:alert(1)",
    ])
      expect(prSchema.safeParse(url).success).toBe(false);
    expect(
      updateSchema.safeParse({ id: "x", status: "ROOT", notes: "", prUrl: "" })
        .success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({
        languages: Array(16).fill("Go"),
        technologies: [],
        interests: [],
      }).success,
    ).toBe(false);
  });
});
describe("sesión demo firmada", () => {
  const id = "demo-12345678-1234-1234-1234-123456789abc",
    secret = "a".repeat(64);
  it("acepta token válido y rechaza manipulación, expiración y otro secreto", () => {
    const token = signDemo(id, secret, 1000);
    expect(verifyDemo(token, secret, 1001)).toBe(id);
    expect(
      verifyDemo(token.replace("12345678", "87654321"), secret, 1001),
    ).toBeNull();
    expect(verifyDemo(token, secret, 86401001)).toBeNull();
    expect(verifyDemo(token, "b".repeat(64), 1001)).toBeNull();
    expect(verifyDemo("a.b.c", secret)).toBeNull();
  });
});
