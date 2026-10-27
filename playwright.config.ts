import { defineConfig } from "@playwright/test";
const externalUrl = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: "./e2e",
  // Browser scenarios share the local workspace and its optimistic version.
  workers: 1,
  use: { baseURL: externalUrl ?? "http://127.0.0.1:5173", headless: true },
  webServer: externalUrl
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
