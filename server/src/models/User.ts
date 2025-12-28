import { query } from './index';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  username: string;
  email: string;
  rating: number | null;
  games_played: number;
  games_won: number;
  ranked_games_played: number;
  ranked_games_won: number;
  casual_games_played: number;
  casual_games_won: number;
  custom_games_played: number;
  custom_games_won: number;
  rts_rating: number | null;
  rts_games_played: number;
  rts_games_won: number;
  rts_ranked_games_played: number;
  rts_ranked_games_won: number;
  rts_casual_games_played: number;
  rts_casual_games_won: number;
  rts_custom_games_played: number;
  rts_custom_games_won: number;
  avatar_url?: string;
  bio?: string;
  banned_until?: Date;
  ban_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
}

export class UserModel {
  private static PLACEMENT_MATCHES = 5;

  private static processUser(user: any): User | null {
    if (!user) return null;
    // Hide rating if in placement
    if ((user.ranked_games_played || 0) < UserModel.PLACEMENT_MATCHES) {
      user.rating = null;
    }
    // Hide RTS rating if in placement
    if ((user.rts_games_played || 0) < UserModel.PLACEMENT_MATCHES) {
      user.rts_rating = null;
    }
    return user;
  }

  // Create a new user
  static async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, rating, games_played, games_won, 
                 ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
                 rts_rating, rts_games_played, rts_games_won,
                 avatar_url, bio, banned_until, ban_reason, created_at, updated_at`,
      [input.username, input.email, passwordHash]
    );
    return this.processUser(result.rows[0])!;
  }

  // Get user by ID
  static async findById(id: number): Promise<User | null> {
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, 
              ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
              rts_rating, rts_games_played, rts_games_won,
              avatar_url, bio, banned_until, ban_reason, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return this.processUser(result.rows[0]);
  }

  // Get user by username
  static async findByUsername(username: string): Promise<User | null> {
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, 
              ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
              rts_rating, rts_games_played, rts_games_won,
              avatar_url, bio, banned_until, ban_reason, created_at, updated_at
       FROM users WHERE username = $1`,
      [username]
    );
    return this.processUser(result.rows[0]);
  }

  // Get user by email
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, 
              ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
              rts_rating, rts_games_played, rts_games_won,
              avatar_url, bio, banned_until, ban_reason, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );
    return this.processUser(result.rows[0]);
  }

  // Verify password
  static async verifyPassword(userId: number, password: string): Promise<boolean> {
    const result = await query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );
    if (!result.rows[0]) return false;
    return bcrypt.compare(password, result.rows[0].password_hash);
  }

  // Update user profile
  static async updateProfile(
    id: number,
    data: Partial<{ avatar_url: string; bio: string; username: string }>
  ): Promise<User | null> {
    const updates = [];
    const values: (string | number | null | undefined)[] = [id];
    let paramIndex = 2;

    if (data.avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatar_url);
    }
    if (data.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(data.bio);
    }
    if (data.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(data.username);
    }

    if (updates.length === 0) return this.findById(id);

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1
       RETURNING id, username, email, rating, games_played, games_won, 
                 ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
                 rts_rating, rts_games_played, rts_games_won,
                 avatar_url, bio, banned_until, ban_reason, created_at, updated_at`,
      values
    );
    return this.processUser(result.rows[0]);
  }

  // Update rating and game stats
  static async updateStats(
    id: number,
    ratingDelta: number,
    won: boolean
  ): Promise<User | null> {
    const result = await query(
      `UPDATE users 
       SET rating = rating + $1,
           games_played = games_played + 1,
           games_won = games_won + $2,
           ranked_games_played = ranked_games_played + 1,
           ranked_games_won = ranked_games_won + $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, email, rating, games_played, games_won, 
                 ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
                 rts_rating, rts_games_played, rts_games_won,
                 avatar_url, bio, banned_until, ban_reason, created_at, updated_at`,
      [ratingDelta, won ? 1 : 0, id]
    );
    return this.processUser(result.rows[0]);
  }

  // Update RTS rating and game stats
  static async updateRtsStats(
    id: number,
    ratingDelta: number,
    won: boolean
  ): Promise<User | null> {
    const result = await query(
      `UPDATE users 
       SET rts_rating = COALESCE(rts_rating, 1200) + $1,
           rts_games_played = COALESCE(rts_games_played, 0) + 1,
           rts_games_won = COALESCE(rts_games_won, 0) + $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, email, rating, games_played, games_won, 
                 ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
                 rts_rating, rts_games_played, rts_games_won,
                 avatar_url, bio, banned_until, ban_reason, created_at, updated_at`,
      [ratingDelta, won ? 1 : 0, id]
    );
    return this.processUser(result.rows[0]);
  }

  // Get top players by rating
  static async getTopPlayers(limit: number = 10): Promise<User[]> {
    // Only include players who have finished placement matches
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, 
              ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
              rts_rating, rts_games_played, rts_games_won,
              avatar_url, bio, banned_until, ban_reason, created_at, updated_at
       FROM users
       WHERE ranked_games_played >= $2
       ORDER BY rating DESC
       LIMIT $1`,
      [limit, UserModel.PLACEMENT_MATCHES]
    );
    return result.rows.map(u => this.processUser(u)!);
  }

  // Admin: Delete user
  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  // Admin: Ban user
  static async ban(id: number, until: Date, reason: string): Promise<User | null> {
    const result = await query(
      `UPDATE users 
       SET banned_until = $1, ban_reason = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, email, rating, games_played, games_won, 
                 ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
                 rts_rating, rts_games_played, rts_games_won,
                 avatar_url, bio, banned_until, ban_reason, created_at, updated_at,
                 last_online, last_ping,
                 EXTRACT(EPOCH FROM (NOW() - COALESCE(last_ping, last_online))) as seconds_offline`,
      [until, reason, id]
    );
    // Admin operations should return raw user data (including rating even if in placement)
    return result.rows[0];
  }

  // Admin: Unban user
  static async unban(id: number): Promise<User | null> {
    const result = await query(
      `UPDATE users 
       SET banned_until = NULL, ban_reason = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, email, rating, games_played, games_won, 
                 ranked_games_played, ranked_games_won, casual_games_played, casual_games_won, custom_games_played, custom_games_won,
                 rts_rating, rts_games_played, rts_games_won,
                 avatar_url, bio, banned_until, ban_reason, created_at, updated_at,
                 last_online, last_ping,
                 EXTRACT(EPOCH FROM (NOW() - COALESCE(last_ping, last_online))) as seconds_offline`,
      [id]
    );
    // Admin operations should return raw user data (including rating even if in placement)
    return result.rows[0];
  }
}
