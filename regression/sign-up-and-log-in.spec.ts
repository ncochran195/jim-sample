import { expect, test } from "../.github/jim/playwright.js";
import { logIn } from "../steps/log-in.js";
import { logOut, signUp } from "../steps/sign-up.js";

// Key journey: a new user signs up, which signs them in, then logs out and
// logs back in with the same email and password. Accounts can't be deleted,
// so each run leaves its jim-nightly- user on QA.
test("sign up and log in", async ({ page }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `jim-nightly-${stamp}@example.com`;
  const password = "jim-nightly-password";

  await signUp(page, email, password);
  await logOut(page);
  await expect(page.getByRole("banner")).not.toContainText(email);

  // Signed out, the app sends you back to "Log in" rather than showing projects.
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Log in", level: 1 })).toBeVisible();

  await logIn(page, email, password);
  await expect(page.getByRole("banner")).toContainText(email);
  await expect(page.getByRole("banner").getByRole("button", { name: "Log out" })).toBeVisible();
});
