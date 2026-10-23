// Explicit, version-pinned fallback for environments that cannot download native engines.
// Uses Prisma's own npm-distributed WASM engine; never disables integrity checks.
import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as runtime from "@prisma/schema-engine-wasm/schema_engine_bg";
import internals from "@prisma/internals";
const { getGenerators, loadSchemaContext } = internals;
import { defaultRegistry } from "@prisma/client-generator-registry";
import { bindMigrationAwareSqlAdapterFactory } from "@prisma/driver-adapter-utils";
import { PrismaPg } from "@prisma/adapter-pg";
const command = process.argv[2];
if (command === "generate") {
  const generators = await getGenerators({
    schemaPath: "prisma/schema.prisma",
    registry: defaultRegistry.toInternal(),
    skipDownload: true,
    cliCommand: "prisma",
  });
  try {
    for (const generator of generators) await generator.generate();
    console.log("Cliente Prisma generado con paquetes npm verificados.");
  } finally {
    for (const generator of generators) generator.stop();
  }
} else if (command === "migrate") {
  const schemaContext = await loadSchemaContext({
    schemaPath: { cliProvidedPath: "prisma/schema.prisma" },
  });
  const adapter = bindMigrationAwareSqlAdapterFactory(
    new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      idleTimeoutMillis: 1000,
      allowExitOnIdle: true,
    }),
  );
  const wasmPath = path.join(
    path.dirname(
      fileURLToPath(import.meta.resolve("@prisma/schema-engine-wasm")),
    ),
    "schema_engine_bg.wasm",
  );
  const wasmModule = new WebAssembly.Module(await readFile(wasmPath));
  const instance = new WebAssembly.Instance(wasmModule, {
    "./schema_engine_bg.js": runtime,
  });
  (
    runtime as typeof runtime & {
      __wbg_set_wasm: (exports: WebAssembly.Exports) => void;
    }
  ).__wbg_set_wasm(instance.exports);
  (instance.exports.__wbindgen_start as () => void)();
  const engine = await runtime.SchemaEngine.new(
    { datamodels: schemaContext.schemaFiles },
    () => {},
    adapter,
  );
  const baseDir = path.resolve("prisma/migrations");
  const filters = { externalTables: [], externalEnums: [] };
  try {
    const directories = (await readdir(baseDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const migrationsList = {
      baseDir,
      lockfile: {
        path: "migration_lock.toml",
        content: await readFile(
          path.join(baseDir, "migration_lock.toml"),
          "utf8",
        ),
      },
      shadowDbInitScript: "",
      migrationDirectories: await Promise.all(
        directories.map(async (dir) => ({
          path: dir,
          migrationFile: {
            path: "migration.sql",
            content: {
              tag: "ok" as const,
              value: await readFile(
                path.join(baseDir, dir, "migration.sql"),
                "utf8",
              ),
            },
          },
        })),
      ),
    };
    const history = await engine.diagnoseMigrationHistory({
      migrationsList,
      optInToShadowDatabase: false,
      filters,
    });
    if (
      history.failedMigrationNames.length ||
      history.editedMigrationNames.length
    )
      throw new Error(
        "Hay migraciones fallidas o modificadas. Revisa el historial antes de continuar.",
      );
    console.log(await engine.applyMigrations({ migrationsList, filters }));
  } finally {
    engine.free();
  }
} else throw new Error("Usa generate o migrate");
