import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"] },
});
