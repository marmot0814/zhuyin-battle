import express from 'express';
import { gameManager } from '../game/GameManager';
import pool from '../db';
import { verifyToken } from './users';

const router = express.Router();

// Get Game State
router.get('/:id', verifyToken, async (req: any, res: any) => {
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
    isMyTurn: game.gameMode === 'ranked_rts' || game.turn === req.userId,
    currentUserId: req.userId,
    skillCharges: game.skillCharges,
    skillInventory: game.skillInventory,
    pauseRequest: game.pauseRequest,
    resumeRequest: game.resumeRequest
  });
});

// Surrender
router.post('/:id/surrender', verifyToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const userId = req.userId;
  const result = gameManager.surrender(battleId, userId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Request Timeout
router.post('/:id/timeout/request', verifyToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const userId = req.userId;
  const result = gameManager.requestTimeout(battleId, userId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Respond Timeout
router.post('/:id/timeout/respond', verifyToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const userId = req.userId;
  const { accept } = req.body;
  const result = gameManager.respondTimeout(battleId, userId, accept);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Request Resume
router.post('/:id/resume/request', verifyToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const userId = req.userId;
  const result = gameManager.requestResume(battleId, userId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Respond Resume
router.post('/:id/resume/respond', verifyToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const userId = req.userId;
  const { accept } = req.body;
  const result = gameManager.respondResume(battleId, userId, accept);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Use Skill
router.post('/:id/skill', verifyToken, async (req: any, res: any) => {
  const battleId = req.params.id;
  const userId = req.userId;

  try {
    const result = gameManager.useSkill(battleId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Submit Move
router.post('/:id/move', verifyToken, async (req: any, res: any) => {
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
