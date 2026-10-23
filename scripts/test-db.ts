import "dotenv/config";
import { spawnSync } from "node:child_process";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "Configura TEST_DATABASE_URL con una base aislada cuyo nombre termine en _test",
  );
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/prisma-wasm.ts", "migrate"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } },
);
process.exit(result.status ?? 1);
