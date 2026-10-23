# Operación y despliegue

## Producción actual

La aplicación está desplegada públicamente en `https://reporadar-rubenpd66-6093s-projects.vercel.app` mediante el proyecto Vercel `rubenpd66-6093s-projects/reporadar`, conectado a la rama `main` de GitHub. Usa Node 24, Next.js 16 y una base PostgreSQL gestionada por Neon. `vercel.json` fuerza la instalación reproducible con `npm ci` y `prebuild` genera Prisma antes de cada build.

La producción no exige autenticación de Vercel; los previews sí permanecen protegidos. `DEMO_ENABLED=false` en producción. OAuth de GitHub solo está configurado para producción: los previews no reciben sus credenciales ni deben reutilizar su callback. La aplicación usa la conexión agrupada de Neon para el tráfico normal y la conexión directa únicamente para migraciones y tareas administrativas. Normaliza los modos TLS heredados de `pg` a `verify-full`, manteniendo explícita la comprobación de identidad del servidor.

## Preparar una entrega

1. Crea la base con TLS, backups y un usuario con privilegios mínimos. Usa un endpoint directo para migraciones cuando el proveedor lo requiera.
2. Configura `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_SECRET` como secretos y `NEXTAUTH_URL`, `AUTH_GITHUB_ID`, `DEMO_ENABLED` con el alcance mínimo necesario. En el entorno actual, Vercel gestiona estas variables y la integración de Neon proporciona las URLs de conexión. No reutilices la OAuth App de producción en previews.
3. Ejecuta `npm run deploy:check` con las variables del entorno objetivo. No conecta a servicios ni muestra secretos: rechaza bases locales/de prueba, un origen que no sea HTTPS, un secreto débil y OAuth incompleto.
4. Autoriza los destinos npm, GitHub y, si usas el CLI nativo, binaries.prisma.sh. Instala con `npm ci` y genera el cliente (`npm run db:generate`). Las herramientas de migración/generación son dependencias de desarrollo y deben existir en la etapa de build/release.
5. Antes de cambiar el esquema, toma una copia recuperable y revisa el SQL. Ejecuta `npm run db:migrate` como paso de release único, nunca en cada build paralelo. El comando WASM usa APIs internas fijadas; el CLI estándar está disponible como `npm run db:migrate:native` cuando pueda descargarse su motor verificado.
6. Ejecuta `npm run build`. En un servidor Node persistente, usa `npm run start -- --port PUERTO`; una plataforma Next puede gestionar su propio arranque. La integración Git de Vercel despliega `main`; confirma primero los checks y evita desplegar el mismo commit de nuevo desde CI.
7. Configura el callback OAuth `https://DOMINIO/api/auth/callback/github`. GitHub OAuth Apps admiten un callback configurado: usa un dominio estable y una aplicación distinta para staging, o deja OAuth deshabilitado en previews variables. Valida login y cierre de sesión con una cuenta real, búsqueda, guardado, recarga y aislamiento con dos cuentas.
8. Comprueba `/api/health`, logs de errores sin datos sensibles y funcionamiento tras reiniciar. Prueba también el cierre de acceso a rutas privadas sin sesión.

El modo conectado no usa un token global secreto para la búsqueda: parte de acceso público y respeta los límites observados. Si el volumen exige más capacidad, diseña autenticación de GitHub App para servicio con su propio control de acceso, sin compartir tokens de usuarios.

## Backups y restauración

Usa los backups/PITR del proveedor y comprueba una restauración en una base separada. Para una copia lógica manual, con las URLs configuradas de forma segura en la terminal:

```bash
pg_dump --format=custom --file=reporadar.dump "$DATABASE_URL"
# RESTORE_DATABASE_URL debe apuntar exclusivamente a una base de restauración nueva.
pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" reporadar.dump
```

No guardes dumps en Git: contienen datos privados. Cífralos, limita su acceso y aplica una retención adecuada. Tras restaurar, comprueba migraciones, salud y datos con un entorno aislado antes de apuntar producción a esa base. Nunca pruebes restauraciones destructivas sobre producción.

## Reversión

Conserva el artefacto de aplicación previo y aplica cambios de esquema compatibles hacia adelante. Revertir código no revierte automáticamente una migración. Si el SQL fuera incompatible, detén las escrituras, valida una migración correctiva o restaura una copia en otra base y planifica el cambio de conexión. No uses migrate reset en producción ni edites migraciones aplicadas.

## Mantenimiento

- Programa `npm run demo:cleanup`: elimina identidades demo de más de 48 horas y sus datos en cascada; no usuarios GitHub ni el seed.
- Revisa errores de red, tiempos de respuesta y eventos de límite sin registrar notas, cookies ni tokens.
- Actualiza dependencias mediante PRs pequeñas, conservando el lockfile y ejecutando CI. Actualiza paquetes Prisma como conjunto.
- La caché de GitHub solo contiene datos públicos y perderla afecta rendimiento, no aislamiento. En cambio, los presupuestos de GitHub y los límites de escritura/demo son controles por proceso: con varias réplicas o funciones el total puede multiplicarse. Antes de ese modelo, usa un almacén compartido con operaciones atómicas y TTL o límites equivalentes en la plataforma por ruta, identidad y red. Mantén también el manejo de `Retry-After` como autoridad frente a GitHub.
- En Vercel, conserva las variables por entorno; trata `DATABASE_URL`, `AUTH_SECRET` y `AUTH_GITHUB_SECRET` como Secret. Los previews actuales comparten la integración de base pero no OAuth; no los uses con datos reales. Para aislamiento completo, asigna una rama/base Neon exclusiva a Preview. La integración Git construye los despliegues y CI aporta pruebas y checks, sin desplegar dos veces el mismo commit.
- La base Docker local es para desarrollo. Los snapshots cloud no garantizan retener volúmenes del daemon; no los uses como backup.

## Criterio de salida

No promociones producción hasta que todos estos puntos estén comprobados:

- `npm run deploy:check`, migraciones, `npm run check` y E2E pasan contra entornos aislados.
- OAuth real funciona con el callback exacto y dos cuentas no pueden leer ni modificar datos entre sí.
- La restauración se ha ensayado en otra base y existe un procedimiento de reversión del código.
- La demo está desactivada o su limpieza y límite de creación están operativos.
- Si hay escalado horizontal, los límites compartidos/plataforma están activos; la memoria del proceso no se presenta como límite global.
