import express, { Request, Response } from 'express';
import { query } from '../db';
import { verifyToken } from './users';

const router = express.Router();

// 獲取我的好友列表
router.get('/my-friends', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const result = await query(
      `SELECT u.id, u.username, u.avatar_url, u.bio, u.rating, u.games_played, u.games_won, u.last_ping,
              EXTRACT(EPOCH FROM (NOW() - u.last_ping)) as seconds_offline
       FROM friends f
       JOIN users u ON (f.friend_id = u.id)
       WHERE f.user_id = $1 AND f.status = 'accepted'
       ORDER BY u.last_ping DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// 獲取線上用戶（非好友）
router.get('/online-users', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // 獲取最近 30 秒內 ping 的用戶（表示線上）
    const result = await query(
      `SELECT u.id, u.username, u.avatar_url, u.rating, u.games_played,
              EXTRACT(EPOCH FROM (NOW() - u.last_ping)) as seconds_offline
       FROM users u
       WHERE u.id != $1
         AND u.last_ping > NOW() - INTERVAL '30 seconds'
         AND NOT EXISTS (
           SELECT 1 FROM friends f 
           WHERE (f.user_id = $1 AND f.friend_id = u.id) 
              OR (f.user_id = u.id AND f.friend_id = $1)
         )
       ORDER BY u.last_ping DESC
       LIMIT 20`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// 獲取用戶詳情
router.get('/user/:userId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).userId;
    
    const result = await query(
      `SELECT u.id, u.username, u.avatar_url, u.bio, u.rating, u.games_played, u.games_won, u.last_online,
              EXTRACT(EPOCH FROM (NOW() - u.last_online)) as seconds_offline,
              EXISTS(SELECT 1 FROM friends WHERE user_id = $2 AND friend_id = $1 AND status = 'accepted') as is_friend
       FROM users u
       WHERE u.id = $1`,
      [userId, currentUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: 'Failed to fetch user detail' });
  }
});

// 發送好友請求
router.post('/add-friend/:friendId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendId } = req.params;
    
    if (userId === parseInt(friendId)) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }
    
    // 檢查是否已經是好友或有待處理請求
    const existing = await query(
      `SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Friend request already exists' });
    }
    
    // 創建好友請求（只有發送方的記錄，狀態為 pending）
    await query(
      `INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'pending')`,
      [userId, friendId]
    );
    
    res.json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// 獲取待處理的好友請求（收到的請求）
router.get('/pending-requests', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const result = await query(
      `SELECT f.id as request_id, u.id, u.username, u.avatar_url, u.rating, u.games_played
       FROM friends f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// 接受好友請求
router.post('/accept-friend/:requestId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;
    
    // 檢查請求是否存在且是發給當前用戶的
    const request = await query(
      `SELECT * FROM friends WHERE id = $1 AND friend_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );
    
    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    const senderId = request.rows[0].user_id;
    
    // 更新原請求為 accepted
    await query(
      `UPDATE friends SET status = 'accepted' WHERE id = $1`,
      [requestId]
    );
    
    // 創建反向關係
    await query(
      `INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'accepted')`,
      [userId, senderId]
    );
    
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// 拒絕好友請求
router.delete('/reject-friend/:requestId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;
    
    await query(
      `DELETE FROM friends WHERE id = $1 AND friend_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );
    
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend error:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// 移除好友
router.delete('/remove-friend/:friendId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendId } = req.params;
    
    await query(
      `DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );
    
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// 更新用戶 ping 時間（每 20 秒呼叫一次）
router.post('/ping', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    await query(
      `UPDATE users SET last_ping = NOW() WHERE id = $1`,
      [userId]
    );
    
    res.json({ message: 'Ping updated' });
  } catch (error) {
    console.error('Update ping error:', error);
    res.status(500).json({ error: 'Failed to update ping' });
  }
});

// 發送訊息給好友
router.post('/send-message/:friendId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendId } = req.params;
    const { content } = req.body;
    
    // 檢查是否為好友
    const friendCheck = await query(
      `SELECT 1 FROM friends 
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
       AND status = 'accepted'`,
      [userId, friendId]
    );
    
    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Can only send messages to friends' });
    }
    
    // 插入訊息
    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, sender_id, receiver_id, content, created_at`,
      [userId, friendId, content]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// 獲取與某個好友的聊天記錄
router.get('/messages/:friendId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendId } = req.params;
    
    // 檢查是否為好友
    const friendCheck = await query(
      `SELECT 1 FROM friends 
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
       AND status = 'accepted'`,
      [userId, friendId]
    );
    
    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Can only view messages with friends' });
    }
    
    // 獲取雙向訊息
    const result = await query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
              u.username as sender_username, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [userId, friendId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 更新用戶上線時間（保留用於登出）
router.post('/update-online', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    await query(
      `UPDATE users SET last_online = NOW(), last_ping = NOW() WHERE id = $1`,
      [userId]
    );
    
    res.json({ message: 'Online status updated' });
  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({ error: 'Failed to update online status' });
  }
});

export default router;
