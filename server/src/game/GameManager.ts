import fs from 'fs';
import path from 'path';
import { query } from '../db';

const DICTIONARY_PATH = path.join(__dirname, '../../clean_bopomofo.txt');
const PHONETICS = [
  'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 'ㄍ', 'ㄎ', 'ㄏ',
  'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ',
  'ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ', 'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'
];

// Weighted phonetics could be better, but uniform for now
function getRandomPhonetic() {
  return PHONETICS[Math.floor(Math.random() * PHONETICS.length)];
}

interface Tile {
  r: number;
  c: number;
  state: 'empty' | 'red_castle' | 'blue_castle' | 'red_territory' | 'blue_territory';
  phonetic: string | null;
  owner: number | null; // playerId
}

interface GameState {
  battleId: string;
  player1Id: number; // Red
  player2Id: number; // Blue
  player1Name: string;
  player2Name: string;
  gameMode: 'ranked' | 'casual' | 'custom';
  board: Tile[][];
  turn: number; // playerId
  timer: {
    [playerId: number]: number; // seconds remaining
  };
  lastActionTime: number;
  status: 'playing' | 'finished';
  winner: number | null;
  logs: string[];
}

class GameManager {
  private games: Map<string, GameState> = new Map();
  private dictionary: Set<string> = new Set();
  private ROWS = 8;
  private COLS = 8;

  constructor() {
    this.loadDictionary();
    // Start timer loop
    setInterval(() => this.tick(), 1000);
  }

  private loadDictionary() {
    try {
      const data = fs.readFileSync(DICTIONARY_PATH, 'utf-8');
      const lines = data.split('\n');
      for (const line of lines) {
        const word = line.trim();
        if (word) this.dictionary.add(word);
      }
      console.log(`Loaded ${this.dictionary.size} words into dictionary.`);
    } catch (error) {
      console.error('Failed to load dictionary:', error);
    }
  }

  public async createGame(battleId: string, player1Id: number, player2Id: number, player1Name: string, player2Name: string, gameMode: 'ranked' | 'casual' | 'custom') {
    const board = this.initBoard(player1Id, player2Id);
    
    const game: GameState = {
      battleId,
      player1Id,
      player2Id,
      player1Name,
      player2Name,
      gameMode,
      board,
      turn: player1Id, // Player 1 starts
      timer: {
        [player1Id]: 120,
        [player2Id]: 120
      },
      lastActionTime: Date.now(),
      status: 'playing',
      winner: null,
      logs: [`Game started! ${player1Name} (Red) vs ${player2Name} (Blue)`]
    };

    this.games.set(battleId, game);
    return game;
  }

  private initBoard(p1: number, p2: number): Tile[][] {
    const board: Tile[][] = [];
    for (let r = 0; r < this.ROWS; r++) {
      const row: Tile[] = [];
      for (let c = 0; c < this.COLS; c++) {
        row.push({
          r, c,
          state: 'empty',
          phonetic: null,
          owner: null
        });
      }
      board.push(row);
    }

    // Set Castles
    // Red (P1): Top Right [0, 7]
    board[0][this.COLS - 1].state = 'red_castle';
    board[0][this.COLS - 1].owner = p1;

    // Blue (P2): Bottom Left [7, 0]
    board[this.ROWS - 1][0].state = 'blue_castle';
    board[this.ROWS - 1][0].owner = p2;

    // Initial Frontier
    this.updateFrontier(board, p1);
    this.updateFrontier(board, p2);

    return board;
  }

  private updateFrontier(board: Tile[][], playerId: number) {
    // Find all tiles owned by player
    // Find neighbors that are empty/neutral
    // Assign phonetic if null
    
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const tile = board[r][c];
        if (tile.owner === playerId) {
          const neighbors = this.getNeighbors(r, c);
          for (const [nr, nc] of neighbors) {
            const neighbor = board[nr][nc];
            if (neighbor.state === 'empty' && neighbor.phonetic === null) {
              neighbor.phonetic = getRandomPhonetic();
            }
          }
        }
      }
    }
  }

  private regenerateFrontier(board: Tile[][], playerId: number) {
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const tile = board[r][c];
        // If it's an empty tile with a phonetic, it might be part of the frontier
        // We can just reset all empty tiles with phonetics to new random ones
        // Or be more specific to the player's frontier.
        // Let's just re-roll all empty tiles that have phonetics near this player's territory.
        if (tile.state === 'empty' && tile.phonetic !== null) {
           // Check if it neighbors this player's territory
           const neighbors = this.getNeighbors(r, c);
           if (neighbors.some(([nr, nc]) => board[nr][nc].owner === playerId)) {
             tile.phonetic = getRandomPhonetic();
           }
        }
      }
    }
  }

  private isSolvable(board: Tile[][], playerId: number): boolean {
    // DFS to find if any valid word can be formed starting from any tile
    // This is computationally expensive. We need a limit.
    // Optimization: Only check paths starting from tiles adjacent to player's territory?
    // Actually, the rule is: Select ANY path. If it connects to territory, it's captured.
    // So we just need to find ANY valid word on the board that touches the player's territory.
    
    // 1. Identify all available tiles (empty with phonetic)
    // 2. Identify "start nodes" (tiles adjacent to territory)
    // 3. DFS from start nodes to find a word in dictionary.
    
    const startNodes: {r: number, c: number}[] = [];
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const tile = board[r][c];
        if (tile.state === 'empty' && tile.phonetic) {
          const neighbors = this.getNeighbors(r, c);
          if (neighbors.some(([nr, nc]) => board[nr][nc].owner === playerId)) {
            startNodes.push({r, c});
          }
        }
      }
    }

    // Limit search depth or time?
    // Dictionary is a Set.
    // We can do a DFS.
    
    for (const start of startNodes) {
      if (this.dfsFindWord(board, start.r, start.c, new Set(), "")) {
        return true;
      }
    }
    return false;
  }

  private dfsFindWord(board: Tile[][], r: number, c: number, visited: Set<string>, currentWord: string): boolean {
    const key = `${r},${c}`;
    if (visited.has(key)) return false;
    
    const tile = board[r][c];
    if (!tile.phonetic) return false;
    
    const newWord = currentWord + tile.phonetic;
    visited.add(key);

    // Pruning: Check if newWord is a prefix of any word in dictionary?
    // Since we don't have a Trie, we can't easily check prefix.
    // But max word length is usually small (e.g. 4).
    if (newWord.length > 4) {
      visited.delete(key);
      return false;
    }

    if (this.dictionary.has(newWord)) {
      return true;
    }

    const neighbors = this.getNeighbors(r, c);
    for (const [nr, nc] of neighbors) {
      if (board[nr][nc].state === 'empty' && board[nr][nc].phonetic) {
        if (this.dfsFindWord(board, nr, nc, visited, newWord)) {
          return true;
        }
      }
    }

    visited.delete(key);
    return false;
  }

  private getNeighbors(r: number, c: number): [number, number][] {
    const neighbors: [number, number][] = [];
    const isEven = r % 2 === 0;
    
    const offsets = [
      [0, -1], [0, 1], // Left, Right
      [-1, isEven ? -1 : 0], [-1, isEven ? 0 : 1], // Top-Left, Top-Right
      [1, isEven ? -1 : 0], [1, isEven ? 0 : 1]    // Bottom-Left, Bottom-Right
    ];

    for (const [dr, dc] of offsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
        neighbors.push([nr, nc]);
      }
    }
    return neighbors;
  }

  public getGame(battleId: string) {
    return this.games.get(battleId);
  }

  public async submitTurn(battleId: string, playerId: number, sequence: {r: number, c: number}[]) {
    const game = this.games.get(battleId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'playing') throw new Error('Game is finished');
    if (game.turn !== playerId) throw new Error('Not your turn');

    // 1. Validate Sequence Connectivity
    if (sequence.length === 0) throw new Error('Empty sequence');
    
    // REMOVED: Check if sequence is a valid path (User requested non-adjacent selection)
    /*
    for (let i = 0; i < sequence.length - 1; i++) {
      const curr = sequence[i];
      const next = sequence[i+1];
      const neighbors = this.getNeighbors(curr.r, curr.c);
      if (!neighbors.some(([nr, nc]) => nr === next.r && nc === next.c)) {
        throw new Error('Invalid path: tiles not adjacent');
      }
    }
    */

    // Check uniqueness
    const seen = new Set<string>();
    for (const p of sequence) {
      const key = `${p.r},${p.c}`;
      if (seen.has(key)) throw new Error('Duplicate tiles in sequence');
      seen.add(key);
    }

    // 2. Validate Word
    let word = '';
    for (const p of sequence) {
      const tile = game.board[p.r][p.c];
      if (!tile.phonetic) throw new Error('Tile has no phonetic');
      word += tile.phonetic;
    }

    if (!this.dictionary.has(word)) {
      throw new Error(`Invalid word: ${word}`);
    }

    // 3. REMOVED: Validate Connection to Territory (User requested only connected parts become territory)
    /*
    let connected = false;
    for (const p of sequence) {
      const neighbors = this.getNeighbors(p.r, p.c);
      for (const [nr, nc] of neighbors) {
        if (game.board[nr][nc].owner === playerId) {
          connected = true;
          break;
        }
      }
      if (connected) break;
    }

    if (!connected) {
      throw new Error('Sequence must connect to your territory');
    }
    */

    // 4. Apply Changes
    // Identify which tiles in the sequence are connected to player's territory (directly or via other sequence tiles)
    const candidates = new Set<string>();
    const candidateTiles: Tile[] = [];
    for (const p of sequence) {
      candidates.add(`${p.r},${p.c}`);
      candidateTiles.push(game.board[p.r][p.c]);
    }

    const captured = new Set<string>();
    const queue: Tile[] = [];

    // Initial pass: Find candidates adjacent to existing territory
    for (const tile of candidateTiles) {
      const neighbors = this.getNeighbors(tile.r, tile.c);
      for (const [nr, nc] of neighbors) {
        const neighbor = game.board[nr][nc];
        // Check if neighbor is owned by player (territory or castle)
        if (neighbor.owner === playerId) {
          const key = `${tile.r},${tile.c}`;
          if (!captured.has(key)) {
            captured.add(key);
            queue.push(tile);
          }
          break; 
        }
      }
    }

    // BFS to find all connected candidates
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = this.getNeighbors(curr.r, curr.c);
      
      for (const [nr, nc] of neighbors) {
        const key = `${nr},${nc}`;
        // If neighbor is a candidate and not yet captured
        if (candidates.has(key) && !captured.has(key)) {
          captured.add(key);
          queue.push(game.board[nr][nc]);
        }
      }
    }

    let castleTouched = false;
    const opponentId = playerId === game.player1Id ? game.player2Id : game.player1Id;
    const opponentCastleState = playerId === game.player1Id ? 'blue_castle' : 'red_castle';

    // Apply changes only to captured tiles
    for (const p of sequence) {
      const key = `${p.r},${p.c}`;
      if (captured.has(key)) {
        const tile = game.board[p.r][p.c];
        
        const neighbors = this.getNeighbors(p.r, p.c);
        for (const [nr, nc] of neighbors) {
          const neighbor = game.board[nr][nc];

          // Check if touching opponent castle
          if (neighbor.state === opponentCastleState) {
            castleTouched = true;
          }
          
          // Destroy adjacent opponent territory
          if (neighbor.owner === opponentId && neighbor.state !== opponentCastleState) {
            neighbor.state = 'empty';
            neighbor.owner = null;
            neighbor.phonetic = getRandomPhonetic();
          }
        }

        // Update tile ownership
        if (tile.state === 'empty') { // Can capture empty
           tile.state = playerId === game.player1Id ? 'red_territory' : 'blue_territory';
           tile.owner = playerId;
           tile.phonetic = null; 
        }
      }
    }

    // Update Frontier
    this.updateFrontier(game.board, playerId);
    
    // Ensure Solvability (Check if at least one valid word exists from frontier)
    // If not, regenerate some frontier tiles
    let attempts = 0;
    while (!this.isSolvable(game.board, playerId) && attempts < 5) {
      console.log(`Board not solvable for player ${playerId}, regenerating frontier...`);
      this.regenerateFrontier(game.board, playerId);
      attempts++;
    }

    // Update Timer
    game.timer[playerId] += 30;
    
    // Switch Turn
    game.turn = opponentId;
    game.lastActionTime = Date.now();

    // Check Win
    if (castleTouched) {
      await this.endGame(game, playerId, 'castle_capture');
    } else {
      const playerName = playerId === game.player1Id ? game.player1Name : game.player2Name;
      game.logs.push(`${playerName} played ${word}`);
    }

    return { success: true, word };
  }

  private tick() {
    const now = Date.now();
    for (const game of this.games.values()) {
      if (game.status === 'playing') {
        const elapsed = (now - game.lastActionTime) / 1000;
        // We don't subtract from stored timer here because we want to sync with requests?
        // Actually, better to just decrement the current turn player's timer.
        // But `tick` runs every second.
        
        // Let's just decrement the current player's timer
        if (game.timer[game.turn] > 0) {
          game.timer[game.turn] -= 1;
        } else {
          // Time out
          const winner = game.turn === game.player1Id ? game.player2Id : game.player1Id;
          this.endGame(game, winner, 'timeout');
        }
      }
    }
  }

  private async endGame(game: GameState, winnerId: number, reason: string) {
    if (game.status === 'finished') return;
    
    game.status = 'finished';
    game.winner = winnerId;
    const winnerName = winnerId === game.player1Id ? game.player1Name : game.player2Name;
    game.logs.push(`Game Over! Winner: ${winnerName} (${reason})`);

    // Update DB
    try {
      const p1 = game.player1Id;
      const p2 = game.player2Id;
      
      const res = await query(`SELECT id, rating FROM users WHERE id IN ($1, $2)`, [p1, p2]);
      const users = res.rows;
      const user1 = users.find(u => u.id === p1);
      const user2 = users.find(u => u.id === p2);

      if (user1 && user2) {
        const k = 32;
        const actualScore1 = winnerId === p1 ? 1 : 0;
        const actualScore2 = winnerId === p2 ? 1 : 0;
        
        // Calculate new ratings if ranked
        let newRating1 = user1.rating;
        let newRating2 = user2.rating;

        if (game.gameMode === 'ranked') {
          const expected1 = 1 / (1 + Math.pow(10, (user2.rating - user1.rating) / 400));
          const expected2 = 1 / (1 + Math.pow(10, (user1.rating - user2.rating) / 400));

          newRating1 = Math.round(user1.rating + k * (actualScore1 - expected1));
          newRating2 = Math.round(user2.rating + k * (actualScore2 - expected2));
        }

        // Update User 1
        let query1 = `UPDATE users SET games_played = games_played + 1, games_won = games_won + $1`;
        const params1: any[] = [actualScore1];
        
        if (game.gameMode === 'ranked') {
          query1 += `, rating = $2, ranked_games_played = ranked_games_played + 1, ranked_games_won = ranked_games_won + $3`;
          params1.push(newRating1, actualScore1);
        } else {
          query1 += `, casual_games_played = casual_games_played + 1, casual_games_won = casual_games_won + $2`;
          params1.push(actualScore1);
        }
        query1 += ` WHERE id = $${params1.length + 1}`;
        params1.push(p1);
        await query(query1, params1);

        // Update User 2
        let query2 = `UPDATE users SET games_played = games_played + 1, games_won = games_won + $1`;
        const params2: any[] = [actualScore2];
        
        if (game.gameMode === 'ranked') {
          query2 += `, rating = $2, ranked_games_played = ranked_games_played + 1, ranked_games_won = ranked_games_won + $3`;
          params2.push(newRating2, actualScore2);
        } else {
          query2 += `, casual_games_played = casual_games_played + 1, casual_games_won = casual_games_won + $2`;
          params2.push(actualScore2);
        }
        query2 += ` WHERE id = $${params2.length + 1}`;
        params2.push(p2);
        await query(query2, params2);
      }

      // Delete battle from DB as requested
      await query(`DELETE FROM battles WHERE id = $1`, [game.battleId]);

      // Remove from memory after some time (keep it briefly for clients to fetch final state)
      setTimeout(() => {
        this.games.delete(game.battleId);
      }, 60000); // 1 minute

    } catch (e) {
      console.error('Error ending game:', e);
    }
  }
}

export const gameManager = new GameManager();
