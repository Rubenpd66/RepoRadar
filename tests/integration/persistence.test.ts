import { afterAll, beforeEach, describe, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import {
  saveOpportunity,
  listSaved,
  updateOpportunity,
  removeOpportunity,
  editTask,
  addTask,
  setPreferences,
} from "../../src/lib/service";
import { demoOpportunities } from "../../src/lib/demo";
const a = "test-user-a",
  b = "test-user-b";
beforeEach(async () => {
  await db.user.deleteMany({ where: { id: { in: [a, b] } } });
  await db.user.createMany({
    data: [
      { id: a, name: "A" },
      { id: b, name: "B" },
    ],
  });
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [a, b] } } });
  await db.$disconnect();
});
describe("persistencia y aislamiento entre usuarios", () => {
  it("acepta identificadores reales de GitHub mayores que 32 bits", async () => {
    await saveOpportunity(a, {
      ...demoOpportunities[0],
      id: 6000435079,
      source: "github",
    });
    expect((await listSaved(a))[0].githubId).toBe(6000435079n);
  });
  it("guarda idempotentemente, conserva notas y genera un solo plan", async () => {
    const first = await saveOpportunity(a, demoOpportunities[0]);
    await updateOpportunity(a, {
      id: first.id,
      status: "IN_PROGRESS",
      notes: "Privada",
      prUrl: "",
    });
    await saveOpportunity(a, demoOpportunities[0]);
    const rows = await listSaved(a);
    expect(rows).toHaveLength(1);
    expect(rows[0].notes).toBe("Privada");
    expect(rows[0].tasks).toHaveLength(5);
  });
  it("separa listas, actualizaciones, borrados y tareas de dos usuarios", async () => {
    const saved = await saveOpportunity(a, demoOpportunities[0]);
    const [row] = await listSaved(a);
    expect(await listSaved(b)).toHaveLength(0);
    await expect(
      updateOpportunity(b, {
        id: saved.id,
        status: "COMPLETED",
        notes: "Intrusión",
        prUrl: "",
      }),
    ).rejects.toThrow();
    await expect(removeOpportunity(b, saved.id)).rejects.toThrow();
    await expect(
      editTask(b, row.tasks[0].id, { title: "Intrusión", done: true }),
    ).rejects.toThrow();
    await expect(addTask(b, saved.id, "Intrusión")).rejects.toThrow();
    expect((await listSaved(a))[0].status).toBe("PENDING");
    expect((await listSaved(a))[0].tasks[0].done).toBe(false);
  });
  it("persiste tareas, preferencias y PR y elimina en cascada", async () => {
    const saved = await saveOpportunity(a, demoOpportunities[0]);
    await setPreferences(a, {
      languages: ["TypeScript"],
      technologies: ["React"],
      interests: ["testing"],
    });
    expect(await db.preference.findUnique({ where: { userId: b } })).toBeNull();
    expect(
      (await db.preference.findUnique({ where: { userId: a } }))?.languages,
    ).toEqual(["TypeScript"]);
    await addTask(a, saved.id, "Leer las pruebas");
    const row = (await listSaved(a))[0];
    await editTask(a, row.tasks[0].id, {
      title: "Preparación terminada",
      done: true,
    });
    await updateOpportunity(a, {
      id: saved.id,
      status: "PR_SENT",
      notes: "Listo",
      prUrl: "https://github.com/org/repo/pull/1",
    });
    const result = (await listSaved(a))[0];
    expect(result.tasks).toHaveLength(6);
    expect(result.tasks.find((t) => t.id === row.tasks[0].id)).toMatchObject({
      title: "Preparación terminada",
      done: true,
    });
    expect(result.prUrl).toContain("/pull/1");
    await removeOpportunity(a, saved.id);
    expect(await db.task.count({ where: { opportunityId: saved.id } })).toBe(0);
  });
  it("la unicidad resiste guardados concurrentes", async () => {
    await Promise.all([
      saveOpportunity(a, demoOpportunities[1]),
      saveOpportunity(a, demoOpportunities[1]),
    ]);
    expect(await listSaved(a)).toHaveLength(1);
  });
});

describe("orden estable del plan", () => {
  it("mantiene el orden al editar una tarea y añade al final tras eliminar", async () => {
    const opportunity = await saveOpportunity(a, demoOpportunities[0]);
    const before = (await listSaved(a))[0].tasks;
    await editTask(a, before[0].id, { title: before[0].title, done: true });
    expect((await listSaved(a))[0].tasks.map((t) => t.id)).toEqual(
      before.map((t) => t.id),
    );
    await editTask(a, before[1].id, {
      title: before[1].title,
      done: false,
      remove: true,
    });
    await addTask(a, opportunity.id, "Siguiente paso");
    const after = (await listSaved(a))[0].tasks;
    expect(after.slice(0, -1).map((t) => t.id)).toEqual(
      before.filter((_, i) => i !== 1).map((t) => t.id),
    );
    expect(after.at(-1)?.title).toBe("Siguiente paso");
  });
});
