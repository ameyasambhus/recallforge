import pool from '../config/postgres.js';

export interface UserSettings {
  id: number;
  user_id: number;
  easy_bonus: number;
  interval_modifier: number;
  max_interval: number;
  min_ef: number;
}

const userSettingsModel = {
  async findByUserId(userId: number | string): Promise<UserSettings | null> {
    const result = await pool.query<UserSettings>(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] ?? null;
  },

  async createDefault(userId: number | string): Promise<UserSettings> {
    const result = await pool.query<UserSettings>(
      `INSERT INTO user_settings (user_id, easy_bonus, interval_modifier, max_interval, min_ef)
       VALUES ($1, 1.3, 1.0, 36500, 1.3)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  },

  async update(
    userId: number | string,
    data: Partial<Omit<UserSettings, 'id' | 'user_id'>>
  ): Promise<UserSettings | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      updates.push(`${key} = $${idx++}`);
      values.push(value);
    }
    values.push(userId);

    const result = await pool.query<UserSettings>(
      `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  },
};

export default userSettingsModel;
