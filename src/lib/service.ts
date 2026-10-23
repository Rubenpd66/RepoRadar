import { db } from "./db";
import {
  initialTasks,
  updateSchema,
  preferencesSchema,
  type Opportunity,
} from "./domain";
export class OwnershipError extends Error {
  constructor() {
    super("No se ha encontrado la oportunidad en tu espacio.");
  }
}
export async function saveOpportunity(userId: string, item: Opportunity) {
  return db.savedOpportunity.upsert({
    where: {
      userId_githubId_source: {
        userId,
        githubId: item.id,
        source: item.source,
      },
    },
    create: {
      userId,
      githubId: item.id,
      source: item.source,
      owner: item.owner,
      repo: item.repo,
      number: item.number,
      title: item.title,
      url: item.url,
      labels: item.labels,
      language: item.language,
      tasks: {
        create: initialTasks.map((title, position) => ({ title, position })),
      },
    },
    update: {},
  });
}
export async function listSaved(userId: string) {
  return db.savedOpportunity.findMany({
    where: { userId },
    include: { tasks: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
    orderBy: { updatedAt: "desc" },
  });
}
export async function updateOpportunity(userId: string, input: unknown) {
  const { id, prUrl, ...data } = updateSchema.parse(input);
  const result = await db.savedOpportunity.updateMany({
    where: { id, userId },
    data: { ...data, prUrl: prUrl || null },
  });
  if (!result.count) throw new OwnershipError();
}
export async function removeOpportunity(userId: string, id: string) {
  const result = await db.savedOpportunity.deleteMany({
    where: { id, userId },
  });
  if (!result.count) throw new OwnershipError();
}
export async function editTask(
  userId: string,
  id: string,
  input: { title: string; done: boolean; remove?: boolean },
) {
  const where = { id, opportunity: { userId } };
  const task = await db.task.findFirst({
    where,
    select: { opportunityId: true },
  });
  if (!task) throw new OwnershipError();
  const result = input.remove
    ? await db.task.deleteMany({ where })
    : await db.task.updateMany({
        where,
        data: { title: input.title, done: input.done },
      });
  if (!result.count) throw new OwnershipError();
  await db.savedOpportunity.updateMany({
    where: { userId, id: task.opportunityId },
    data: { updatedAt: new Date() },
  });
}
export async function addTask(userId: string, id: string, title: string) {
  return db.$transaction(async (tx) => {
    const owned = await tx.savedOpportunity.findFirst({
      where: { id, userId },
      select: {
        id: true,
        _count: { select: { tasks: true } },
        tasks: {
          select: { position: true },
          orderBy: { position: "desc" },
          take: 1,
        },
      },
    });
    if (!owned) throw new OwnershipError();
    if (owned._count.tasks >= 30)
      throw new Error("El plan admite hasta 30 tareas.");
    await tx.task.create({
      data: {
        opportunityId: id,
        title,
        position: (owned.tasks[0]?.position ?? -1) + 1,
      },
    });
    await tx.savedOpportunity.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  });
}
export async function setPreferences(userId: string, input: unknown) {
  const data = preferencesSchema.parse(input);
  return db.preference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
