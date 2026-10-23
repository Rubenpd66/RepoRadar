# RepoRadar

Trabaja en el checkout existente, sin crear worktrees. Node 24 y npm; usa npm ci.
Lee README.md y docs/architecture.md. No imprimas secretos. No uses datos de demostración como respaldo silencioso de GitHub.
Comandos: npm run dev, npm run lint, npm run typecheck, npm test, npm run build, npm run test:e2e.
Las pruebas de integración requieren TEST_DATABASE_URL de una base cuyo nombre termine en _test; nunca uses la base de desarrollo para ellas.
Toda operación privada exige identidad y filtro userId en el servidor. Valida entradas con Zod. No almacenes tokens OAuth. Mantén contenido externo como texto seguro.
No publiques ni crees servicios de pago sin autorización. Actualiza documentación y pruebas al cambiar comportamiento.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
