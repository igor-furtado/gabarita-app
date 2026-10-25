import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
export async function sandboxDatabase() {
  const schema = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
  await admin.unsafe(`CREATE SCHEMA ${schema}`);
  const client = postgres(process.env.DATABASE_URL!, {
    connection: { search_path: schema },
    onnotice: () => {},
  });
  return {
    schema,
    client,
    db: drizzle(client),
    async close() {
      await client.end();
      await admin.unsafe(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
