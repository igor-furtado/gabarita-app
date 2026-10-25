import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrateDatabase } from "../server/migrate.js";
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
try {
  console.log(await migrateDatabase(drizzle(client)));
} finally {
  await client.end();
}
