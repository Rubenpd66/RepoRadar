import { z } from "zod";

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const databaseUrl = z
  .string()
  .min(1, "es obligatoria")
  .superRefine((value, ctx) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "debe ser una URL válida" });
      return;
    }
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:")
      ctx.addIssue({ code: "custom", message: "debe usar PostgreSQL" });
    if (localHosts.has(url.hostname))
      ctx.addIssue({
        code: "custom",
        message: "no puede apuntar a una base local en producción",
      });
    const databaseName = url.pathname.slice(1);
    if (!databaseName)
      ctx.addIssue({
        code: "custom",
        message: "debe incluir el nombre de la base",
      });
    if (databaseName.toLowerCase().endsWith("_test"))
      ctx.addIssue({
        code: "custom",
        message: "no puede usar una base de pruebas en producción",
      });
  });

const canonicalOrigin = z
  .string()
  .min(1, "es obligatorio")
  .superRefine((value, ctx) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "debe ser una URL válida" });
      return;
    }
    if (url.protocol !== "https:")
      ctx.addIssue({ code: "custom", message: "debe usar HTTPS" });
    if (localHosts.has(url.hostname))
      ctx.addIssue({
        code: "custom",
        message: "no puede usar un host local en producción",
      });
    if (
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    )
      ctx.addIssue({
        code: "custom",
        message: "debe contener solo el origen público",
      });
  });

export const productionEnvSchema = z.object({
  DATABASE_URL: databaseUrl,
  AUTH_SECRET: z.string().min(32, "debe tener al menos 32 caracteres"),
  NEXTAUTH_URL: canonicalOrigin,
  AUTH_GITHUB_ID: z.string().trim().min(1, "es obligatorio para OAuth real"),
  AUTH_GITHUB_SECRET: z
    .string()
    .trim()
    .min(1, "es obligatorio para OAuth real"),
  DEMO_ENABLED: z.enum(["true", "false"]),
});
