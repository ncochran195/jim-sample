import { defineConfig, devices } from "@playwright/test";
import { withJim } from "./.github/jim/playwright.js";

// The app under test runs on PORT, so parallel runs never collide.
const port = Number(process.env.PORT ?? 3100);

const config = defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  projects: [
    {
      name: "feature",
      testDir: "tests/feature",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${port}` },
    },
  ],
  webServer: {
    // No DATABASE_URL: the app runs on an in-memory PGlite database.
    command: "npx tsx src/server.ts",
    url: `http://localhost:${port}/health`,
    env: { PORT: String(port) },
    reuseExistingServer: false,
  },
});

// JIM's qa project, from its fixture (see .github/jim/playwright.ts).
export default withJim(config);
