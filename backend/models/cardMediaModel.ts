import pool from '../config/postgres.js';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type AwsModerationStatus = ModerationStatus | 'not_used';

export interface CardMedia {
  id: number;
  card_id: number;
  url: string;
  media_type: 'image' | 'video' | 'file';
  file_name: string | null;
  size_bytes: number | null;
  cloudinary_public_id: string | null;
  moderation_status: ModerationStatus;
  aws_moderation_status: AwsModerationStatus;
  created_at: Date;
}

const cardMediaModel = {
  async findOneById(mediaId: string | number): Promise<CardMedia | null> {
    const result = await pool.query<CardMedia>(
      `SELECT * FROM card_media WHERE id = $1 LIMIT 1`,
      [mediaId]
    );
    return result.rows[0] ?? null;
  },

  async findByCardId(cardId: string | number): Promise<CardMedia[]> {
    const result = await pool.query<CardMedia>(
      `SELECT * FROM card_media WHERE card_id = $1 ORDER BY created_at ASC`,
      [cardId]
    );
    return result.rows;
  },

  async countByCardId(cardId: string | number): Promise<number> {
    const result = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM card_media WHERE card_id = $1',
      [cardId]
    );
    return Number(result.rows[0]?.count || 0);
  },

  async createMany(
    entries: Array<{
      card_id: string | number;
      url: string;
      media_type: 'image' | 'video' | 'file';
      file_name?: string;
      size_bytes?: number;
      cloudinary_public_id?: string | null;
      moderation_status?: ModerationStatus;
      aws_moderation_status?: AwsModerationStatus;
    }>
  ): Promise<CardMedia[]> {
    const createdRows = await Promise.all(
      entries.map(async (entry) => {
        const result = await pool.query<CardMedia>(
          `INSERT INTO card_media (card_id, url, media_type, file_name, size_bytes, cloudinary_public_id, moderation_status, aws_moderation_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            entry.card_id,
            entry.url,
            entry.media_type,
            entry.file_name ?? null,
            entry.size_bytes ?? null,
            entry.cloudinary_public_id ?? null,
            entry.moderation_status ?? 'approved',
            entry.aws_moderation_status ?? 'not_used',
          ]
        );
        return result.rows[0];
      })
    );

    return createdRows;
  },

  async deleteById(mediaId: string | number): Promise<CardMedia | null> {
    const result = await pool.query<CardMedia>(
      `DELETE FROM card_media WHERE id = $1 RETURNING *`,
      [mediaId]
    );
    return result.rows[0] ?? null;
  },

  async findByCloudinaryPublicId(publicId: string): Promise<CardMedia | null> {
    const result = await pool.query<CardMedia>(
      `SELECT * FROM card_media WHERE cloudinary_public_id = $1 LIMIT 1`,
      [publicId]
    );
    return result.rows[0] ?? null;
  },

  async updateModerationById(
    mediaId: string | number,
    data: { moderation_status: ModerationStatus; aws_moderation_status: AwsModerationStatus }
  ): Promise<CardMedia | null> {
    const result = await pool.query<CardMedia>(
      `UPDATE card_media
       SET moderation_status = $1, aws_moderation_status = $2
       WHERE id = $3
       RETURNING *`,
      [data.moderation_status, data.aws_moderation_status, mediaId]
    );
    return result.rows[0] ?? null;
  },
};

export default cardMediaModel;
