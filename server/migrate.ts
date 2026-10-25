import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { stateSchema, profileSchema } from "./domain.js";
import {
  importLegacyWorkspace,
  readWorkspace,
  type Database,
} from "./repository.js";

const migrationId = "0001_relational";
export async function migrateDatabase(db: Database) {
  const ddl = await readFile(
    new URL("../migrations/0001_relational.sql", import.meta.url),
    "utf8",
  ).catch(() =>
    readFile(
      new URL("../../migrations/0001_relational.sql", import.meta.url),
      "utf8",
    ),
  );
  const checksum = createHash("sha256").update(ddl).digest("hex");
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(current_schema() || ':gabarita:migrations'))`,
    );
    await tx.execute(
      sql`create table if not exists schema_migrations (id text primary key, checksum text not null, applied_at timestamptz not null default now())`,
    );
    const applied = await tx.execute<{ checksum: string }>(
      sql`select checksum from schema_migrations where id=${migrationId}`,
    );
    if (applied[0]) {
      if (applied[0].checksum !== checksum)
        throw new Error(
          "Migration checksum mismatch. Do not edit applied migrations.",
        );
      return { applied: false, migratedWorkspaces: 0 };
    }
    const legacy = await tx.execute(
      sql`select 1 from information_schema.columns where table_schema=current_schema() and table_name='workspaces' and column_name='data'`,
    );
    const records: { id: number; version: number; data: unknown }[] = [];
    if (legacy.length) {
      await tx.execute(sql`lock table workspaces in access exclusive mode`);
      const rows = await tx.execute<{
        id: number;
        version: number;
        data: unknown;
      }>(sql`select id,version,data from workspaces order by id`);
      records.push(...rows);
      await tx.execute(sql`alter table workspaces rename to legacy_workspaces`);
      // A renamed primary key keeps its old index name. Rename it before creating the new table.
      await tx.execute(
        sql`alter table legacy_workspaces rename constraint workspaces_pkey to legacy_workspaces_pkey`,
      );
    }
    await tx.execute(sql.raw(ddl));
    const legacySchema = stateSchema.extend({
      profile: profileSchema.extend({ name: z.string(), target: z.string() }),
    });
    for (const row of records) {
      const data = legacySchema.parse(row.data);
      await importLegacyWorkspace(tx, row.id, row.version, data);
      const reconstructed = await readWorkspace(tx, row.id);
      // Compare every field, not just row counts. Unsupported/inconsistent legacy data aborts migration.
      if (
        !isDeepStrictEqual(reconstructed, {
          version: row.version,
          data: row.data,
        })
      )
        throw new Error(
          `A migração não preservou todos os dados do espaço ${row.id}.`,
        );
    }
    for (const table of [
      "subjects",
      "topics",
      "study_sessions",
      "reviews",
      "error_entries",
      "reminders",
    ]) {
      await tx.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('${table}', 'position'), COALESCE((SELECT MAX(position) + 1 FROM ${table}), 1), false)`,
        ),
      );
    }
    if (legacy.length) await tx.execute(sql`drop table legacy_workspaces`);
    await tx.execute(
      sql`insert into schema_migrations(id,checksum) values (${migrationId},${checksum})`,
    );
    return { applied: true, migratedWorkspaces: records.length };
  });
}
