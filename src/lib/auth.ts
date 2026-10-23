import { getServerSession, type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { verifyDemo } from "./demo-token";
export function authSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32)
    throw new Error("Configura AUTH_SECRET con al menos 32 caracteres");
  return s;
}
export const githubEnabled = !!(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
);
export const authOptions: NextAuthOptions = {
  secret: authSecret(),
  session: { strategy: "jwt", maxAge: 86400 },
  pages: { signIn: "/acceso", error: "/acceso" },
  providers: githubEnabled
    ? [
        GithubProvider({
          clientId: process.env.AUTH_GITHUB_ID!,
          clientSecret: process.env.AUTH_GITHUB_SECRET!,
          authorization: { params: { scope: "read:user" } },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "github") {
        const user = await db.user.upsert({
          where: { githubId: account.providerAccountId },
          create: {
            githubId: account.providerAccountId,
            name: profile?.name ?? "Desarrollador",
          },
          update: { name: profile?.name ?? "Desarrollador" },
        });
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = String(token.userId ?? "");
      return session;
    },
  },
};
export async function currentUser() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id)
    return db.user.findUnique({ where: { id: session.user.id } });
  if (process.env.DEMO_ENABLED === "true") {
    const cookie = (await cookies()).get("reporadar-demo")?.value;
    const id = cookie ? verifyDemo(cookie, authSecret()) : null;
    if (id) return db.user.findFirst({ where: { id, demo: true } });
  }
  return null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/acceso");
  return user;
}
