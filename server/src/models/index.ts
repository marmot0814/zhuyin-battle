// web/app/db/index.ts (範例)
import { Pool } from 'pg'; // 如果你用的是 PostgreSQL

const pool = new Pool({
  // 你的資料庫連線資訊
  connectionString: process.env.DATABASE_URL,
});

// 這裡就是 UserModel 需要的 query 函式
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};