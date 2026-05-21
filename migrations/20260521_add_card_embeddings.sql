CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_cards_embedding_cosine
  ON cards USING ivfflat (embedding vector_cosine_ops);
