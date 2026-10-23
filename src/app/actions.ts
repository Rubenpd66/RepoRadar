"use server";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authSecret, currentUser, requireUser } from "@/lib/auth";
import { signDemo } from "@/lib/demo-token";
import { db } from "@/lib/db";
import { demoOpportunities } from "@/lib/demo";
import { identifier, sourceSchema } from "@/lib/domain";
import { github, GithubError } from "@/lib/github";
import {
  saveOpportunity,
  updateOpportunity,
  removeOpportunity,
  editTask,
  addTask,
  setPreferences,
  OwnershipError,
} from "@/lib/service";
import { limit } from "@/lib/limit";
export type ActionState = { error?: string; success?: string };
export async function enterDemo() {
  if (process.env.DEMO_ENABLED !== "true") redirect("/acceso");
  const existing = await currentUser();
  if (existing) redirect("/dashboard");
  limit("demo-create", 40);
  const id = `demo-${randomUUID()}`;
  await db.user.create({ data: { id, name: "Explorador demo", demo: true } });
  (await cookies()).set("reporadar-demo", signDemo(id, authSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https:") ?? false,
    maxAge: 86400,
    path: "/",
  });
  redirect("/explorar?source=demo");
}
export async function leaveDemo() {
  (await cookies()).delete("reporadar-demo");
  redirect("/");
}
async function mutate(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
    revalidatePath("/dashboard");
    revalidatePath("/preferencias");
    return { success: "Cambios guardados." };
  } catch (e) {
    if (e instanceof z.ZodError)
      return { error: e.issues[0]?.message ?? "Revisa los datos." };
    if (e instanceof GithubError || e instanceof OwnershipError)
      return { error: e.message };
    if (e instanceof Error && e.message.startsWith("Demasiadas"))
      return { error: e.message };
    return {
      error: "No se ha podido guardar. Revisa los datos e inténtalo de nuevo.",
    };
  }
}
export async function saveAction(_state: ActionState, form: FormData) {
  const user = await requireUser();
  return mutate(async () => {
    limit(`write:${user.id}`);
    const source = sourceSchema.parse(form.get("source"));
    const owner = identifier.parse(form.get("owner")),
      repo = identifier.parse(form.get("repo"));
    const number = z.coerce
      .number()
      .int()
      .positive()
      .max(2147483647)
      .parse(form.get("number"));
    if (
      source === "demo" &&
      (!user.demo || process.env.DEMO_ENABLED !== "true")
    )
      throw new Error("Demostración no habilitada");
    const item =
      source === "demo"
        ? demoOpportunities.find(
            (i) => i.owner === owner && i.repo === repo && i.number === number,
          )
        : (await github.issue(owner, repo, number)).item;
    if (!item) throw new OwnershipError();
    await saveOpportunity(user.id, item);
  });
}
export async function updateAction(_state: ActionState, form: FormData) {
  const user = await requireUser();
  return mutate(async () => {
    limit(`write:${user.id}`);
    await updateOpportunity(user.id, Object.fromEntries(form));
  });
}
export async function deleteAction(_state: ActionState, form: FormData) {
  const user = await requireUser();
  return mutate(async () => {
    limit(`write:${user.id}`);
    await removeOpportunity(
      user.id,
      z.string().min(1).max(100).parse(form.get("id")),
    );
  });
}
export async function taskAction(_state: ActionState, form: FormData) {
  const user = await requireUser();
  return mutate(async () => {
    limit(`write:${user.id}`);
    const id = z.string().min(1).max(100).parse(form.get("id"));
    const title = z.string().trim().min(1).max(250).parse(form.get("title"));
    const op = z.enum(["add", "edit", "remove"]).parse(form.get("op"));
    if (op === "add") await addTask(user.id, id, title);
    else
      await editTask(user.id, id, {
        title,
        done: form.get("done") === "on",
        remove: op === "remove",
      });
  });
}
export async function preferenceAction(_state: ActionState, form: FormData) {
  const user = await requireUser();
  return mutate(async () => {
    limit(`write:${user.id}`);
    const split = (key: string) =>
      String(form.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    await setPreferences(user.id, {
      languages: split("languages"),
      technologies: split("technologies"),
      interests: split("interests"),
    });
  });
}
