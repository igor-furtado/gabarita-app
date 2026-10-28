import { defineConfig } from "@playwright/test";
const externalUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./apps/frontend/e2e",
  workers: 1,
  use: { baseURL: externalUrl ?? "http://127.0.0.1:5173", headless: true },
  webServer: externalUrl
    ? undefined
    : {
        command: "pnpm dev:frontend",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});