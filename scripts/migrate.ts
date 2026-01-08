import 'dotenv/config';
import { Kysely, Migrator, FileMigrationProvider, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const command = process.argv[2] as string | undefined;

  if (!command || !['up', 'down', 'status'].includes(command)) {
    console.log('Usage: migrate <up|down|status>');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_POSTGRES_HOST,
    port: parseInt(process.env.DB_POSTGRES_PORT || '5432'),
    database: process.env.DB_POSTGRES_NAME,
    user: process.env.DB_POSTGRES_USER,
    password: process.env.DB_POSTGRES_PASSWORD,
    ssl: false,
  });

  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({ pool }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../src/lib/database/migrations'),
    }),
  });

  try {
    switch (command) {
      case 'up': {
        const { results, error } = await migrator.migrateToLatest();
        results?.forEach((r) => {
          console.log(`${r.status}: ${r.migrationName}`);
        });
        if (error) throw error;
        if (!results?.length) console.log('No pending migrations');
        break;
      }

      case 'down': {
        const { results, error } = await migrator.migrateDown();
        results?.forEach((r) => {
          console.log(`Rolled back: ${r.migrationName}`);
        });
        if (error) throw error;
        if (!results?.length) console.log('No migrations to rollback');
        break;
      }

      case 'status': {
        const migrations = await migrator.getMigrations();
        migrations.forEach((m) => {
          const status = m.executedAt ? `✓ ${m.executedAt.toISOString()}` : '○ pending';
          console.log(`${status} - ${m.name}`);
        });
        break;
      }
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
