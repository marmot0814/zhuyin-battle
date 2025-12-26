import { query } from './index';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  username: string;
  email: string;
  rating: number;
  games_played: number;
  games_won: number;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
}

export class UserModel {
  // Create a new user
  static async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, rating, games_played, games_won, avatar_url, bio, created_at, updated_at`,
      [input.username, input.email, passwordHash]
    );
    return result.rows[0];
  }

  // Get user by ID
  static async findById(id: number): Promise<User | null> {
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, avatar_url, bio, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  // Get user by username
  static async findByUsername(username: string): Promise<User | null> {
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, avatar_url, bio, created_at, updated_at
       FROM users WHERE username = $1`,
      [username]
    );
    return result.rows[0] || null;
  }

  // Get user by email
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, avatar_url, bio, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
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
       RETURNING id, username, email, rating, games_played, games_won, avatar_url, bio, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
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
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, email, rating, games_played, games_won, avatar_url, bio, created_at, updated_at`,
      [ratingDelta, won ? 1 : 0, id]
    );
    return result.rows[0] || null;
  }

  // Get top players by rating
  static async getTopPlayers(limit: number = 10): Promise<User[]> {
    const result = await query(
      `SELECT id, username, email, rating, games_played, games_won, avatar_url, bio, created_at, updated_at
       FROM users
       ORDER BY rating DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}
