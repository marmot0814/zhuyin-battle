import express from 'express';
import { gameManager } from '../game/GameManager';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Get Game State
router.get('/:id', authenticateToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const game = gameManager.getGame(battleId);
  
  if (!game) {
    // Try to load from DB if not in memory? 
    // For now, assume active games are in memory.
    return res.status(404).json({ error: 'Game not found or finished' });
  }

  let player1Name = 'Player 1';
  let player2Name = 'Player 2';
  let gameMode = 'casual';

  try {
    const usersRes = await pool.query(
      'SELECT id, username FROM users WHERE id IN ($1, $2)',
      [game.player1Id, game.player2Id]
    );
    const p1 = usersRes.rows.find((u: any) => u.id === game.player1Id);
    const p2 = usersRes.rows.find((u: any) => u.id === game.player2Id);
    if (p1) player1Name = p1.username;
    if (p2) player2Name = p2.username;

    const battleRes = await pool.query('SELECT mode FROM battles WHERE id = $1', [battleId]);
    if (battleRes.rows.length > 0) {
      gameMode = battleRes.rows[0].mode;
    }
  } catch (e) {
    console.error('Failed to fetch player names or game mode', e);
  }

  res.json({
    battleId: game.battleId,
    player1Id: game.player1Id,
    player2Id: game.player2Id,
    player1Name,
    player2Name,
    gameMode,
    board: game.board,
    turn: game.turn,
    timer: game.timer,
    status: game.status,
    winner: game.winner,
    logs: game.logs,
    isMyTurn: game.turn === req.userId
  });
});

// Submit Move
router.post('/:id/move', authenticateToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const { sequence } = req.body; // Array of {r, c}

  try {
    const result = await gameManager.submitTurn(battleId, req.userId, sequence);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
