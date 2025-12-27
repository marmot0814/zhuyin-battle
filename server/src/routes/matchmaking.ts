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

// ELO 計算
function calculateElo(ratingA: number, ratingB: number, actualScoreA: number, kFactor: number = 32): number {
  const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(ratingA + kFactor * (actualScoreA - expectedScoreA));
}

// 定期處理匹配隊列
setInterval(() => {
  processQueue();
}, 5000); // 每 5 秒處理一次

function processQueue() {
  if (matchQueue.length < 2) return;

  // 依等待時間排序 (FIFO)
  matchQueue.sort((a, b) => a.timestamp - b.timestamp);

  const matchedIndices = new Set<number>();

  for (let i = 0; i < matchQueue.length; i++) {
    if (matchedIndices.has(i)) continue;

    const playerA = matchQueue[i];
    const waitTimeA = (Date.now() - playerA.timestamp) / 1000; // 秒
    
    // 允許的 Rating 差距：基礎 100 + 每等待 10 秒增加 50
    const allowedDiff = 100 + Math.floor(waitTimeA / 10) * 50;

    for (let j = i + 1; j < matchQueue.length; j++) {
      if (matchedIndices.has(j)) continue;

      const playerB = matchQueue[j];
      
      // 模式必須相同
      if (playerA.mode !== playerB.mode) continue;

      // 檢查 Rating 差距
      const ratingDiff = Math.abs(playerA.rating - playerB.rating);
      if (ratingDiff <= allowedDiff) {
        // 匹配成功
        matchedIndices.add(i);
        matchedIndices.add(j);
        
        createBattle(playerA, playerB, playerA.mode).then(battleId => {
          console.log(`Matched players ${playerA.username} and ${playerB.username} (Battle ${battleId})`);
          // 這裡不需要做什麼，因為客戶端會輪詢 /queue/status
        });
        break; 
      }
    }
  }

  // 移除已匹配的玩家
  // 從後往前刪除以避免索引問題
  const indicesToRemove = Array.from(matchedIndices).sort((a, b) => b - a);
  for (const index of indicesToRemove) {
    matchQueue.splice(index, 1);
  }
}

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

    // 嘗試觸發一次匹配處理
    processQueue();

    res.json({ status: 'waiting' });
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
          `SELECT u.username, u.rating, u.avatar_url, u.ranked_games_played
           FROM battles b
           JOIN users u ON (CASE WHEN b.player1_id = $1 THEN b.player2_id ELSE b.player1_id END) = u.id
           WHERE b.id = $2`,
          [userId, battleId]
        );

        const opponent = opponentResult.rows[0];
        if (opponent && opponent.ranked_games_played < 10) {
          opponent.rating = null; // Mask rating for unranked
        }
        delete opponent.ranked_games_played;

        return res.json({
          status: 'matched',
          battleId,
          opponent
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

import { gameManager } from '../game/GameManager';

// 創建對戰房間
async function createBattle(player1: QueuePlayer, player2: QueuePlayer, mode: string): Promise<string> {
  const result = await query(
    `INSERT INTO battles (player1_id, player2_id, mode, status, created_at)
     VALUES ($1, $2, $3, 'waiting', NOW())
     RETURNING id`,
    [player1.userId, player2.userId, mode]
  );

  const battleId = result.rows[0].id;
  
  // Initialize game in memory
  await gameManager.createGame(battleId, player1.userId, player2.userId, player1.username, player2.username, mode as 'ranked' | 'casual');

  return battleId;
}

// 獲取活躍對戰列表
router.get('/active', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-admin-password'] === 'f44946145';

    const result = await query(
      `SELECT b.id, b.mode, b.created_at,
              u1.id as player1_id, u1.username as player1_name, u1.avatar_url as player1_avatar, u1.rating as player1_rating, u1.ranked_games_played as player1_games,
              u2.id as player2_id, u2.username as player2_name, u2.avatar_url as player2_avatar, u2.rating as player2_rating, u2.ranked_games_played as player2_games
       FROM battles b
       JOIN users u1 ON b.player1_id = u1.id
       JOIN users u2 ON b.player2_id = u2.id
       WHERE b.status = 'playing' OR b.status = 'waiting'
       ORDER BY b.created_at DESC
       LIMIT 20`
    );
    
    const battles = result.rows.map(battle => {
      // Mask rating if ranked games < 10, unless admin
      if (!isAdmin) {
        if (battle.player1_games < 10) battle.player1_rating = null;
        if (battle.player2_games < 10) battle.player2_rating = null;
      }
      
      // Remove games count from response to keep it clean if not needed, or keep it.
      delete battle.player1_games;
      delete battle.player2_games;
      
      return battle;
    });

    res.json(battles);
  } catch (error) {
    console.error('Error fetching active battles:', error);
    res.status(500).json({ error: 'Failed to fetch active battles' });
  }
});

export default router;
