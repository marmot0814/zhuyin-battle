import { query } from '../index';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '004_add_rts_stats.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 004...');
    await query(sql);
    console.log('Migration 004 completed successfully.');
  } catch (error) {
    console.error('Migration 004 failed:', error);
    process.exit(1);
  }
}

runMigration();
