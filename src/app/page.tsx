import Link from "next/link";
import {
  ArrowRight,
  Search,
  Route,
  GitPullRequest,
  CodeXml,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { enterDemo } from "./actions";
export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> TU PRÓXIMO PASO EN OPEN SOURCE
          </span>
          <h1>
            Tu código puede
            <br />
            llegar <span>más lejos.</span>
          </h1>
          <p>
            Encuentra tu primera —o próxima— contribución.
            <br className="desktop-break" /> Descubre proyectos que encajan
            contigo y transforma
            <br className="desktop-break" /> cada issue en una oportunidad de
            aprender.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/explorar">
              Explorar oportunidades <ArrowRight size={18} />
            </Link>
            {process.env.DEMO_ENABLED === "true" && (
              <form action={enterDemo}>
                <button className="button secondary">
                  Probar demostración
                </button>
              </form>
            )}
          </div>
          <div className="hero-note">
            <Check size={15} /> Explorador público <span>·</span> Sin escribir
            en repositorios ajenos
          </div>
        </div>
        <div className="radar-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="radar-cross horizontal" />
          <div className="radar-cross vertical" />
          <div className="radar-center">
            <CodeXml size={42} />
          </div>
          <span className="radar-point point-one" />
          <span className="radar-point point-two" />
          <span className="radar-point point-three" />
          <div className="floating-card float-one">
            <span className="mini-icon purple">⌘</span>
            <div>
              <b>Tu siguiente reto</b>
              <span>Un issue. Muchas posibilidades.</span>
            </div>
            <ArrowUpRight size={17} />
          </div>
          <div className="floating-card float-two">
            <span className="mini-icon mint">
              <Check size={18} />
            </span>
            <div>
              <b>Aprende contribuyendo</b>
              <span>Paso a paso, con un plan.</span>
            </div>
          </div>
          <span className="visual-caption">MENOS BUSCAR. MÁS CONSTRUIR.</span>
        </div>
      </section>
      <section className="workflow-strip shell">
        <span>
          DE LA CURIOSIDAD
          <br />
          <b>A LA CONTRIBUCIÓN</b>
        </span>
        <div>
          <Search />
          <span>Descubre un proyecto</span>
        </div>
        <ArrowUpRight size={14} aria-hidden="true" />
        <div>
          <Route />
          <span>Traza tu camino</span>
        </div>
        <ArrowUpRight size={14} aria-hidden="true" />
        <div>
          <GitPullRequest />
          <span>Haz tu contribución</span>
        </div>
      </section>
      <section className="shell section home-features">
        <div className="section-heading">
          <div>
            <span className="eyebrow">UN CAMINO MÁS CLARO</span>
            <h2>
              No necesitas saberlo todo.
              <br />
              Solo encontrar dónde empezar.
            </h2>
          </div>
          <p>
            Todo lo que necesitas para pasar de
            <br />
            “me gustaría contribuir” a hacerlo.
          </p>
        </div>
        <div className="feature-grid">
          {[
            {
              n: "01",
              icon: <Search />,
              title: "Encuentra tu lugar",
              text: "Filtra issues por lenguaje, etiquetas y actividad. Explora oportunidades reales sin perderte entre miles de repositorios.",
            },
            {
              n: "02",
              icon: <Route />,
              title: "Convierte dudas en pasos",
              text: "Guarda ideas, identifica qué aprender y construye tu propio plan. Una checklist para avanzar a tu ritmo.",
            },
            {
              n: "03",
              icon: <GitPullRequest />,
              title: "Haz visible tu progreso",
              text: "Organiza tus contribuciones, vincula tus pull requests y celebra lo que vas aprendiendo por el camino.",
            },
          ].map((f) => (
            <article className="feature" key={f.n}>
              <div>
                <span className="feature-icon">{f.icon}</span>
                <span className="feature-number">{f.n}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="shell bottom-cta">
        <div>
          <span className="eyebrow">
            UN PEQUEÑO CAMBIO PUEDE SER UN GRAN COMIENZO
          </span>
          <h2>Hay un proyecto esperando tu perspectiva.</h2>
        </div>
        <Link className="button primary" href="/explorar">
          Encuentra tu oportunidad <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
