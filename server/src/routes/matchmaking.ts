import express, { Request, Response } from 'express';
import { query } from '../db';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 匹配隊列
interface QueuePlayer {
  userId: number;
  username: string;
  rating: number;
  mode: 'ranked' | 'casual';
  timestamp: number;
}

const matchQueue: QueuePlayer[] = [];

// 驗證 JWT middleware
function authenticateToken(req: any, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// 加入匹配隊列
router.post('/queue/join', authenticateToken, async (req: any, res: Response) => {
  try {
    const { mode } = req.body; // 'ranked' or 'casual'
    const userId = req.userId;

    // 檢查用戶是否已在隊列中
    const existingIndex = matchQueue.findIndex(p => p.userId === userId);
    if (existingIndex !== -1) {
      return res.status(400).json({ error: 'Already in queue' });
    }

    // 獲取用戶信息
    const userResult = await query('SELECT username, rating FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // 加入隊列
    const player: QueuePlayer = {
      userId,
      username: user.username,
      rating: user.rating,
      mode,
      timestamp: Date.now()
    };

    matchQueue.push(player);

    // 嘗試匹配
    const match = findMatch(player);
    
    if (match) {
      // 找到對手，創建對戰房間
      const battleId = await createBattle(player, match, mode);
      
      // 從隊列移除兩位玩家
      const playerIndex = matchQueue.findIndex(p => p.userId === player.userId);
      const matchIndex = matchQueue.findIndex(p => p.userId === match.userId);
      if (playerIndex !== -1) matchQueue.splice(playerIndex, 1);
      if (matchIndex !== -1) matchQueue.splice(matchIndex, 1);

      res.json({ 
        status: 'matched',
        battleId,
        opponent: {
          username: match.username,
          rating: match.rating
        }
      });
    } else {
      res.json({ status: 'waiting' });
    }
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

// 離開匹配隊列
router.post('/queue/leave', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const index = matchQueue.findIndex(p => p.userId === userId);
    
    if (index !== -1) {
      matchQueue.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Not in queue' });
    }
  } catch (error) {
    console.error('Error leaving queue:', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

// 檢查匹配狀態
router.get('/queue/status', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const player = matchQueue.find(p => p.userId === userId);
    
    if (!player) {
      // 檢查是否已匹配（在對戰中）
      const battleResult = await query(
        `SELECT id FROM battles WHERE (player1_id = $1 OR player2_id = $1) AND status = 'waiting'`,
        [userId]
      );

      if (battleResult.rows.length > 0) {
        const battleId = battleResult.rows[0].id;
        const opponentResult = await query(
          `SELECT u.username, u.rating, u.avatar_url 
           FROM battles b
           JOIN users u ON (CASE WHEN b.player1_id = $1 THEN b.player2_id ELSE b.player1_id END) = u.id
           WHERE b.id = $2`,
          [userId, battleId]
        );

        return res.json({
          status: 'matched',
          battleId,
          opponent: opponentResult.rows[0]
        });
      }

      return res.json({ status: 'not_in_queue' });
    }

    res.json({ status: 'waiting', queueSize: matchQueue.length });
  } catch (error) {
    console.error('Error checking queue status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// 匹配算法
function findMatch(player: QueuePlayer): QueuePlayer | null {
  const candidates = matchQueue.filter(p => 
    p.userId !== player.userId && 
    p.mode === player.mode
  );

  if (candidates.length === 0) return null;

  // 簡單匹配：找最近加入的玩家（FIFO）
  // 未來可以加入 rating 範圍匹配
  return candidates[0];
}

// 創建對戰房間
async function createBattle(player1: QueuePlayer, player2: QueuePlayer, mode: string): Promise<number> {
  const result = await query(
    `INSERT INTO battles (player1_id, player2_id, mode, status, created_at)
     VALUES ($1, $2, $3, 'waiting', NOW())
     RETURNING id`,
    [player1.userId, player2.userId, mode]
  );

  return result.rows[0].id;
}

export default router;
