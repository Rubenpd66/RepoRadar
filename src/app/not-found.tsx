import Link from "next/link";
export default function NotFound() {
  return (
    <section className="shell section">
      <span className="eyebrow">FUERA DEL RADAR</span>
      <h1>No encontramos esta oportunidad.</h1>
      <p>
        Puede que el enlace haya cambiado o que el recurso ya no sea público.
      </p>
      <Link className="button primary" href="/explorar">
        Volver a explorar
      </Link>
    </section>
  );
}
