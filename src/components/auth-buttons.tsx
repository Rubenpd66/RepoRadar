"use client";
import { signIn, signOut } from "next-auth/react";
export function GithubLogin() {
  return (
    <button
      className="button primary"
      onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
    >
      Conectar con GitHub ↗
    </button>
  );
}
export function Logout() {
  return (
    <button
      className="text-button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Cerrar sesión
    </button>
  );
}
