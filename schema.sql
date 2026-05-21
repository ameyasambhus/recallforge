-- RecallForge PostgreSQL Schema
-- Run this first in Neon SQL Editor

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  verify_otp TEXT DEFAULT '',
  verify_otp_expire_at BIGINT DEFAULT 0,
  is_account_verified BOOLEAN DEFAULT FALSE,
  reset_otp TEXT DEFAULT '',
  reset_otp_expire_at BIGINT DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  easy_bonus NUMERIC DEFAULT 1.3,
  interval_modifier NUMERIC DEFAULT 1.0,
  max_interval INTEGER DEFAULT 36500,
  min_ef NUMERIC DEFAULT 1.3
);

CREATE TABLE review_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, review_date)
);

CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, name)
);

CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding vector(768),
  ef NUMERIC(6,4) NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 1,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_folder_id ON cards(folder_id);
CREATE INDEX idx_cards_due_date ON cards(due_date);
CREATE INDEX idx_cards_embedding_cosine ON cards USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_folders_user_id ON folders(user_id);
