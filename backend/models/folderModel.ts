import pool from '../config/postgres.js';

export interface Folder {
  id: number;
  mongo_id: string;
  user_id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

const folderModel = {
  async findOne(where: { user_id: number | string; name: string }): Promise<Folder | null> {
    const result = await pool.query<Folder>(
      'SELECT * FROM folders WHERE user_id = $1 AND name = $2 LIMIT 1',
      [where.user_id, where.name]
    );
    return result.rows[0] ?? null;
  },

  async findByUser(userId: number | string): Promise<Folder[]> {
    const result = await pool.query<Folder>(
      'SELECT * FROM folders WHERE user_id = $1 ORDER BY name',
      [userId]
    );
    return result.rows;
  },

  async create(data: { user_id: number | string; name: string }): Promise<Folder> {
    const now = new Date();
    const result = await pool.query<Folder>(
      `INSERT INTO folders (mongo_id, user_id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (user_id, name) DO UPDATE SET updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [crypto.randomUUID(), data.user_id, data.name, now]
    );
    return result.rows[0];
  },

  async deleteByUser(userId: number | string): Promise<void> {
    await pool.query('DELETE FROM folders WHERE user_id = $1', [userId]);
  },
};

export default folderModel;
