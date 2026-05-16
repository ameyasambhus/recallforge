import pool from '../config/postgres.js';

export interface User {
  id: number;
  mongo_id: string;
  name: string;
  email: string;
  password: string;
  verify_otp: string;
  verify_otp_expire_at: number;
  is_account_verified: boolean;
  reset_otp: string;
  reset_otp_expire_at: number;
  current_streak: number;
  created_at: Date;
  updated_at: Date;
}

const userModel = {
  async findById(id: number | string): Promise<User | null> {
    const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  },

  async findOne(where: Partial<User>): Promise<User | null> {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const conditions = keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
    const result = await pool.query<User>(`SELECT * FROM users WHERE ${conditions} LIMIT 1`, values);
    return result.rows[0] ?? null;
  },

  async create(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const now = new Date();
    const result = await pool.query<User>(
      `INSERT INTO users (mongo_id, name, email, password, verify_otp, verify_otp_expire_at,
        is_account_verified, reset_otp, reset_otp_expire_at, current_streak, created_at, updated_at)
       VALUES ($1, $2, $3, $4, '', 0, false, '', 0, 0, $5, $5)
       RETURNING *`,
      [crypto.randomUUID(), data.name, data.email.toLowerCase(), data.password, now]
    );
    return result.rows[0];
  },

  async update(id: number | string, data: Partial<User>): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      updates.push(`${key} = $${idx++}`);
      values.push(value);
    }
    updates.push(`updated_at = $${idx++}`);
    values.push(new Date());
    values.push(id);

    const result = await pool.query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  },

  async deleteById(id: number | string): Promise<User | null> {
    const result = await pool.query<User>('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] ?? null;
  },
};

export default userModel;
