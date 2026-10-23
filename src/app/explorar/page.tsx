import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight, ArrowLeft } from "lucide-react";
import { searchSchema, assess } from "@/lib/domain";
import { searchDemo } from "@/lib/demo";
import { github, GithubError } from "@/lib/github";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { OpportunityCard } from "@/components/opportunity-card";
export const metadata = { title: "Explorar oportunidades" };
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success)
    return (
      <section className="shell section">
        <h1>Revisa los filtros</h1>
        <p className="notice error">
          Algún filtro no es válido. Usa los controles del explorador para
          ajustar la búsqueda.
        </p>
        <Link href="/explorar" className="button primary">
          Restablecer filtros
        </Link>
      </section>
    );
  const filters = parsed.data;
  if (filters.source === "demo" && process.env.DEMO_ENABLED !== "true")
    return (
      <section className="shell section">
        <h1>Demostración desactivada</h1>
        <Link href="/explorar">Ir al explorador de GitHub</Link>
      </section>
    );
  const user = await currentUser();
  const preferences = user
    ? await db.preference.findUnique({ where: { userId: user.id } })
    : null;
  let result: Awaited<ReturnType<typeof github.search>> | undefined,
    error: string | undefined,
    retryAt: number | undefined;
  try {
    result =
      filters.source === "demo"
        ? searchDemo(filters)
        : await github.search(filters);
  } catch (e) {
    error =
      e instanceof GithubError
        ? e.message
        : "No se han podido cargar las oportunidades.";
    retryAt = e instanceof GithubError ? e.retryAt : undefined;
  }
  const pageUrl = (page: number) =>
    `/explorar?${new URLSearchParams({ ...filters, page: String(page) })}`;
  const ranked = result?.items
    .map((item, index) => ({
      item,
      index,
      rank: assess(item, preferences).rank,
    }))
    .sort((a, b) =>
      preferences ? b.rank - a.rank || a.index - b.index : a.index - b.index,
    );
  return (
    <section className="shell section">
      <div className="page-heading">
        <div>
          <span className="eyebrow">DESCUBRE DÓNDE PUEDES APORTAR</span>
          <h1>Tu próxima contribución.</h1>
          <p>
            Proyectos reales. Nuevas habilidades. Un buen lugar para empezar.
          </p>
        </div>
        <span
          className={`source-pill ${filters.source === "demo" ? "demo" : ""}`}
        >
          <span className="live-dot" />
          {filters.source === "demo" ? "Ejemplos ficticios" : "API de GitHub"}
        </span>
      </div>
      <div className="source-tabs">
        <Link
          className={filters.source === "github" ? "active" : ""}
          href="/explorar"
        >
          GitHub en directo
        </Link>
        {process.env.DEMO_ENABLED === "true" && (
          <Link
            className={filters.source === "demo" ? "active" : ""}
            href="/explorar?source=demo"
          >
            Demostración
          </Link>
        )}
      </div>
      <form className="search-panel" action="/explorar">
        <input type="hidden" name="source" value={filters.source} />
        <label className="search-field">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Buscar oportunidades</span>
          <input
            name="q"
            defaultValue={filters.q}
            maxLength={100}
            placeholder="¿Qué te gustaría construir o aprender?"
          />
        </label>
        <div className="filter-row">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <label>
            Lenguaje
            <select name="language" defaultValue={filters.language}>
              {[
                "",
                "TypeScript",
                "JavaScript",
                "Python",
                "Go",
                "Rust",
                "Java",
                "Ruby",
              ].map((l) => (
                <option key={l} value={l}>
                  {l || "Todos los lenguajes"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etiqueta
            <select name="label" defaultValue={filters.label}>
              {[
                "",
                "good first issue",
                "help wanted",
                "documentation",
                "bug",
              ].map((l) => (
                <option key={l} value={l}>
                  {l || "Todas las etiquetas"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Actividad
            <select name="days" defaultValue={filters.days}>
              <option value="">Cualquier fecha</option>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
          </label>
          <label>
            Orden de GitHub
            <select name="sort" defaultValue={filters.sort}>
              <option value="updated">Actualización</option>
              <option value="created">Creación</option>
              <option value="comments">Comentarios</option>
            </select>
          </label>
          <button className="button primary">
            Buscar <ArrowRight size={16} />
          </button>
        </div>
      </form>
      {filters.source === "demo" && (
        <p className="notice">
          Estos proyectos e issues son ejemplos ficticios. No representan
          oportunidades reales ni contribuciones verificadas.
        </p>
      )}
      <div className="results-heading">
        <h2>
          {result
            ? `${result.total.toLocaleString("es")} oportunidades`
            : "Oportunidades"}
          <span className="muted"> · página {filters.page}</span>
        </h2>
        <span className="muted">
          {preferences
            ? "Prioridad por afinidad dentro de esta página"
            : "Encuentra un reto a tu medida"}
        </span>
      </div>
      {error ? (
        <div className="empty-state" role="alert">
          <Search size={32} />
          <h2>El radar necesita un momento.</h2>
          <p>{error}</p>
          {retryAt && (
            <p>
              Próximo intento a partir de{" "}
              {new Date(retryAt).toISOString().slice(11, 19)} UTC.
            </p>
          )}
          <Link href={pageUrl(filters.page)} className="button secondary">
            Volver a intentar
          </Link>
        </div>
      ) : result?.items.length ? (
        <>
          <div className="opportunity-grid">
            {ranked?.map(({ item }) => (
              <OpportunityCard
                key={item.id}
                item={item}
                preferences={preferences}
              />
            ))}
          </div>
          {result.incomplete && (
            <p className="notice">
              GitHub devolvió resultados parciales. Prueba una búsqueda más
              concreta.
            </p>
          )}
          <nav className="pagination" aria-label="Paginación">
            {filters.page > 1 && (
              <Link
                className="button secondary"
                href={pageUrl(filters.page - 1)}
              >
                <ArrowLeft size={16} />
                Anterior
              </Link>
            )}
            <span>Página {filters.page}</span>
            {filters.page * 20 < Math.min(result.total, 1000) && (
              <Link
                className="button secondary"
                href={pageUrl(filters.page + 1)}
              >
                Siguiente
                <ArrowRight size={16} />
              </Link>
            )}
          </nav>
        </>
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h2>Un filtro menos, más posibilidades.</h2>
          <p>
            No hay resultados para esta búsqueda. Prueba otro lenguaje o amplía
            las etiquetas.
          </p>
          <Link
            className="button secondary"
            href={`/explorar?source=${filters.source}&label=`}
          >
            Ampliar búsqueda
          </Link>
        </div>
      )}
      <p className="fine-print">
        Las estimaciones de encaje son orientativas y se basan en etiquetas y
        coincidencias de texto. Comprueba siempre el contexto y las normas del
        proyecto.
      </p>
    </section>
  );
}
