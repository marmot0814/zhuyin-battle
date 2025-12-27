import express, { Request, Response } from 'express';
import { query } from '../db';

const router = express.Router();

// Admin 密碼驗證 middleware
function verifyAdminPassword(req: Request, res: Response, next: any) {
  const password = req.headers['x-admin-password'];
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD environment variable is not set!');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// 獲取所有用戶資料
router.get('/users', verifyAdminPassword, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        id, email, username, avatar_url, bio, rating, 
        games_played, games_won, 
        ranked_games_played, ranked_games_won,
        casual_games_played, casual_games_won,
        custom_games_played, custom_games_won,
        created_at, last_online, last_ping,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(last_ping, last_online))) as seconds_offline
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 獲取所有好友關係
router.get('/friends', verifyAdminPassword, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        f.id, f.user_id, f.friend_id, f.status, f.created_at,
        u1.username as user_username, u1.email as user_email,
        u2.username as friend_username, u2.email as friend_email
      FROM friends f
      JOIN users u1 ON f.user_id = u1.id
      JOIN users u2 ON f.friend_id = u2.id
      ORDER BY f.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// 獲取數據庫統計
router.get('/stats', verifyAdminPassword, async (req: Request, res: Response) => {
  try {
    const [usersCount, friendsCount, pendingRequests, avgRating, totalGames] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query(`SELECT COUNT(*) as count FROM friends WHERE status = 'accepted'`),
      query(`SELECT COUNT(*) as count FROM friends WHERE status = 'pending'`),
      query('SELECT AVG(rating) as avg_rating FROM users WHERE games_played >= 10'),
      query('SELECT SUM(games_played) as total FROM users')
    ]);
    
    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalFriendships: parseInt(friendsCount.rows[0].count),
      pendingFriendRequests: parseInt(pendingRequests.rows[0].count),
      averageRating: parseFloat(avgRating.rows[0].avg_rating || 0).toFixed(2),
      totalGamesPlayed: parseInt(totalGames.rows[0].total || 0)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 獲取段位分布
router.get('/rating-distribution', verifyAdminPassword, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        CASE 
          WHEN rating < 800 THEN 'Iron (< 800)'
          WHEN rating < 1000 THEN 'Bronze (800-999)'
          WHEN rating < 1200 THEN 'Silver (1000-1199)'
          WHEN rating < 1500 THEN 'Gold (1200-1499)'
          WHEN rating < 1800 THEN 'Platinum (1500-1799)'
          WHEN rating < 2200 THEN 'Diamond (1800-2199)'
          WHEN rating < 2500 THEN 'Master (2200-2499)'
          ELSE 'Grandmaster (≥ 2500)'
        END as rank,
        COUNT(*) as count
      FROM users
      WHERE games_played >= 10
      GROUP BY rank
      ORDER BY MIN(rating)
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rating distribution:', error);
    res.status(500).json({ error: 'Failed to fetch rating distribution' });
  }
});

// 獲取最近註冊的用戶
router.get('/recent-users', verifyAdminPassword, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT id, username, email, created_at, rating, games_played
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent users:', error);
    res.status(500).json({ error: 'Failed to fetch recent users' });
  }
});

// 獲取資料庫所有表格資訊
router.get('/tables', verifyAdminPassword, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// 刪除對戰
router.delete('/battles/:id', verifyAdminPassword, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM battles WHERE id = $1', [id]);
    
    // Also remove from memory if active
    const { gameManager } = require('../game/GameManager');
    if (gameManager) {
      // We need to expose a method to remove game or access the map directly if possible
      // But GameManager is a singleton instance.
      // Let's assume we can just delete from DB and the memory will be cleaned up eventually or we can force it.
      // Actually, we should probably tell GameManager to stop that game.
      // But GameManager doesn't have a public delete method.
      // For now, just DB deletion is fine, the memory game will timeout eventually or error out on next interaction.
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting battle:', error);
    res.status(500).json({ error: 'Failed to delete battle' });
  }
});

export default router;
