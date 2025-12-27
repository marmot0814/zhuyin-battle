import { query } from '../index';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '001_add_stats_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration...');
    await query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
