import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env before importing pool
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

import pool from '../index';

async function runMigration() {
  try {
    console.log('Running migration 006...');
    
    const sqlPath = path.join(__dirname, '006_add_is_recalled.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('Migration 006 completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration 006 failed:', error);
    process.exit(1);
  }
}

runMigration();
