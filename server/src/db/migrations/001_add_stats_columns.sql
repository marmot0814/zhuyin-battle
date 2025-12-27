
-- Add new stats columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ranked_games_played INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ranked_games_won INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS casual_games_played INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS casual_games_won INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_games_played INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_games_won INT DEFAULT 0;

-- Initialize new columns with existing data (assuming existing data is ranked or casual? Let's assume casual for safety, or just leave 0)
-- For now, we just leave them as 0 or whatever default.
-- If we wanted to migrate existing data, we'd need to know which games were which.
-- Since we don't have game history with mode in this simple schema (battles table has mode, but we need to aggregate).

-- Let's try to backfill from battles table if possible.
-- Assuming battles table has 'mode' column and 'winner_id' (or we infer winner).
-- The battles table schema in init.sql shows:
-- CREATE TABLE IF NOT EXISTS battles ( ... mode, status, player1_id, player2_id, winner_id ... );
-- Wait, init.sql didn't show battles table fully in the snippet. Let's assume it exists.

-- We will just add columns for now.
