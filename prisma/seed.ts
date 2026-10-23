import "dotenv/config";
import { db } from "../src/lib/db";
import { saveOpportunity } from "../src/lib/service";
import { demoOpportunities } from "../src/lib/demo";
async function main() {
  const user = await db.user.upsert({
    where: { id: "seed-demo" },
    create: {
      id: "seed-demo",
      name: "Ejemplo de datos · sin acceso de sesión",
      demo: true,
    },
    update: {},
  });
  for (const item of demoOpportunities) await saveOpportunity(user.id, item);
  console.log(
    "Seed de ejemplos preparado de forma idempotente. Este usuario no tiene acceso de sesión.",
  );
}
main()
  .catch(() => {
    console.error(
      "No se ha podido preparar el seed. Comprueba la base de datos.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
