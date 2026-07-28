import { expect, test } from "@playwright/test";

test("muestra el acceso institucional como página inicial", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/GYMPLAN/i);
  await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible();
  await expect(page.getByLabel(/nombre de usuario/i)).toBeVisible();
});

test("protege las rutas institucionales sin sesión", async ({ page }) => {
  await page.goto("/plans");
  await expect(page).toHaveURL(/\/\?next=%2Fplans$/);
  await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible();
});
