# Operación y despliegue

## Preparar producción

Destino propuesto: una plataforma compatible con Next.js/Node 24 y PostgreSQL gestionado, por ejemplo Vercel con una base compatible. No se han creado cuentas, recursos, dominios ni despliegues.

1. Crea la base con TLS, backups y un usuario con privilegios mínimos. Usa un endpoint directo para migraciones cuando el proveedor lo requiera.
2. Configura DATABASE_URL, AUTH_SECRET aleatorio, NEXTAUTH_URL con HTTPS y las credenciales de tu OAuth App. Usa el gestor de secretos de la plataforma. Desactiva DEMO_ENABLED si no vas a ofrecer demostración.
3. Autoriza los destinos npm, GitHub y, si usas el CLI nativo, binaries.prisma.sh. Instala con `npm ci` y genera el cliente (`npm run db:generate`). Las herramientas de migración/generación son dependencias de desarrollo y deben existir en la etapa de build/release.
4. Antes de cambiar el esquema, toma una copia recuperable y revisa el SQL. Ejecuta `npm run db:migrate` como paso de release único. El comando WASM usa APIs internas fijadas; el CLI estándar está disponible como `npm run db:migrate:native` cuando pueda descargarse su motor verificado.
5. Ejecuta `npm run build`. En un servidor Node persistente, usa `npm run start -- --port PUERTO`; una plataforma Next puede gestionar su propio arranque.
6. Configura el callback OAuth `https://DOMINIO/api/auth/callback/github`. Valida login y cierre de sesión con una cuenta real, búsqueda, guardado, recarga y aislamiento con dos cuentas.
7. Comprueba `/api/health`, logs de errores sin datos sensibles y funcionamiento tras reiniciar. Prueba también el cierre de acceso a rutas privadas sin sesión.

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
- Antes de varias réplicas, mueve caché/presupuestos a un servicio compartido y añade límites por identidad/red en la plataforma. La memoria por proceso se reinicia en cada despliegue.
- La base Docker local es para desarrollo. Los snapshots cloud no garantizan retener volúmenes del daemon; no los uses como backup.
