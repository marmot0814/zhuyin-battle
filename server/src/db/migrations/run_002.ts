import { query } from '../index';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '002_add_battle_invites.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 002...');
    await query(sql);
    console.log('Migration 002 completed successfully.');
  } catch (error) {
    console.error('Migration 002 failed:', error);
  }
}

runMigration();
