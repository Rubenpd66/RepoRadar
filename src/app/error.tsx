"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="shell section">
      <h1>No se ha podido completar la operación.</h1>
      <p role="alert">
        Ha ocurrido un error. Tu progreso guardado se conserva. Comprueba la
        conexión e inténtalo de nuevo.
      </p>
      <button className="button primary" onClick={reset}>
        Volver a intentar
      </button>
    </section>
  );
}
