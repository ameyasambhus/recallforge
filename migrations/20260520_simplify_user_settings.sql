-- Migration: Simplify user_settings to Pure SM2
-- Drop Anki-specific columns
ALTER TABLE user_settings DROP COLUMN IF EXISTS learning_steps;
ALTER TABLE user_settings DROP COLUMN IF EXISTS graduating_interval;

-- Add min_ef column with default 1.3 if not exists
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS min_ef NUMERIC DEFAULT 1.3;
