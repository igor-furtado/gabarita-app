import { defineConfig } from "orval";
export default defineConfig({
  gabarita: {
    input: "./openapi.json",
    output: {
      target: "./src/api/generated.ts",
      client: "vue-query",
      httpClient: "fetch",
      override: {
        fetch: { includeHttpResponseReturnType: false },
        mutator: { path: "./src/lib/api-fetch.ts", name: "apiFetch" },
      },
    },
  },
});
