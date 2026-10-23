import { test, expect } from "@playwright/test";
test("explorador demo, plan persistente, preferencias y aislamiento", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tu código puede llegar más lejos." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Probar demostración" }).click();
  await expect(
    page.getByText("Ejemplos ficticios", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Mejorar la navegación por teclado/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Contexto del issue" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar oportunidad" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cambios guardados." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver mi espacio →" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu camino, a tu ritmo." }),
  ).toBeVisible();
  await page
    .getByLabel("Notas privadas")
    .fill("Investigar foco con pruebas de teclado");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Guardar plan" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cambios guardados." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Notas privadas")).toHaveValue(
    "Investigar foco con pruebas de teclado",
  );
  await expect(
    page.getByRole("combobox", { name: "Estado", exact: true }),
  ).toHaveValue("IN_PROGRESS");
  const task = page.locator(".task-form").first();
  await task.getByRole("checkbox").check();
  await task.getByRole("button", { name: "Aplicar" }).click();
  await expect(task.getByRole("status")).toHaveText("Cambios guardados.");
  await page.reload();
  await expect(
    page.locator(".task-form").first().getByRole("checkbox"),
  ).toBeChecked();
  await page
    .getByLabel("Nueva tarea")
    .fill("Comprender los eventos de teclado");
  await page.getByRole("button", { name: "Añadir tarea" }).click();
  await expect(
    page.getByRole("textbox", { name: "Texto de la tarea" }).last(),
  ).toHaveValue("Comprender los eventos de teclado");
  await page.getByRole("link", { name: "Preferencias", exact: true }).click();
  await page.getByLabel("Lenguajes", { exact: true }).fill("TypeScript");
  await page.getByLabel("Tecnologías").fill("React");
  await page.getByRole("button", { name: "Guardar preferencias" }).click();
  await expect(page.getByRole("status")).toHaveText("Cambios guardados.");
  await page.reload();
  await expect(page.getByLabel("Tecnologías")).toHaveValue("React");
  const other = await browser.newContext();
  const second = await other.newPage();
  await second.goto("/dashboard");
  await expect(second).toHaveURL(/acceso/);
  await second.getByRole("button", { name: "Entrar en demostración" }).click();
  await second.getByRole("link", { name: "Mi espacio", exact: true }).click();
  await expect(
    second.getByRole("heading", { name: "Tu próxima idea empieza aquí." }),
  ).toBeVisible();
  await expect(second.getByLabel("Notas privadas")).toHaveCount(0);
  await other.close();
  await page.getByRole("link", { name: "Mi espacio", exact: true }).click();
  await page.getByRole("button", { name: "Eliminar de mi espacio" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu próxima idea empieza aquí." }),
  ).toBeVisible();
});
test("móvil, filtros vacíos y salud", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explorar?source=demo&language=Rust");
  await expect(
    page.getByRole("heading", { name: "Un filtro menos, más posibilidades." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/explorar?source=demo&page=999");
  await expect(
    page.getByRole("heading", { name: "Revisa los filtros" }),
  ).toBeVisible();
  await page.goto("/oportunidad/demo-labs/accessible-ui/42?source=demo");
  await expect(
    page.getByRole("heading", { name: "Contexto del issue" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/api/health");
  await expect(page.locator("body")).toContainText('"status":"ok"');
});
