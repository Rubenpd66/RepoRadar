import type { Metadata } from "next";
import Link from "next/link";
import { Radar, ArrowUpRight } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { leaveDemo } from "./actions";
import { Logout } from "@/components/auth-buttons";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "RepoRadar · Tu próxima contribución empieza aquí",
    template: "%s · RepoRadar",
  },
  description:
    "Descubre oportunidades de código abierto y conviértelas en un plan de aprendizaje.",
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="es">
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <header className="site-header">
          <div className="nav-wrap">
            <Link href="/" className="brand">
              <span className="brand-icon">
                <Radar size={23} />
              </span>
              RepoRadar<span className="beta">BETA</span>
            </Link>
            <nav aria-label="Navegación principal">
              <Link href="/explorar">Explorar</Link>
              <Link href="/dashboard">Mi espacio</Link>
              <Link href="/preferencias">Preferencias</Link>
            </nav>
            <div className="account">
              {user ? (
                <>
                  <span className="user-name">
                    {user.demo ? "Sesión demo" : user.name}
                  </span>
                  {user.demo ? (
                    <form action={leaveDemo}>
                      <button className="text-button">Salir</button>
                    </form>
                  ) : (
                    <Logout />
                  )}
                </>
              ) : (
                <Link href="/acceso" className="button small">
                  Comenzar <ArrowUpRight size={15} />
                </Link>
              )}
            </div>
          </div>
        </header>
        {user?.demo && (
          <div className="demo-banner">
            Modo demostración · Tu espacio es independiente. Los ejemplos son
            ficticios; las búsquedas GitHub siguen usando datos reales.
          </div>
        )}
        <main id="contenido">{children}</main>
        <footer>
          <Link href="/" className="brand">
            <Radar size={20} />
            RepoRadar
          </Link>
          <span>Discover. Learn. Contribute.</span>
          <span>Hecho para quienes aprenden construyendo.</span>
        </footer>
      </body>
    </html>
  );
}
