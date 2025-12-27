import express, { Request, Response } from 'express';
import { UserModel } from '../models/User';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
export function verifyToken(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    (req as any).userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get rank distribution
router.get('/rank-distribution', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        CASE 
          WHEN rating < 800 THEN 'IRON'
          WHEN rating < 1000 THEN 'BRONZE'
          WHEN rating < 1200 THEN 'SILVER'
          WHEN rating < 1500 THEN 'GOLD'
          WHEN rating < 1800 THEN 'PLATINUM'
          WHEN rating < 2200 THEN 'DIAMOND'
          WHEN rating < 2500 THEN 'MASTER'
          ELSE 'GRANDMASTER'
        END as rank,
        COUNT(*) as count
      FROM users
      WHERE games_played >= 10
      GROUP BY rank
    `);
    
    // Ensure all ranks are present
    const ranks = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER'];
    const distribution = ranks.map(r => {
      const found = result.rows.find((row: any) => row.rank === r);
      return {
        rank: r,
        count: found ? parseInt(found.count) : 0
      };
    });

    res.json(distribution);
  } catch (error) {
    console.error('Error fetching rank distribution:', error);
    res.status(500).json({ error: 'Failed to fetch rank distribution' });
  }
});

// Get current user info
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Register user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists (by email)
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await UserModel.create({ username, email, password });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user (simplified - in production use proper password verification)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await UserModel.verifyPassword(user.id, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 更新 last_ping 時間（登入時）
    await query('UPDATE users SET last_ping = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile (requires token)
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const result = await query(
      `SELECT id, username, email, avatar_url, bio, rating, 
              ranked_games_played, ranked_games_won,
              casual_games_played, casual_games_won,
              custom_games_played, custom_games_won,
              created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    // For 'me', maybe we show rating even if placement? 
    // User said "backend api cannot return his rating, otherwise I can see it from frontend api".
    // This implies even for 'me' if I inspect network.
    // But usually you want to see your own progress.
    // Let's assume for now we show it for 'me' because otherwise how do they know?
    // Or maybe they see "Unranked" in UI.
    // If the requirement is strict "cannot return his rating", then we hide it.
    // But usually placement rating is hidden from *others*.
    // Let's hide it if < 10 games, consistent with others.
    if (user.ranked_games_played < 10) {
      user.rating = null;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get user by username (public)
router.get('/:username', async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile (requires token)
router.patch('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { avatar_url, bio, username } = req.body;

    // username 可以重複，不需要檢查唯一性

    const user = await UserModel.updateProfile(userId, { avatar_url, bio, username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get top players
router.get('/leaderboard/top', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const players = await UserModel.getTopPlayers(limit);
    res.json(players);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Google 登入路由 - 第一步：檢查用戶是否存在
router.post('/google-login', async (req: Request, res: Response) => {
  try {
    const { googleUser } = req.body; // 從前端傳來的 Google 使用者資訊

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ error: 'Missing Google user information' });
    }

    const { email } = googleUser;

    // 檢查資料庫是否已有此 Email
    const user = await UserModel.findByEmail(email);

    if (!user) {
      // 新用戶，需要進行角色創造
      res.json({ needsCharacterCreation: true, email });
    } else {
      // 現有用戶，直接登入
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user, token });
    }
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// 完成角色創造
router.post('/create-character', async (req: Request, res: Response) => {
  try {
    const { email, username, avatar_url, bio } = req.body;

    if (!email || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 檢查 email 是否已註冊
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 創建新用戶（用 email 作為密碼，因為是 Google 登入）
    const user = await UserModel.create({
      username,
      email,
      password: email, // Google 登入不會用到密碼
    });

    // 更新頭貼和 bio
    if (avatar_url || bio) {
      await UserModel.updateProfile(user.id, { avatar_url, bio });
    }

    // 取得更新後的用戶資料
    const updatedUser = await UserModel.findById(user.id);

    // 簽發 JWT Token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: updatedUser, token });
  } catch (error) {
    console.error('Create character error:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// 登出 - 更新 last_online 為很久以前
router.post('/logout', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // 將 last_online 設為 1 小時前，確保不會顯示為線上
    await query(
      `UPDATE users SET last_online = NOW() - INTERVAL '1 hour' WHERE id = $1`,
      [userId]
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
