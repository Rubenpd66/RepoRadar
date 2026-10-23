import { chmod, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

export function addAuthSecret(contents, secret) {
  const match = contents.match(/^AUTH_SECRET=([^\r\n]*)/m);
  if (!match) throw new Error("Falta AUTH_SECRET en .env.example o .env");
  if (match[1].trim()) return { contents, changed: false };

  return {
    contents: contents.replace(
      /^AUTH_SECRET=[\t ]*(\r?)$/m,
      `AUTH_SECRET=${secret}$1`,
    ),
    changed: true,
  };
}

function newSecret() {
  return randomBytes(32).toString("hex");
}

export async function ensureLocalEnv() {
  try {
    const current = await readFile(".env", "utf8");
    const result = addAuthSecret(current, newSecret());
    if (!result.changed) {
      console.log("Se conserva la configuración local existente.");
      return;
    }

    await writeFile(".env", result.contents, { mode: 0o600 });
    await chmod(".env", 0o600);
    console.log("Configuración local reparada sin mostrar secretos.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;

    const example = await readFile(".env.example", "utf8");
    const result = addAuthSecret(example, newSecret());
    await writeFile(".env", result.contents, { flag: "wx", mode: 0o600 });
    console.log("Configuración local creada sin mostrar secretos.");
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await ensureLocalEnv();
}
