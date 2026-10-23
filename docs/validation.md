# Validación del 23 de octubre de 2026

Evidencia obtenida en el entorno cloud actual. No equivale a publicación del entorno, ejecución remota de CI ni despliegue en producción.

| Comprobación                                                 | Resultado                                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Instalación desde lockfile con `scripts/cloud-install.sh`    | Correcta; se conserva la configuración local existente.                                                                      |
| Generación Prisma y migraciones en desarrollo y base aislada | Correctas mediante paquetes oficiales WASM; las tres migraciones se aplicaron también desde una base vacía y se verificó su reaplicación sin cambios.                                                        |
| Seed ejecutado dos veces                                     | Correcto; tres oportunidades para seed-demo, sin duplicados.                                                                 |
| Lint y TypeScript estricto                                   | Correctos.                                                                                                                   |
| Vitest                                                       | 24 pruebas unitarias/integración; todas pasan, ninguna omitida.                                                              |
| Playwright sobre build de producción                         | 2 pruebas; ambas pasan, ninguna omitida.                                                                                     |
| Build de producción                                          | Correcto.                                                                                                                    |
| Arranque mediante `scripts/cloud-start.sh`                   | Correcto; PostgreSQL, migraciones, Next y salud comprobados.                                                                 |
| Integración real con GitHub                                  | Búsqueda de 20 issues, detalle y normas disponibles; guardado desde navegador en PostgreSQL y eliminación del dato temporal. |
| Vistas escritorio y móvil                                    | Revisión visual; sin desbordamiento horizontal en dashboard móvil ni errores JavaScript en el recorrido real.                |
| Auditoría npm de dependencias de producción                  | Cero vulnerabilidades reportadas en la ejecución realizada.                                                                  |

La integración comprueba aislamiento entre dos usuarios, incluidos intentos de editar, añadir tareas y eliminar oportunidades ajenas; también persistencia, PR, unicidad, cascadas y conservación de notas. La E2E comprueba otro navegador sin acceso al plan, recarga persistente, preferencias y tareas. Las respuestas de GitHub se simulan en las pruebas deterministas; la comprobación real se ejecutó por separado.

Se corrigieron dos problemas encontrados al validar: IDs de GitHub superiores a 32 bits y orden inestable de tareas con la misma fecha de creación. Hay pruebas de regresión para ambos.

## Limitaciones y comprobaciones pendientes

- Sin AUTH_GITHUB_ID/SECRET propios no se ha completado el login OAuth real. El código y las instrucciones de callback están preparados; deben validarse con esa aplicación OAuth.
- El motor nativo de Prisma no pudo descargarse por la política de red. La generación y las migraciones se verificaron con el motor WASM oficial distribuido por npm. La introspección adicional de esquema por WASM falló por deserialización del tipo interno `char`; no se utiliza como sustitución de las pruebas de persistencia. Los comandos nativos no se presentan como verificados en este entorno.
- El adaptador WASM depende de APIs internas fijadas a las versiones del lockfile; revisar su compatibilidad al actualizar Prisma.
- CI está definido en `.github/workflows/ci.yml`; todavía no hay una ejecución remota de GitHub Actions.
- No se han creado recursos externos ni desplegado la aplicación. Backup, restauración y reversión están documentados, sin verificación contra una base gestionada de producción.
- No se ha validado restauración en una tarea cloud nueva. La configuración guardada sigue siendo un borrador para revisión y publicación del usuario.
