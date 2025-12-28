import fs from 'fs';
import path from 'path';
import { query } from '../db';

const DICTIONARY_PATH = path.join(__dirname, '../../clean_bopomofo.txt');
const INITIALS = [
  'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 'ㄍ', 'ㄎ', 'ㄏ',
  'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ'
];
const FINALS = [
  'ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ', 'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'
];
const PHONETICS = [...INITIALS, ...FINALS];

interface Tile {
  r: number;
  c: number;
  state: 'empty' | 'white_empty' | 'white_phonetic' | 'red_castle' | 'blue_castle' | 'red_territory' | 'blue_territory';
  phonetic: string | null;
  owner: number | null; // playerId
}

interface GameState {
  battleId: string;
  player1Id: number; // Red
  player2Id: number; // Blue
  player1Name: string;
  player2Name: string;
  gameMode: 'ranked' | 'casual' | 'custom' | 'ranked_rts' | 'casual_rts' | 'custom_rts';
  board: Tile[][];
  turn: number; // playerId
  timer: {
    [playerId: number]: number; // seconds remaining
  };
  lastActionTime: number;
  status: 'playing' | 'finished' | 'paused';
  winner: number | null;
  logs: string[];
  skillCharges: { [playerId: number]: number };
  skillInventory: { [playerId: number]: number };
  timeSettings?: {
    type: 'unlimited' | 'increment';
    baseTime?: number;
    increment?: number;
  };
  pauseRequest: { requesterId: number } | null;
  resumeRequest: { requesterId: number } | null;
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

  private generateBalancedPhonetic(board: Tile[][]): string {
    let initialCount = 0;
    let finalCount = 0;
    const existingPhonetics = new Map<string, number>();

    for (const row of board) {
      for (const tile of row) {
        if (tile.phonetic) {
          existingPhonetics.set(tile.phonetic, (existingPhonetics.get(tile.phonetic) || 0) + 1);
          if (INITIALS.includes(tile.phonetic)) {
            initialCount++;
          } else if (FINALS.includes(tile.phonetic)) {
            finalCount++;
          }
        }
      }
    }

    let targetPool: string[];
    if (initialCount > finalCount + 2) {
      targetPool = FINALS;
    } else if (finalCount > initialCount + 2) {
      targetPool = INITIALS;
    } else {
      targetPool = Math.random() < 0.5 ? INITIALS : FINALS;
    }

    // Sort by frequency
    targetPool.sort((a, b) => {
      const countA = existingPhonetics.get(a) || 0;
      const countB = existingPhonetics.get(b) || 0;
      return countA - countB;
    });

    const minFreq = existingPhonetics.get(targetPool[0]) || 0;
    const candidates = targetPool.filter(p => (existingPhonetics.get(p) || 0) === minFreq);

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  public async createGame(
    battleId: string, 
    player1Id: number, 
    player2Id: number, 
    player1Name: string, 
    player2Name: string, 
    gameMode: 'ranked' | 'casual' | 'custom' | 'ranked_rts' | 'casual_rts' | 'custom_rts',
    timeSettings?: { type: 'unlimited' | 'increment', baseTime?: number, increment?: number }
  ) {
    const board = this.initBoard(player1Id, player2Id);
    
    const isRts = gameMode.includes('rts');
    
    let initialTime = 60;
    if (timeSettings) {
      if (timeSettings.type === 'unlimited') {
        initialTime = 999999;
      } else if (timeSettings.type === 'increment') {
        initialTime = timeSettings.baseTime || 60;
      }
    } else if (isRts) {
      initialTime = 0;
    }

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
        [player1Id]: initialTime,
        [player2Id]: initialTime
      },
      lastActionTime: Date.now(),
      status: 'playing',
      winner: null,
      logs: [`Game started! ${player1Name} (Red) vs ${player2Name} (Blue)`],
      skillCharges: { [player1Id]: 0, [player2Id]: 0 },
      skillInventory: { [player1Id]: 0, [player2Id]: 0 },
      timeSettings,
      pauseRequest: null,
      resumeRequest: null
    };

    this.games.set(battleId, game);
    return game;
  }

  private initBoard(p1: number, p2: number): Tile[][] {
    const board: Tile[][] = [];
    for (let r = 0; r < this.ROWS; r++) {
      const row: Tile[] = [];
      board.push(row);
      for (let c = 0; c < this.COLS; c++) {
        const tile: Tile = {
          r, c,
          state: 'white_phonetic',
          phonetic: null,
          owner: null
        };
        row.push(tile);
        tile.phonetic = this.generateBalancedPhonetic(board);
      }
    }

    // Set Castles
    // Red (P1): Top Right [0, 7]
    board[0][this.COLS - 1].state = 'red_castle';
    board[0][this.COLS - 1].owner = p1;
    board[0][this.COLS - 1].phonetic = null;

    // Blue (P2): Bottom Left [7, 0]
    board[this.ROWS - 1][0].state = 'blue_castle';
    board[this.ROWS - 1][0].owner = p2;
    board[this.ROWS - 1][0].phonetic = null;

    return board;
  }

  private regenerateFrontier(board: Tile[][], playerId: number) {
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const tile = board[r][c];
        if (tile.state === 'white_phonetic' || tile.state === 'white_empty') {
           tile.phonetic = this.generateBalancedPhonetic(board);
           tile.state = 'white_phonetic';
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
        if ((tile.state === 'white_phonetic' || tile.state === 'white_empty') && tile.phonetic) {
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
      if ((board[nr][nc].state === 'white_phonetic' || board[nr][nc].state === 'white_empty') && board[nr][nc].phonetic) {
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
    
    const isRts = game.gameMode === 'ranked_rts';

    if (!isRts && game.turn !== playerId) throw new Error('Not your turn');

    // RTS Race Condition Check
    if (isRts) {
      for (const p of sequence) {
        const tile = game.board[p.r][p.c];
        if (tile.owner !== null && tile.owner !== playerId) {
           throw new Error(`Tile at (${p.r}, ${p.c}) is already occupied`);
        }
      }
    }

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
      const tile = game.board[p.r][p.c];

      if (captured.has(key)) {
        const neighbors = this.getNeighbors(p.r, p.c);
        for (const [nr, nc] of neighbors) {
          const neighbor = game.board[nr][nc];

          // Check if touching opponent castle
          if (neighbor.state === opponentCastleState) {
            castleTouched = true;
          }
          
          // Destroy adjacent opponent territory
          if (neighbor.owner === opponentId && neighbor.state !== opponentCastleState) {
            neighbor.state = 'white_phonetic';
            neighbor.owner = null;
            neighbor.phonetic = this.generateBalancedPhonetic(game.board);
          }
        }

        // Update tile ownership
        if (tile.state === 'white_phonetic' || tile.state === 'white_empty') { // Can capture empty
           tile.state = playerId === game.player1Id ? 'red_territory' : 'blue_territory';
           tile.owner = playerId;
           tile.phonetic = null; 
        }
      } else {
        // Reroll non-captured tiles in sequence
        if (tile.state === 'white_phonetic' || tile.state === 'white_empty') {
          tile.phonetic = this.generateBalancedPhonetic(game.board);
          tile.state = 'white_phonetic';
        }
      }
    }

    // Update Frontier (No longer needed as all tiles have phonetics, but maybe for solvability check?)
    // this.updateFrontier(game.board, playerId);
    
    // Ensure Solvability (Check if at least one valid word exists from frontier)
    // If not, regenerate some frontier tiles
    let attempts = 0;
    while (!this.isSolvable(game.board, playerId) && attempts < 5) {
      console.log(`Board not solvable for player ${playerId}, regenerating frontier...`);
      this.regenerateFrontier(game.board, playerId);
      attempts++;
    }

    // Update Timer
    if (!isRts) {
      if (game.timeSettings?.type === 'increment') {
        game.timer[playerId] += (game.timeSettings.increment || 0);
      } else if (!game.timeSettings) {
        game.timer[playerId] += 60; // Default legacy behavior
      }
    }

    // Update Skill Charges
    game.skillCharges[playerId] = (game.skillCharges[playerId] || 0) + 1;
    if (game.skillCharges[playerId] >= 3) {
      if (game.skillInventory[playerId] < 2) {
        game.skillInventory[playerId] += 1;
        game.skillCharges[playerId] -= 3;
      } else {
        game.skillCharges[playerId] = 3; // Cap at 3 if inventory full
      }
    }
    
    // Switch Turn
    if (!isRts) {
      game.turn = opponentId;
    }
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

  public useSkill(battleId: string, playerId: number) {
    const game = this.games.get(battleId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'playing') throw new Error('Game finished');
    
    const isRts = game.gameMode === 'ranked_rts';
    if (!isRts && game.turn !== playerId) throw new Error('Not your turn');
    
    if (game.skillInventory[playerId] < 1) {
        throw new Error('No skill charges available');
    }

    // Consume charge
    game.skillInventory[playerId] -= 1;

    // Effect: Shuffle all white tiles
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const tile = game.board[r][c];
        if (tile.state === 'white_phonetic' || tile.state === 'white_empty') {
          tile.phonetic = this.generateBalancedPhonetic(game.board);
          tile.state = 'white_phonetic';
        }
      }
    }
    
    const playerName = playerId === game.player1Id ? game.player1Name : game.player2Name;
    game.logs.push(`${playerName} used Shuffle Skill!`);
    
    return { success: true };
  }

  public surrender(battleId: string, playerId: number) {
    const game = this.games.get(battleId);
    if (!game || game.status === 'finished') return { error: 'Game not found or finished' };
    
    if (game.player1Id !== playerId && game.player2Id !== playerId) {
      return { error: 'Not a player' };
    }

    const winner = playerId === game.player1Id ? game.player2Id : game.player1Id;
    this.endGame(game, winner, 'surrender');
    return { success: true };
  }

  public requestTimeout(battleId: string, playerId: number) {
    const game = this.games.get(battleId);
    if (!game || game.status === 'finished') return { error: 'Game not found or finished' };
    if (game.status === 'paused') return { error: 'Game already paused' };
    
    if (game.player1Id !== playerId && game.player2Id !== playerId) {
      return { error: 'Not a player' };
    }

    if (game.pauseRequest) return { error: 'Pause request already pending' };

    game.pauseRequest = { requesterId: playerId };
    game.logs.push(`${playerId === game.player1Id ? game.player1Name : game.player2Name} requested a timeout.`);
    return { success: true };
  }

  public respondTimeout(battleId: string, playerId: number, accept: boolean) {
    const game = this.games.get(battleId);
    if (!game || game.status === 'finished') return { error: 'Game not found or finished' };
    
    if (!game.pauseRequest) return { error: 'No pending pause request' };
    if (game.pauseRequest.requesterId === playerId) return { error: 'Cannot respond to own request' };

    if (accept) {
      game.status = 'paused';
      game.logs.push(`Timeout accepted. Game paused.`);
    } else {
      game.logs.push(`Timeout rejected.`);
    }
    game.pauseRequest = null;
    return { success: true };
  }

  public requestResume(battleId: string, playerId: number) {
    const game = this.games.get(battleId);
    if (!game || game.status !== 'paused') return { error: 'Game not paused' };
    
    if (game.player1Id !== playerId && game.player2Id !== playerId) {
      return { error: 'Not a player' };
    }

    if (game.resumeRequest) return { error: 'Resume request already pending' };

    game.resumeRequest = { requesterId: playerId };
    game.logs.push(`${playerId === game.player1Id ? game.player1Name : game.player2Name} requested to resume.`);
    return { success: true };
  }

  public respondResume(battleId: string, playerId: number, accept: boolean) {
    const game = this.games.get(battleId);
    if (!game || game.status !== 'paused') return { error: 'Game not paused' };
    
    if (!game.resumeRequest) return { error: 'No pending resume request' };
    if (game.resumeRequest.requesterId === playerId) return { error: 'Cannot respond to own request' };

    if (accept) {
      game.status = 'playing';
      game.lastActionTime = Date.now(); // Reset action time to avoid immediate timeout
      game.logs.push(`Resume accepted. Game continuing.`);
    } else {
      game.logs.push(`Resume rejected.`);
    }
    game.resumeRequest = null;
    return { success: true };
  }

  private tick() {
    const now = Date.now();
    for (const game of this.games.values()) {
      if (game.status === 'playing') {
        const elapsed = (now - game.lastActionTime) / 1000;
        
        // Skip timer for RTS
        if (game.gameMode.includes('rts')) continue;

        // Skip if unlimited
        if (game.timeSettings?.type === 'unlimited') continue;

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
      
      const res = await query(`SELECT id, rating, rts_rating FROM users WHERE id IN ($1, $2)`, [p1, p2]);
      const users = res.rows;
      const user1 = users.find(u => u.id === p1);
      const user2 = users.find(u => u.id === p2);

      if (user1 && user2) {
        const k = 32;
        const actualScore1 = winnerId === p1 ? 1 : 0;
        const actualScore2 = winnerId === p2 ? 1 : 0;
        
        // Calculate new ratings
        let newRating1 = user1.rating;
        let newRating2 = user2.rating;
        let newRtsRating1 = user1.rts_rating || 1200;
        let newRtsRating2 = user2.rts_rating || 1200;

        if (game.gameMode === 'ranked') {
          const expected1 = 1 / (1 + Math.pow(10, (user2.rating - user1.rating) / 400));
          const expected2 = 1 / (1 + Math.pow(10, (user1.rating - user2.rating) / 400));

          newRating1 = Math.round(user1.rating + k * (actualScore1 - expected1));
          newRating2 = Math.round(user2.rating + k * (actualScore2 - expected2));
        } else if (game.gameMode === 'ranked_rts') {
          const r1 = user1.rts_rating || 1200;
          const r2 = user2.rts_rating || 1200;
          const expected1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400));
          const expected2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400));

          newRtsRating1 = Math.round(r1 + k * (actualScore1 - expected1));
          newRtsRating2 = Math.round(r2 + k * (actualScore2 - expected2));
        }

        // Helper to update user
        const updateUser = async (userId: number, actualScore: number, newRating: number, newRtsRating: number) => {
            let q = `UPDATE users SET games_played = games_played + 1, games_won = games_won + $1`;
            const params: any[] = [actualScore];
            
            if (game.gameMode === 'ranked') {
                q += `, rating = $2, ranked_games_played = ranked_games_played + 1, ranked_games_won = ranked_games_won + $3`;
                params.push(newRating, actualScore);
            } else if (game.gameMode === 'casual') {
                q += `, casual_games_played = casual_games_played + 1, casual_games_won = casual_games_won + $2`;
                params.push(actualScore);
            } else if (game.gameMode === 'custom') {
                q += `, custom_games_played = custom_games_played + 1, custom_games_won = custom_games_won + $2`;
                params.push(actualScore);
            } else if (game.gameMode === 'ranked_rts') {
                q += `, rts_rating = $2, rts_games_played = rts_games_played + 1, rts_games_won = rts_games_won + $3`;
                q += `, rts_ranked_games_played = rts_ranked_games_played + 1, rts_ranked_games_won = rts_ranked_games_won + $3`;
                params.push(newRtsRating, actualScore);
            } else if (game.gameMode === 'casual_rts') {
                q += `, rts_games_played = rts_games_played + 1, rts_games_won = rts_games_won + $2`;
                q += `, rts_casual_games_played = rts_casual_games_played + 1, rts_casual_games_won = rts_casual_games_won + $2`;
                params.push(actualScore);
            } else if (game.gameMode === 'custom_rts') {
                q += `, rts_games_played = rts_games_played + 1, rts_games_won = rts_games_won + $2`;
                q += `, rts_custom_games_played = rts_custom_games_played + 1, rts_custom_games_won = rts_custom_games_won + $2`;
                params.push(actualScore);
            }
            q += ` WHERE id = $${params.length + 1}`;
            params.push(userId);
            await query(q, params);
        };

        await updateUser(p1, actualScore1, newRating1, newRtsRating1);
        await updateUser(p2, actualScore2, newRating2, newRtsRating2);
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
