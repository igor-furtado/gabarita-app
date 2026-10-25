import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { z } from "zod";
import { stateSchema, commandSchema, DomainError } from "./domain.js";
import {
  initializeWorkspace,
  readWorkspace,
  executeRelationalCommand,
  ConflictError,
} from "./repository.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
export async function buildApp(db?: PostgresJsDatabase) {
  const app = Fastify({
    logger: !!db && process.env.NODE_ENV !== "test",
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });
  app.setErrorHandler((error, request, reply) => {
    if (
      (error instanceof Error && "validation" in error) ||
      error instanceof z.ZodError
    )
      return reply
        .code(400)
        .send({ message: "Confira os campos preenchidos e tente novamente." });
    const cause =
      error instanceof Error && "cause" in error ? error.cause : error;
    if (
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      ["23503", "23505", "23514", "22007", "22008", "22P02"].includes(
        String(cause.code),
      )
    )
      return reply.code(400).send({
        message: "Dados inválidos ou em conflito com outro registro.",
      });
    request.log.error(error);
    return reply
      .code(500)
      .send({ message: "Não foi possível salvar agora. Tente novamente." });
  });
  await app.register(swagger, {
    openapi: { info: { title: "Gabarita API", version: "1.0.0" } },
  });
  await app.register(swaggerUi, { routePrefix: "/api/docs" });
  const response = z.object({ version: z.number(), data: stateSchema });
  app.get(
    "/api/state",
    {
      schema: {
        operationId: "getState",
        response: { 200: z.toJSONSchema(response, { target: "draft-7" }) },
      },
    },
    async () => {
      if (!db) throw new Error("Database required");
      await initializeWorkspace(db);
      return db.transaction((tx) => readWorkspace(tx), {
        isolationLevel: "repeatable read",
        accessMode: "read only",
      });
    },
  );
  app.post(
    "/api/commands",
    {
      schema: {
        operationId: "executeCommand",
        body: z.toJSONSchema(
          z.object({ version: z.number().int(), command: commandSchema }),
          { target: "draft-7" },
        ),
        response: {
          200: z.toJSONSchema(response, { target: "draft-7" }),
          400: { type: "object", properties: { message: { type: "string" } } },
          409: { type: "object", properties: { message: { type: "string" } } },
        },
      },
    },
    async (req, reply) => {
      if (!db) throw new Error("Database required");
      const input = z
        .object({ version: z.number().int(), command: commandSchema })
        .parse(req.body);
      try {
        return await executeRelationalCommand(db, input.version, input.command);
      } catch (error) {
        if (error instanceof ConflictError)
          return reply.code(409).send({ message: error.message });
        if (error instanceof DomainError)
          return reply.code(400).send({ message: error.message });
        throw error;
      }
    },
  );
  app.get("/api/health", async () => ({ status: "ok" }));
  return app;
}
