import { query } from '../index';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '003_add_ban_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 003...');
    await query(sql);
    console.log('Migration 003 completed successfully.');
  } catch (error) {
    console.error('Migration 003 failed:', error);
    process.exit(1);
  }
}

runMigration();
