// Managed by JIM: changes come through JIM's template PRs, which a trusted
// member reviews, since this decides how browsers launch inside JIM's agent
// sandbox. Import `test` and `expect` from here, not from @playwright/test.
//
// Inside the sandbox (JIM_SANDBOX=1), Chromium runs only as Playwright's
// headless shell in single-process mode, through the sandbox's proxy, so
// each test gets a browser of its own. Everywhere else, such as CI, nothing
// changes.
import * as playwright from "@playwright/test";

export * from "@playwright/test";

function sandboxProxy() {
  const raw = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!raw) return undefined;
  const url = new URL(raw);
  return {
    server: `${url.protocol}//${url.host}`,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    // The app under test runs on localhost, which the sandbox lets builders reach directly.
    bypass: "localhost,127.0.0.1",
  };
}

export const test =
  process.env.JIM_SANDBOX === "1"
    ? playwright.test.extend({
        page: async ({ baseURL, viewport }, use) => {
          const browser = await playwright.chromium.launch({
            headless: true,
            args: ["--single-process"],
            proxy: sandboxProxy(),
          });
          const context = await browser.newContext({ baseURL, viewport });
          await use(await context.newPage());
          await browser.close();
        },
      })
    : playwright.test;

/**
 * Adds JIM's `qa` project to the repo's own config: the Step library and the
 * Regression suite, run against QA_URL (QA, or stage for Stage regression).
 * It keeps a screenshot of every test, and a trace and video of failures,
 * for the test report. When JIM runs it (JIM_QA=1), the app isn't started
 * locally: the tests are against the deployed app.
 */
export function withJim(config: playwright.PlaywrightTestConfig): playwright.PlaywrightTestConfig {
  const projects = (config.projects ?? []).filter((project) => project.name !== "qa");
  const qa = {
    name: "qa",
    testDir: ".",
    testMatch: ["steps/**/*.spec.ts", "regression/**/*.spec.ts"],
    use: {
      baseURL: process.env.QA_URL,
      screenshot: "on" as const,
      trace: "retain-on-failure" as const,
      video: "retain-on-failure" as const,
    },
  };
  const testingQa = process.env.JIM_QA === "1";
  return {
    ...config,
    projects: [...projects, qa],
    ...(testingQa ? { webServer: undefined } : {}),
  };
}
