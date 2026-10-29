import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { stateSchema, profileSchema } from "@gabarita/shared/schemas";
import { importLegacyWorkspace, type Database } from "./repository.js";

const migrationId = "0001_relational";
async function migrateInitialDatabase(db: Database) {
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

export async function migrateDatabase(db: Database) {
  const initial = await migrateInitialDatabase(db);
  let applied = initial.applied;
  for (const id of [
    "0002_contests",
    "0003_contest_details",
    "0004_adaptive_plan",
    "0005_daily_availability",
  ]) {
    const ddl = await readFile(
      new URL(`../migrations/${id}.sql`, import.meta.url),
      "utf8",
    ).catch(() =>
      readFile(new URL(`../../migrations/${id}.sql`, import.meta.url), "utf8"),
    );
    const checksum = createHash("sha256").update(ddl).digest("hex");
    const migrationApplied = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(current_schema() || ':gabarita:migrations'))`,
      );
      const rows = await tx.execute<{ checksum: string }>(
        sql`select checksum from schema_migrations where id=${id}`,
      );
      if (rows[0]) {
        if (rows[0].checksum !== checksum)
          throw new Error(
            "Migration checksum mismatch. Do not edit applied migrations.",
          );
        return false;
      }
      await tx.execute(sql.raw(ddl));
      await tx.execute(
        sql`insert into schema_migrations(id,checksum) values(${id},${checksum})`,
      );
      return true;
    });
    applied ||= migrationApplied;
  }
  return { ...initial, applied };
}
