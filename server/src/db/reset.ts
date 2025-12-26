import pool from './index';
import fs from 'fs';
import path from 'path';

async function resetDatabase() {
  try {
    console.log('Dropping existing tables...');
    
    // Drop tables in correct order (child tables first)
    await pool.query('DROP TABLE IF EXISTS moves CASCADE');
    await pool.query('DROP TABLE IF EXISTS board_tiles CASCADE');
    await pool.query('DROP TABLE IF EXISTS room_players CASCADE');
    await pool.query('DROP TABLE IF EXISTS rooms CASCADE');
    await pool.query('DROP TABLE IF EXISTS friends CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('Tables dropped successfully.');
    
    // Read and execute init.sql
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    console.log('Creating new tables...');
    await pool.query(initSql);
    
    console.log('Database reset successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
