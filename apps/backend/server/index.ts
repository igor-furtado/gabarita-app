import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { buildApp } from "./app.js";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
const sql = postgres(process.env.DATABASE_URL!);
const app = await buildApp(drizzle(sql));
if (process.env.NODE_ENV === "production") {
  await app.register(fastifyStatic, { root: resolve("../frontend/dist") });
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith("/api")
      ? reply.code(404).send({ message: "Não encontrado" })
      : reply.sendFile("index.html"),
  );
}
await app.listen({
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "127.0.0.1",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    await sql.end();
    process.exit(0);
  });
