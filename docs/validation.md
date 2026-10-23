# Validación del 23 de octubre de 2026

Evidencia obtenida en la validación cloud inicial. No equivale a publicación ni despliegue en producción; la fila de GitHub Actions se comprobó después contra el remoto público.

| Comprobación                                                 | Resultado                                                                                                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalación desde lockfile con `scripts/cloud-install.sh`    | Correcta; se conserva la configuración local existente.                                                                                               |
| Generación Prisma y migraciones en desarrollo y base aislada | Correctas mediante paquetes oficiales WASM; las tres migraciones se aplicaron también desde una base vacía y se verificó su reaplicación sin cambios. |
| Seed ejecutado dos veces                                     | Correcto; tres oportunidades para seed-demo, sin duplicados.                                                                                          |
| Lint y TypeScript estricto                                   | Correctos.                                                                                                                                            |
| Vitest                                                       | 24 pruebas unitarias/integración; todas pasan, ninguna omitida.                                                                                       |
| Playwright sobre build de producción                         | 2 pruebas; ambas pasan, ninguna omitida.                                                                                                              |
| Build de producción                                          | Correcto.                                                                                                                                             |
| Arranque mediante `scripts/cloud-start.sh`                   | Correcto; PostgreSQL, migraciones, Next y salud comprobados.                                                                                          |
| Integración real con GitHub                                  | Búsqueda de 20 issues, detalle y normas disponibles; guardado desde navegador en PostgreSQL y eliminación del dato temporal.                          |
| Vistas escritorio y móvil                                    | Revisión visual; sin desbordamiento horizontal en dashboard móvil ni errores JavaScript en el recorrido real.                                         |
| Auditoría npm de dependencias de producción                  | Cero vulnerabilidades reportadas en la ejecución realizada.                                                                                           |
| GitHub Actions remoto para `6f3d4d6`                         | Workflow `Checks` completado correctamente: https://github.com/Rubenpd66/RepoRadar/actions/runs/39982432008.                                          |

La integración comprueba aislamiento entre dos usuarios, incluidos intentos de editar, añadir tareas y eliminar oportunidades ajenas; también persistencia, PR, unicidad, cascadas y conservación de notas. La E2E comprueba otro navegador sin acceso al plan, recarga persistente, preferencias y tareas. Las respuestas de GitHub se simulan en las pruebas deterministas; la comprobación real se ejecutó por separado.

Se corrigieron dos problemas encontrados al validar: IDs de GitHub superiores a 32 bits y orden inestable de tareas con la misma fecha de creación. Hay pruebas de regresión para ambos.

## Revalidación local posterior

En el checkout Git real sobre Windows, con Node 24.22.0 y npm 11.19.1:

| Comprobación            | Resultado                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm ci`                | 599 paquetes instalados desde el lockfile; 0 vulnerabilidades reportadas.                               |
| Preparación local       | Corregido y probado `local-env.mjs` para LF/CRLF; genera o repara `AUTH_SECRET` sin mostrarlo.          |
| Docker y PostgreSQL 17  | Docker Desktop 29.9.2 operativo; imagen fijada por digest y bases `reporadar`/`reporadar_test` activas. |
| Migraciones Prisma WASM | Las tres migraciones se aplican desde cero en desarrollo y en la base aislada de pruebas.               |
| Seed                    | Ejecutado dos veces; conserva tres oportunidades sin duplicarlas.                                       |
| Lint y TypeScript       | Correctos.                                                                                              |
| Pruebas unitarias       | 33 pruebas en 5 archivos; todas pasan.                                                                  |
| Pruebas de integración  | 6 pruebas contra `reporadar_test`; todas pasan.                                                         |
| Build de producción     | Correcto con Next.js 16.4.3 y raíz de Turbopack explícita.                                              |
| Playwright              | 2 pruebas sobre servidor de producción y base aislada; ambas pasan.                                     |
| `deploy:check`          | Rechaza la configuración local y acepta una configuración de producción ficticia sin mostrar secretos.  |

La revalidación se registró en `022efb0`; el workflow remoto `Checks` terminó correctamente en la ejecución `39990512472`.

## Despliegue gestionado

El mismo 23 de octubre se creó el proyecto de producción en Vercel y su PostgreSQL gestionado en Neon. No se imprimieron ni versionaron credenciales.

| Comprobación                | Resultado                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuración de producción | `deploy:check` correcto con HTTPS, secreto independiente, OAuth completo y una base no local/no `_test`.                                    |
| PostgreSQL gestionado       | Conexión agrupada para la aplicación y directa para administración; TLS activo.                                                             |
| Migraciones                 | Las tres migraciones versionadas se aplicaron una vez; una segunda ejecución no encontró cambios.                                           |
| Build y despliegue          | Despliegue Vercel `dpl_2Bzfg7bjmBNoyUg3QDTc5tc4u6QG` en estado `READY`.                                                                     |
| Acceso público              | `/acceso` responde 200 sin autenticación de Vercel; los previews siguen protegidos.                                                         |
| Salud                       | `/api/health` responde 200 desde producción.                                                                                                |
| Interfaz                    | Título, encabezado y botón de GitHub presentes; sin errores de consola en la carga comprobada con Chromium.                                 |
| Inicio OAuth                | GitHub recibe `read:user`, `state` y el callback canónico `https://reporadar-rubenpd66-6093s-projects.vercel.app/api/auth/callback/github`. |
| Datos previos a OAuth       | Cero usuarios OAuth en Neon antes de la autorización real.                                                                                  |
| Persistencia OAuth          | El esquema gestionado no contiene columnas cuyo nombre indique token, secreto o contraseña.                                                 |
| TLS PostgreSQL              | La URL se normaliza a `sslmode=verify-full`; la conexión real a Neon responde y evita la advertencia de compatibilidad futura de `pg`.      |
| Logs                        | Sin fallos de aplicación en la ventana disponible. La advertencia TLS detectada quedó cubierta por la normalización y pruebas anteriores.   |

## Limitaciones y comprobaciones pendientes

- Falta registrar el resultado final del consentimiento OAuth con una cuenta real y confirmar la creación de esa identidad en Neon. El inicio del flujo y el callback exacto sí están validados.
- El motor nativo de Prisma no pudo descargarse por la política de red. La generación y las migraciones se verificaron con el motor WASM oficial distribuido por npm. La introspección adicional de esquema por WASM falló por deserialización del tipo interno `char`; no se utiliza como sustitución de las pruebas de persistencia. Los comandos nativos no se presentan como verificados en este entorno.
- El adaptador WASM depende de APIs internas fijadas a las versiones del lockfile; revisar su compatibilidad al actualizar Prisma.
- La caché, los presupuestos de GitHub y los límites de escritura/demo continúan por proceso. Antes de escalado horizontal deben existir límites compartidos o equivalentes en la plataforma; la caché pública puede permanecer como optimización local si se acepta perder aciertos entre instancias.
- Neon proporciona la base gestionada, pero no se ha ensayado todavía una restauración en una base separada. El procedimiento de backup, restauración y reversión está documentado y sigue pendiente de simulacro.
