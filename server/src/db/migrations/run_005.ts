import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env before importing pool
const envPath = path.join(__dirname, '../../../../server/.env');
// Or just ../../../.env if we are in server/src/db/migrations
// Let's try to be robust.
const envPathCorrect = path.resolve(__dirname, '../../../.env');
console.log('Loading .env from:', envPathCorrect);
dotenv.config({ path: envPathCorrect });

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

import pool from '../index';

async function runMigration() {
  try {
    console.log('Running migration 005...');
    
    const sqlPath = path.join(__dirname, '005_add_is_read_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('Migration 005 completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration 005 failed:', error);
    process.exit(1);
  }
}

runMigration();
