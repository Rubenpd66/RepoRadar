import { describe, expect, it } from "vitest";
import { addAuthSecret } from "../../scripts/local-env.mjs";

describe("configuración local", () => {
  const secret = "a".repeat(64);

  it.each(["\n", "\r\n"])(
    "rellena AUTH_SECRET vacío con finales de línea %j",
    (newline) => {
      const input = `DATABASE_URL=postgresql://localhost/app${newline}AUTH_SECRET=${newline}DEMO_ENABLED=true${newline}`;
      const result = addAuthSecret(input, secret);

      expect(result.changed).toBe(true);
      expect(result.contents).toContain(`AUTH_SECRET=${secret}${newline}`);
    },
  );

  it("conserva un secreto ya configurado", () => {
    const input = `AUTH_SECRET=${secret}\n`;

    expect(addAuthSecret(input, "b".repeat(64))).toEqual({
      contents: input,
      changed: false,
    });
  });

  it("rechaza plantillas sin AUTH_SECRET", () => {
    expect(() => addAuthSecret("DEMO_ENABLED=true\n", secret)).toThrow(
      "Falta AUTH_SECRET",
    );
  });
});
