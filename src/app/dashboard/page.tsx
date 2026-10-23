import Link from "next/link";
import {
  Bookmark,
  CheckCircle2,
  ListChecks,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listSaved } from "@/lib/service";
import { statusLabels } from "@/lib/domain";
import { updateAction, deleteAction, taskAction } from "../actions";
import { MutationForm } from "@/components/mutation-form";
import { github, GithubError } from "@/lib/github";
async function PullStatus({ url }: { url: string }) {
  let pr: Awaited<ReturnType<typeof github.pull>> | undefined,
    message: string | undefined;
  try {
    pr = await github.pull(url);
  } catch (e) {
    message =
      e instanceof GithubError
        ? e.message
        : "No se pudo consultar la PR pública.";
  }
  if (!pr)
    return (
      <p className="notice">{message} Tu seguimiento manual se conserva.</p>
    );
  return (
    <p className="notice">
      GitHub:{" "}
      {pr.merged
        ? "PR fusionada"
        : pr.state === "open"
          ? "PR abierta"
          : "PR cerrada"}{" "}
      · {pr.title}
      <br />
      <small>
        Consultado{" "}
        {new Date(pr.checkedAt).toLocaleString("es", { timeZone: "UTC" })} UTC.
        No modifica tu estado manual.
      </small>
    </p>
  );
}
export const metadata = { title: "Mi espacio" };
export default async function Dashboard() {
  const user = await requireUser();
  const saved = await listSaved(user.id);
  const totalTasks = saved.reduce((n, s) => n + s.tasks.length, 0),
    done = saved.reduce((n, s) => n + s.tasks.filter((t) => t.done).length, 0);
  const technologies = Array.from(
    new Set(saved.map((s) => s.language).filter(Boolean)),
  );
  return (
    <section className="shell section">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CADA PASO CUENTA</span>
          <h1>Tu camino, a tu ritmo.</h1>
          <p>
            {user.name}, aquí es donde las ideas se convierten en
            contribuciones.
          </p>
        </div>
        <Link
          href={`/explorar${user.demo ? "?source=demo" : ""}`}
          className="button primary"
        >
          Descubrir oportunidades <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat">
          <Bookmark />
          <span>Oportunidades guardadas</span>
          <b>{saved.length}</b>
        </div>
        <div className="stat">
          <ListChecks />
          <span>Tareas completadas</span>
          <b>
            {done}
            <small> / {totalTasks}</small>
          </b>
        </div>
        <div className="stat">
          <CheckCircle2 />
          <span>Marcadas como completadas</span>
          <b>{saved.filter((s) => s.status === "COMPLETED").length}</b>
        </div>
        <div className="stat">
          <Sparkles />
          <span>Lenguajes en tus planes</span>
          <b>{technologies.length}</b>
        </div>
      </div>
      <p className="fine-print">
        Progreso registrado por ti. Estos datos no certifican contribuciones
        aceptadas por GitHub.
      </p>
      <div className="status-summary">
        {Object.entries(statusLabels).map(([value, label]) => (
          <span className="tag" key={value}>
            {label} <b>{saved.filter((s) => s.status === value).length}</b>
          </span>
        ))}
      </div>
      <div className="results-heading">
        <h2>Mis oportunidades</h2>
        <span className="muted">Actividad más reciente primero</span>
      </div>
      {!saved.length ? (
        <div className="empty-state">
          <Bookmark size={36} />
          <h2>Tu próxima idea empieza aquí.</h2>
          <p>
            Guarda una oportunidad en el explorador y te ayudaremos a
            convertirla en un plan.
          </p>
          <Link
            href={`/explorar${user.demo ? "?source=demo" : ""}`}
            className="button primary"
          >
            Encontrar mi primer reto
          </Link>
        </div>
      ) : (
        <div className="saved-list">
          {saved.map((s) => (
            <article className="panel saved-card" key={s.id} id={s.id}>
              <div className="saved-heading">
                <div>
                  <span className="repo-name">
                    {s.owner} / {s.repo} · #{s.number}
                  </span>
                  <h2>
                    <Link
                      href={`/oportunidad/${s.owner}/${s.repo}/${s.number}?source=${s.source}`}
                    >
                      {s.title}
                    </Link>
                  </h2>
                  <span className="tag">
                    {s.source === "demo"
                      ? "Ejemplo ficticio"
                      : "Copia guardada de GitHub"}
                  </span>{" "}
                  <span className="muted">{s.language}</span>
                </div>
                <span className="tag green">{statusLabels[s.status]}</span>
              </div>
              <p className="fine-print">
                Guardado el {s.snapshotAt.toISOString().slice(0, 10)} · Última
                actividad {s.updatedAt.toISOString().slice(0, 10)}. Los datos
                del issue son una copia local.
              </p>
              <div className="plan-grid">
                <div>
                  <h3>
                    Mi plan de aprendizaje{" "}
                    <span className="muted">
                      {s.tasks.filter((t) => t.done).length}/{s.tasks.length}
                    </span>
                  </h3>
                  <progress
                    aria-label={`Progreso de ${s.title}`}
                    value={s.tasks.filter((t) => t.done).length}
                    max={s.tasks.length || 1}
                  />
                  <div className="task-list">
                    {s.tasks.map((t) => (
                      <MutationForm
                        action={taskAction}
                        key={t.id}
                        className="task-form"
                        label="Aplicar"
                        variant="secondary small"
                      >
                        <input type="hidden" name="id" value={t.id} />
                        <label className="sr-only" htmlFor={`done-${t.id}`}>
                          Completada: {t.title}
                        </label>
                        <input
                          id={`done-${t.id}`}
                          type="checkbox"
                          name="done"
                          defaultChecked={t.done}
                        />
                        <label className="sr-only" htmlFor={`title-${t.id}`}>
                          Texto de la tarea
                        </label>
                        <textarea
                          rows={2}
                          id={`title-${t.id}`}
                          name="title"
                          defaultValue={t.title}
                          required
                          maxLength={250}
                        />
                        <label className="sr-only" htmlFor={`op-${t.id}`}>
                          Acción sobre tarea
                        </label>
                        <select id={`op-${t.id}`} name="op" defaultValue="edit">
                          <option value="edit">Editar</option>
                          <option value="remove">Eliminar</option>
                        </select>
                      </MutationForm>
                    ))}
                  </div>
                  <MutationForm
                    action={taskAction}
                    label="Añadir tarea"
                    variant="secondary small"
                    className="add-task"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="op" value="add" />
                    <label>
                      Nueva tarea
                      <input
                        name="title"
                        placeholder="¿Cuál es tu siguiente paso?"
                        required
                        maxLength={250}
                      />
                    </label>
                  </MutationForm>
                </div>
                <div>
                  <MutationForm
                    action={updateAction}
                    label="Guardar plan"
                    className="plan-form"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <label>
                      Estado
                      <select name="status" defaultValue={s.status}>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Notas privadas
                      <textarea
                        name="notes"
                        defaultValue={s.notes}
                        maxLength={10000}
                        rows={4}
                        placeholder="Lo que has descubierto, tus dudas, próximos pasos…"
                      />
                    </label>
                    <label>
                      URL de pull request
                      <input
                        name="prUrl"
                        type="url"
                        defaultValue={s.prUrl ?? ""}
                        placeholder="https://github.com/owner/repo/pull/123"
                        maxLength={250}
                      />
                    </label>
                  </MutationForm>
                  {s.prUrl && (
                    <>
                      <a
                        className="back-link"
                        href={s.prUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver pull request ↗
                      </a>
                      <PullStatus url={s.prUrl} />
                    </>
                  )}
                  <MutationForm
                    action={deleteAction}
                    label="Eliminar de mi espacio"
                    variant="danger small"
                  >
                    <input type="hidden" name="id" value={s.id} />
                  </MutationForm>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <section className="panel learning-summary">
        <h2>Tu mapa de aprendizaje</h2>
        <p className="muted">
          Lenguajes presentes en tus oportunidades guardadas, sin inferir
          dominio ni experiencia.
        </p>
        <div className="tags">
          {technologies.length ? (
            technologies.map((t) => (
              <span className="tag purple" key={t}>
                {t}
              </span>
            ))
          ) : (
            <span className="muted">Aún no hay lenguajes en tus planes.</span>
          )}
        </div>
        <Link href="/preferencias" className="back-link">
          Ajustar mis intereses →
        </Link>
      </section>
    </section>
  );
}
