import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bouncer',
  user: process.env.DB_USER || 'bouncer',
  password: process.env.DB_PASSWORD,
});

const runMigration = async (migrationFile: string) => {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '../../../database/migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    console.log(`Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`Error running migration ${migrationFile}:`, error);
    throw error;
  } finally {
    await pool.end();
  }
};

const runAllMigrations = async () => {
  const migrationsDir = path.join(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    try {
      await runMigration(file);
    } catch (error) {
      console.error(`Migration ${file} failed, stopping execution`);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully');
};

// Run specific migration if provided, otherwise run all
const migrationFile = process.argv[2];

if (migrationFile) {
  runMigration(migrationFile)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  runAllMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
