import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  BookmarkPlus,
  ListChecks,
} from "lucide-react";
import { identifier, sourceSchema, assess, initialTasks } from "@/lib/domain";
import { demoOpportunities } from "@/lib/demo";
import { github, GithubError } from "@/lib/github";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MutationForm } from "@/components/mutation-form";
import { saveAction } from "@/app/actions";
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string; number: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { owner, repo, number } = await params;
  const source = sourceSchema.safeParse(
    (await searchParams).source ?? "github",
  );
  if (
    !identifier.safeParse(owner).success ||
    !identifier.safeParse(repo).success ||
    !/^\d+$/.test(number) ||
    Number(number) < 1 ||
    Number(number) > 2147483647 ||
    !source.success
  )
    notFound();
  if (source.data === "demo" && process.env.DEMO_ENABLED !== "true") notFound();
  let item,
    contributing: string | null = null;
  try {
    if (source.data === "demo") {
      item = demoOpportunities.find(
        (i) =>
          i.owner === owner && i.repo === repo && i.number === Number(number),
      );
    } else {
      const result = await github.issue(owner, repo, Number(number));
      item = result.item;
      contributing = result.contributing;
    }
  } catch (e) {
    if (e instanceof GithubError && e.kind === "missing") notFound();
    return (
      <section className="shell section">
        <Link href="/explorar">← Explorar</Link>
        <h1>No hemos podido abrir este issue.</h1>
        <p role="alert" className="notice error">
          {e instanceof GithubError
            ? e.message
            : "La información del issue no está disponible."}
        </p>
      </section>
    );
  }
  if (!item) notFound();
  const user = await currentUser();
  const preferences = user
    ? await db.preference.findUnique({ where: { userId: user.id } })
    : null;
  const estimate = assess(item, preferences);
  return (
    <section className="shell section">
      <Link href={`/explorar?source=${item.source}`} className="back-link">
        <ArrowLeft size={16} />
        Volver al explorador
      </Link>
      {item.source === "demo" && (
        <p className="notice">
          Ejemplo ficticio para practicar. Sus enlaces no representan un
          proyecto real.
        </p>
      )}
      <div className="detail-grid">
        <article>
          <span className="eyebrow">
            {owner} / {repo} · #{number}
          </span>
          <h1 className="detail-title">{item.title}</h1>
          <div className="tags">
            {item.labels.map((l) => (
              <span key={l} className="tag green">
                {l}
              </span>
            ))}
          </div>
          <div className="detail-meta">
            <span>{item.language ?? "Lenguaje no indicado"}</span>
            <span>{item.comments} comentarios</span>
            <span>
              Actualizado:{" "}
              {new Intl.DateTimeFormat("es", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(new Date(item.updatedAt))}
            </span>
          </div>
          <section className="panel">
            <h2>Contexto del issue</h2>
            <p className="muted">
              Contenido{" "}
              {item.source === "demo" ? "de demostración" : "de GitHub"} ·
              mostrado como texto seguro.
            </p>
            <div className="issue-body">
              {item.body || "Este issue no tiene descripción."}
            </div>
            {item.source === "github" && (
              <a
                className="button secondary"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                Ver issue original <ExternalLink size={15} />
              </a>
            )}
          </section>
          <section className="panel">
            <h2>
              <ListChecks size={21} /> Tu punto de partida
            </h2>
            <p className="muted">
              Propuesta de RepoRadar; ajústala después de revisar el proyecto.
            </p>
            <ol className="starting-steps">
              {initialTasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            {contributing && (
              <a href={contributing} target="_blank" rel="noreferrer">
                Consultar las instrucciones del proyecto ↗
              </a>
            )}
          </section>
        </article>
        <aside>
          <div className="panel sticky-panel">
            <span className="feature-icon">
              <BookmarkPlus />
            </span>
            <h2>Hazlo parte de tu camino.</h2>
            <p>
              Guarda esta oportunidad para convertirla en un plan y seguir tu
              progreso.
            </p>
            <div className="fit-box">
              <b>{estimate.difficulty}</b>
              <ul>
                {estimate.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <small>
                Estimación orientativa. La complejidad real requiere investigar
                el código.
              </small>
            </div>
            {user && (item.source !== "demo" || user.demo) ? (
              <MutationForm action={saveAction} label="Guardar oportunidad">
                <input type="hidden" name="owner" value={owner} />
                <input type="hidden" name="repo" value={repo} />
                <input type="hidden" name="number" value={number} />
                <input type="hidden" name="source" value={item.source} />
              </MutationForm>
            ) : (
              <Link className="button primary" href="/acceso">
                Acceder para guardar
              </Link>
            )}
            <Link className="back-link" href="/dashboard">
              Ver mi espacio →
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
