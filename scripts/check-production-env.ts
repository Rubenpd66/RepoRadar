import "dotenv/config";
import { productionEnvSchema } from "./production-env";

const result = productionEnvSchema.safeParse(process.env);

if (!result.success) {
  console.error("La configuración de producción no está lista:");
  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  const callback = new URL(
    "/api/auth/callback/github",
    result.data.NEXTAUTH_URL,
  );
  console.log("Configuración de producción válida sin mostrar secretos.");
  console.log(`Callback OAuth esperado: ${callback.href}`);
  if (result.data.DEMO_ENABLED === "true")
    console.log(
      "Aviso: la demo está activa; programa demo:cleanup y limita su creación en la plataforma.",
    );
}
