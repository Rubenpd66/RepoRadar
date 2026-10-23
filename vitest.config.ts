import { defineConfig } from "vitest/config";
import "dotenv/config";
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
