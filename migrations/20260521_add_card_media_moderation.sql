ALTER TABLE card_media
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS aws_moderation_status TEXT NOT NULL DEFAULT 'not_used';

CREATE INDEX IF NOT EXISTS idx_card_media_cloudinary_public_id
  ON card_media (cloudinary_public_id);
