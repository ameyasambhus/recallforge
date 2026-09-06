-- Migration: Create user_settings table and backfill existing users
-- Run this in your PostgreSQL database (e.g., Neon SQL Editor)

CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  easy_bonus NUMERIC DEFAULT 1.3,
  interval_modifier NUMERIC DEFAULT 1.0,
  max_interval INTEGER DEFAULT 36500,
  graduating_interval INTEGER DEFAULT 1,
  learning_steps TEXT DEFAULT '1,10'
);

-- Backfill existing users with default settings
INSERT INTO user_settings (user_id, easy_bonus, interval_modifier, max_interval, graduating_interval, learning_steps)
SELECT id, 1.3, 1.0, 36500, 1, '1,10'
FROM users
ON CONFLICT (user_id) DO NOTHING;
