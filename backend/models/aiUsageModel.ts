import pool from '../config/postgres.js';

export interface AiUsage {
  id: number;
  user_id: number;
  used_at: Date;
}

const aiUsageModel = {
  async create(userId: string | number): Promise<AiUsage> {
    const result = await pool.query<AiUsage>(
      'INSERT INTO ai_usage (user_id, used_at) VALUES ($1, NOW()) RETURNING *',
      [userId]
    );
    return result.rows[0];
  },

  async countForCurrentMonth(userId: string | number): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM ai_usage
       WHERE user_id = $1
         AND DATE_TRUNC('month', used_at AT TIME ZONE 'Asia/Kolkata')
           = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')`,
      [userId]
    );

    return Number(result.rows[0]?.count ?? 0);
  },
};

export default aiUsageModel;
