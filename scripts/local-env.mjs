import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
try {
  const example = await readFile(".env.example", "utf8");
  await writeFile(
    ".env",
    example.replace(
      "AUTH_SECRET=\n",
      `AUTH_SECRET=${randomBytes(32).toString("hex")}\n`,
    ),
    { flag: "wx", mode: 0o600 },
  );
  console.log("Configuración local creada sin mostrar secretos.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Se conserva la configuración local existente.");
}
