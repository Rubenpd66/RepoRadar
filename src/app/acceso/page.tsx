import { GithubLogin } from "@/components/auth-buttons";
import { githubEnabled } from "@/lib/auth";
import { enterDemo } from "../actions";
export default async function Access({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <section className="shell narrow section">
      <span className="eyebrow">TU ESPACIO DE APRENDIZAJE</span>
      <h1>Empieza por una oportunidad.</h1>
      <p>
        Guarda issues, organiza un plan y sigue tu progreso. Solo solicitamos
        acceso de lectura a tu perfil público de GitHub.
      </p>
      {error && (
        <p role="alert" className="notice error">
          No se ha podido iniciar sesión. Vuelve a intentarlo o revisa la
          configuración de OAuth.
        </p>
      )}
      <div className="panel access-options">
        {githubEnabled ? (
          <GithubLogin />
        ) : (
          <p className="notice">
            La conexión con GitHub necesita configurar la aplicación OAuth. El
            explorador público y la demostración están disponibles.
          </p>
        )}
        {process.env.DEMO_ENABLED === "true" && (
          <form action={enterDemo}>
            <button className="button primary">Entrar en demostración</button>
            <p className="muted">
              Un espacio privado por navegador, válido durante 24 horas. Los
              ejemplos están identificados como ficticios.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
