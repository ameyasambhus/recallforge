import pool from '../config/postgres.js';
import folderModel from './folderModel.js';

export interface Card {
  id: number;
  mongo_id: string;
  user_id: number;
  folder_id: number | null;
  question: string;
  answer: string;
  ef: number;
  interval: number;
  repetitions: number;
  due_date: Date;
  created_at: Date;
  updated_at: Date;
  // Joined / virtual field — always returned as "folder"
  folder?: string;
}

/** Map a raw pg row to the camelCase shape the frontend expects */
function normaliseCard(row: Card & Record<string, any>) {
  return {
    ...row,
    _id: row.id,           // frontend uses card._id for delete/edit URLs
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_id,
    folderId: row.folder_id,
  };
}

const cardModel = {
  /** Ensure a folder row exists and return its id */
  async resolveFolderId(userId: number | string, folderName: string | undefined): Promise<number | null> {
    if (!folderName || folderName.trim() === '') return null;
    const folder = await folderModel.create({ user_id: userId, name: folderName.trim() });
    return folder.id;
  },

  async create(data: {
    user_id: number | string;
    question: string;
    answer: string;
    folder?: string;
  }): Promise<Card> {
    const folderId = await this.resolveFolderId(data.user_id, data.folder);
    const now = new Date();
    const dueDate = new Date();
    dueDate.setHours(0, 0, 0, 0);

    const result = await pool.query<Card>(
      `INSERT INTO cards (mongo_id, user_id, folder_id, question, answer, ef, interval, repetitions, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 2.5, 1, 0, $6, $7, $7)
       RETURNING *`,
      [crypto.randomUUID(), data.user_id, folderId, data.question, data.answer, dueDate, now]
    );

    const card = result.rows[0];
    card.folder = data.folder ?? '';
    return normaliseCard(card);
  },

  async findOne(where: { id: number | string; user_id: number | string }): Promise<Card | null> {
    const result = await pool.query<Card>(
      `SELECT c.*, f.name AS folder
       FROM cards c LEFT JOIN folders f ON c.folder_id = f.id
       WHERE c.id = $1 AND c.user_id = $2 LIMIT 1`,
      [where.id, where.user_id]
    );
    const row = result.rows[0];
    return row ? normaliseCard(row) : null;
  },

  async findById(id: number | string): Promise<Card | null> {
    const result = await pool.query<Card>(
      `SELECT c.*, f.name AS folder
       FROM cards c LEFT JOIN folders f ON c.folder_id = f.id
       WHERE c.id = $1 LIMIT 1`,
      [id]
    );
    const row = result.rows[0];
    return row ? normaliseCard(row) : null;
  },

  async findAndUpdate(
    where: { id: number | string; user_id: number | string },
    data: Partial<{ question: string; answer: string; folder: string; ef: number; interval: number; repetitions: number; due_date: Date }>
  ): Promise<Card | null> {
    const updateData: Record<string, any> = { ...data };

    // Resolve folder name → folder_id before building the SET clause
    let resolvedFolderName: string | undefined;
    if ('folder' in updateData) {
      resolvedFolderName = updateData.folder as string | undefined;
      updateData.folder_id = await this.resolveFolderId(where.user_id, resolvedFolderName);
      delete updateData.folder;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updateData)) {
      updates.push(`${key} = $${idx++}`);
      values.push(value);
    }
    updates.push(`updated_at = $${idx++}`);
    values.push(new Date());
    values.push(where.id);
    values.push(where.user_id);

    // UPDATE then re-SELECT with JOIN so the returned card has the folder name
    await pool.query(
      `UPDATE cards SET ${updates.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
      values
    );

    return this.findOne({ id: where.id, user_id: where.user_id });
  },

  async findAndDelete(where: { id: number | string; user_id: number | string }): Promise<Card | null> {
    const result = await pool.query<Card>(
      'DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING *',
      [where.id, where.user_id]
    );
    return result.rows[0] ?? null;
  },

  async findDue(userId: number | string, today: Date): Promise<Card[]> {
    const result = await pool.query<Card>(
      `SELECT c.*, f.name AS folder
       FROM cards c LEFT JOIN folders f ON c.folder_id = f.id
       WHERE c.user_id = $1 AND c.due_date <= $2
       ORDER BY c.due_date ASC`,
      [userId, today]
    );
    return result.rows.map(normaliseCard);
  },

  async findAll(opts: {
    userId: number | string;
    folder?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    limit: number;
    offset: number;
  }): Promise<{ cards: Card[]; total: number; folderNames: string[] }> {
    const conditions: string[] = ['c.user_id = $1'];
    const values: any[] = [opts.userId];
    let idx = 2;

    if (opts.folder && opts.folder !== 'All') {
      if (opts.folder === 'Uncategorized') {
        conditions.push('c.folder_id IS NULL');
      } else {
        conditions.push(`f.name = $${idx++}`);
        values.push(opts.folder);
      }
    }

    if (opts.search && opts.search.trim()) {
      conditions.push(`(c.question ILIKE $${idx} OR c.answer ILIKE $${idx})`);
      values.push(`%${opts.search.trim()}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    const validSortFields: Record<string, string> = {
      question: 'c.question',
      folder: 'f.name',
      dueDate: 'c.due_date',
      createdAt: 'c.created_at',
    };
    const sortField = validSortFields[opts.sortBy ?? 'dueDate'] ?? 'c.due_date';
    const sortDir = opts.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const dataValues = [...values, opts.limit, opts.offset];

    const dataQuery = `
      SELECT c.*, f.name AS folder
      FROM cards c LEFT JOIN folders f ON c.folder_id = f.id
      WHERE ${where}
      ORDER BY ${sortField} ${sortDir}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM cards c LEFT JOIN folders f ON c.folder_id = f.id WHERE ${where}
    `;

    const foldersQuery = `
      SELECT DISTINCT f.name FROM cards c
      JOIN folders f ON c.folder_id = f.id
      WHERE c.user_id = $1 AND f.name IS NOT NULL
      ORDER BY f.name
    `;

    const [dataResult, countResult, foldersResult] = await Promise.all([
      pool.query<Card>(dataQuery, dataValues),
      pool.query<{ count: string }>(countQuery, values),
      pool.query<{ name: string }>(foldersQuery, [opts.userId]),
    ]);

    return {
      cards: dataResult.rows.map(normaliseCard),
      total: parseInt(countResult.rows[0].count, 10),
      folderNames: foldersResult.rows.map((r) => r.name),
    };
  },

  async deleteByUser(userId: number | string): Promise<void> {
    await pool.query('DELETE FROM cards WHERE user_id = $1', [userId]);
  },
};

export default cardModel;
