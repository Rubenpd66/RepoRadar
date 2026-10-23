# Arquitectura y decisiones

Un único servicio Next.js. Las páginas y lecturas usan componentes de servidor; los formularios interactivos usan `useActionState`. No hay backend separado ni credenciales en el navegador.

- `src/app`: rutas, interfaz, acciones de servidor y endpoints Auth.js/salud.
- `src/components`: formularios, acceso y tarjetas reutilizables.
- `src/lib/domain.ts`: validaciones, filtros, estados, plan inicial y explicación del encaje.
- `src/lib/github.ts`: única salida a la API REST pública de GitHub.
- `src/lib/service.ts`: casos de persistencia, siempre con propietario explícito.
- `src/lib/auth.ts`: OAuth y resolución de identidad; la sesión demo se firma con HMAC y se comprueba también en base de datos.
- `prisma`: esquema relacional, migraciones y seed idempotente.

## Datos

`User` tiene ID propio y un `githubId` único opcional. No se enlazan cuentas por email. `Preference` es una relación 1:1. `SavedOpportunity` contiene una copia mínima del issue, su fuente, fecha de copia, notas, estado y PR opcional; es única por usuario, ID de issue y fuente. Los IDs de issue usan BIGINT. `Task` pertenece a una oportunidad. Las relaciones se eliminan en cascada. Los índices apoyan las consultas por propietario y actividad.

Los access tokens no se persisten en la base ni en el JWT de aplicación. La biblioteca controla state y CSRF de OAuth; las acciones de Next.js verifican el origen. No hay endpoints públicos de modificación de planes. La identidad demo nunca se acepta a partir de un campo de formulario. Todos los cambios privados filtran por userId, incluidas las tareas a través de su oportunidad.

## GitHub, caché y presupuestos

La búsqueda incluye `is:issue is:open archived:false`. El texto libre se cita; las opciones tienen listas acotadas. Se consultan 20 elementos por página hasta el máximo de resultados accesibles por la búsqueda de GitHub. No se lanzan solicitudes por pulsación: el usuario envía el formulario.

La caché pública tiene TTL de 120 segundos, máximo 300 entradas y deduplicación de solicitudes en curso. No guarda datos privados. Hay un máximo de ocho solicitudes concurrentes. RepoRadar aplica su propio presupuesto conservador de ocho búsquedas y cuarenta consultas de otros recursos por minuto y proceso; estos valores **no se presentan como límites universales de GitHub**.

Se respetan Retry-After y el reset observado; se distinguen errores de red, recursos ausentes, respuestas no válidas y límites. Solo se reintenta una vez un 5xx, con espera breve; no se reintenta un timeout ni un error de permisos. El timeout es de ocho segundos. Los destinos y rutas se construyen en el servidor con identificadores validados. No se siguen redirecciones ni URLs arbitrarias del usuario.

La PR debe ser una URL HTTPS de github.com con ruta owner/repo/pull/numero. Solo se consulta su recurso público; no se usan tokens OAuth para atender búsquedas de otros usuarios. La afinidad ordena únicamente la página actual y muestra coincidencias de intereses; no representa un ranking global ni una probabilidad de éxito.

Documentación oficial consultada durante implementación:

- https://docs.github.com/en/rest/search/search
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Seguridad y límites

React escapa todo el contenido externo; se muestra como texto. No se usa `dangerouslySetInnerHTML`. Las respuestas de salud solo indican ok/unavailable. Los errores de formularios no muestran detalles internos, consultas ni secretos. Hay presupuestos de escritura y creación de sesiones por proceso; una instalación pública debe complementarlos con límites en el proxy de entrada y limpieza periódica de sesiones demo.

Los encabezados impiden framing y olfateo de MIME. La CSP permite inline y eval para compatibilidad con el runtime y desarrollo de Next; endurecerla con nonces exige una implementación y pruebas específicas antes de considerarla una defensa contra XSS completa.

La IA generativa no se implementa. `assess()` es el punto de extensión para recomendaciones futuras; cualquier proveedor posterior debe quedar en el servidor, validar sus salidas, acotar costes y tratar los issues como contenido no confiable.
