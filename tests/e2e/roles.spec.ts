import { expect, test, type Page } from "@playwright/test";

type Credentials = { username?: string; pin?: string };

async function login(page: Page, credentials: Credentials) {
  await page.goto("/");
  await page.getByLabel(/nombre de usuario/i).fill(credentials.username || "");
  await page.getByLabel(/contraseña/i).fill(credentials.pin || "");
  await page.getByRole("button", { name: /ingresar/i }).click();
}

test("superadministrador abre la gestión global", async ({ page }) => {
  const credentials = { username: process.env.E2E_SUPERADMIN_USERNAME, pin: process.env.E2E_SUPERADMIN_PIN };
  test.skip(!credentials.username || !credentials.pin, "Configura credenciales E2E aisladas.");
  await login(page, credentials);
  await expect(page).toHaveURL(/\/superadmin$/);
  await expect(page.getByRole("heading", { name: /superadministración/i })).toBeVisible();
});

test("administrador institucional abre su panel y usuarios", async ({ page }) => {
  const credentials = { username: process.env.E2E_ADMIN_USERNAME, pin: process.env.E2E_ADMIN_PIN };
  test.skip(!credentials.username || !credentials.pin, "Configura credenciales E2E aisladas.");
  await login(page, credentials);
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { name: /panel administrativo/i })).toBeVisible();
  await page.getByRole("link", { name: /usuarios/i }).first().click();
  await expect(page).toHaveURL(/\/admin\/team$/);
});

test("profesor abre su panel y no puede entrar a superadministración", async ({ page }) => {
  const credentials = { username: process.env.E2E_TEACHER_USERNAME, pin: process.env.E2E_TEACHER_PIN };
  test.skip(!credentials.username || !credentials.pin, "Configura credenciales E2E aisladas.");
  await login(page, credentials);
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { name: /panel del profesor/i })).toBeVisible();
  await page.goto("/superadmin");
  await expect(page).toHaveURL(/\/overview$/);
});
