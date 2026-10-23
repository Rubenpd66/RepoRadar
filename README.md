# RepoRadar

**Discover. Learn. Contribute.** Encuentra issues públicos de GitHub, conviértelos en un plan de aprendizaje y sigue tu progreso.

Aplicación en español con Next.js 16 / React 19 / TypeScript estricto, Tailwind 4, PostgreSQL 17, Prisma 7, autenticación GitHub con Auth.js/NextAuth 4 estable, Vitest y Playwright. Las versiones exactas están en `package-lock.json`.

## Qué puedes hacer

- Explorar issues abiertos por texto, lenguaje, etiqueta, actividad y orden, con paginación.
- Consultar descripción segura, fuentes e instrucciones de contribución disponibles.
- Guardar oportunidades; editar notas privadas, estado, checklist y URL de PR.
- Definir intereses y ver recomendaciones explicadas dentro de cada página.
- Ver progreso manual, actividad reciente y lenguajes de las oportunidades guardadas.
- Consultar el estado público de una PR sin escribir en GitHub ni alterar tu seguimiento manual.
- Probar una demostración explícita con ejemplos ficticios y un espacio aislado por navegador.

No se utiliza IA generativa ni se necesita un servicio de pago. Los criterios de encaje se basan en etiquetas y coincidencias de texto; no garantizan dificultad ni aceptación de contribuciones.

## Inicio desde un clon limpio

Requisitos: Node **24**, npm y Docker con Compose. Usa el checkout existente en los entornos cloud.

```bash
npm ci
node scripts/local-env.mjs
# Elige una opción de base de datos:
bash scripts/local-db.sh             # Docker local, incluye la base de pruebas
# o: docker compose up -d db          # desarrollo local con volumen de Compose
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Los comandos se ejecutan en la raíz del repositorio. `local-env.mjs` crea `.env` con un secreto aleatorio y permisos restrictivos; conserva los valores existentes y repara un `AUTH_SECRET` vacío. El seed es idempotente y crea un usuario de ejemplo sin acceso de sesión. Al entrar en demostración se crea un espacio nuevo; no se inicia sesión como el usuario del seed.

En Windows sin una distribución WSL, ejecuta `scripts/local-db.sh` desde Git Bash. Desde PowerShell con Git en su ruta predeterminada puedes usar `& 'C:\Program Files\Git\bin\bash.exe' scripts/local-db.sh`; el `bash.exe` incluido por Windows puede ser solo el puente de WSL y fallará si no hay una distribución instalada.

`local-db.sh` usa el nombre reservado `reporadar-db`; no lo ejecutes si tienes un contenedor ajeno con ese nombre. No uses simultáneamente este script y Compose: ambos reservan el puerto local 5432. Con Compose, crea también la base de pruebas cuando la necesites: `docker compose exec db createdb -U reporadar reporadar_test` (solo si aún no existe).

### Variables

Consulta `.env.example`. Nunca subas `.env` ni credenciales a Git.

| Variable                              | Uso                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                        | PostgreSQL de desarrollo o producción; usa TLS y credenciales propias fuera de local.               |
| `TEST_DATABASE_URL`                   | Base aislada con nombre terminado en `_test`; obligatoria para integración/E2E.                     |
| `AUTH_SECRET`                         | Secreto local aleatorio de al menos 32 caracteres para JWT y firma de demo.                         |
| `NEXTAUTH_URL`                        | Origen canónico de la aplicación.                                                                   |
| `AUTH_GITHUB_ID`                      | Client ID de una OAuth App de GitHub, opcional para demo/explorador.                                |
| `AUTH_GITHUB_SECRET`                  | Client secret de esa OAuth App; introducir mediante configuración segura.                           |
| `DEMO_ENABLED`                        | `true` habilita ejemplos y sesiones demo de 24 horas. Desactívalo si no lo necesitas en producción. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Opcional: Chromium ya instalado, por ejemplo `/usr/bin/chromium`.                                   |

La búsqueda pública no necesita tokens de usuario. No se guardan access tokens OAuth. El proxy de la plataforma puede proporcionar su propia autenticación para peticiones de GitHub durante desarrollo; eso no se presupone en producción.

### OAuth GitHub

Crea tu propia GitHub OAuth App. Configura Home URL con el origen de la aplicación y callback `ORIGEN/api/auth/callback/github`. Para desarrollo el origen habitual es `http://localhost:3000`; usa otra OAuth App para producción. Configura el Client ID y el Client Secret de esa aplicación y reinicia el servidor.

Solo solicitamos `read:user`. No pedimos acceso a repositorios privados ni permisos de escritura. El login usa JWT firmado/cifrado por la biblioteca y la identidad persistida se vincula por el ID de GitHub. Sin credenciales, el acceso muestra la configuración pendiente y permite la demostración. El login real debe comprobarse con una OAuth App propia; no está simulado como si hubiera sido verificado.

## Prisma en este entorno

El proxy bloqueó la descarga del motor nativo en `binaries.prisma.sh`. Los comandos `db:generate` y `db:migrate` usan **los generadores y el motor WASM oficiales distribuidos por npm**, con sus versiones fijadas e integridad del lockfile. No se desactiva TLS, la comprobación de checksums ni la validación del esquema.

El adaptador de `scripts/prisma-wasm.ts` usa APIs internas de Prisma: actualiza todos los paquetes Prisma conjuntamente y ejecuta migraciones/pruebas al actualizar. Aplica el historial estándar `_prisma_migrations` y rechaza migraciones editadas o fallidas. Su alcance es generación de cliente y aplicación de migraciones versionadas. La introspección de esquema por WASM se probó y falló por un tipo interno `char` de PostgreSQL; no se incluye como comprobación de disponibilidad.

También están disponibles `npm run db:generate:native` y `npm run db:migrate:native` para entornos con acceso al motor nativo. Para crear nuevas migraciones con el CLI, usa `npx prisma migrate dev --name descripcion` contra una base de desarrollo, nunca producción. Revisa el SQL antes de publicarlo. No modifiques migraciones que ya se hayan aplicado.

## Comprobaciones

```bash
npm run db:prepare-test
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Si Chromium está preinstalado: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Playwright arranca y detiene su propio servidor de **producción** en el puerto 3100, utilizando la base de pruebas. No reutiliza un servidor ajeno.

Las pruebas de integración verifican persistencia, unicidad, cascadas, IDs de GitHub de más de 32 bits y aislamiento de dos usuarios en listas, cambios, borrados y tareas. Las unitarias simulan GitHub para comprobar caché, deduplicación, filtros, errores, timeout y límites. Las E2E recorren guardado, planificación, preferencias, persistencia tras recarga, otro navegador sin acceso y vista móvil. CI no depende de GitHub ni de OAuth externos.

La integración real se comprueba aparte y no se sustituye silenciosamente por ejemplos. El workflow de GitHub Actions está preparado y la ejecución remota del commit inicial está registrada en `docs/validation.md`.

Antes de desplegar, inyecta las variables del entorno objetivo desde su gestor de secretos y ejecuta `npm run deploy:check`. El comando valida la URL PostgreSQL de producción, el origen HTTPS, el secreto y el par OAuth sin imprimir sus valores. Rechaza bases locales y nombres terminados en `_test`.

## Operación y despliegue

Consulta [operación y despliegue](docs/operations.md), [arquitectura](docs/architecture.md) y [validación](docs/validation.md).

La producción pública está disponible en [reporadar-rubenpd66-6093s-projects.vercel.app](https://reporadar-rubenpd66-6093s-projects.vercel.app). Usa Vercel con Node 24 y PostgreSQL gestionado por Neon; la demo está desactivada en producción y los previews permanecen protegidos por autenticación de Vercel.

En cloud, `bash scripts/cloud-install.sh` instala y prepara las bases locales; `bash scripts/cloud-start.sh` arranca el flujo de desarrollo. Los scripts no crean recursos externos ni despliegan. Los procesos deben reiniciarse en tareas futuras. Los volúmenes Docker no deben asumirse incluidos en snapshots de la plataforma: si hay que recrear la base local se reaplican migraciones. Para datos duraderos externos, usa una base gestionada con copias de seguridad.

## Aprender con RepoRadar

| Fase             | Qué estudiar                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| Base             | App Router, componentes de servidor, configuración y migraciones.            |
| Flujo vertical   | Integración REST, validación y recorrido completo antes de añadir funciones. |
| Espacio personal | Modelado relacional, autorización por propietario y acciones de servidor.    |
| Fiabilidad       | Caché, límites, timeouts, errores y pruebas deterministas.                   |
| Entrega          | Build, E2E sobre producción, CI, secretos, backups y mantenimiento.          |

## Límites actuales

- La publicación automática desde `main` está conectada a Vercel. Los cambios de esquema siguen requiriendo un paso de migración explícito con el endpoint directo de Neon; no se ejecutan dentro de builds paralelos.
- Caché y presupuestos de solicitudes viven por proceso. Antes de escalar a varias réplicas, añade almacenamiento compartido y límites de acceso en la plataforma.
- Los ejemplos son ficticios; no se abren repositorios ni se envían contribuciones en su nombre.
- Las notas y los estados son privados y manuales. El estado consultado de una PR se muestra por separado.
- El contenido externo se muestra como texto; no se interpreta HTML ni Markdown arbitrario.
- Los datos demo caducan para autenticación a las 24 horas. Programa `npm run demo:cleanup` para eliminarlos después de 48 horas; nunca borra usuarios OAuth.
