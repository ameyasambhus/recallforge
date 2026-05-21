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
  const { embedding: _embedding, ...safeRow } = row;
  return {
    ...safeRow,
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
    embedding?: string | null;
  }): Promise<Card> {
    const folderId = await this.resolveFolderId(data.user_id, data.folder);
    const now = new Date();
    const dueDate = new Date();
    dueDate.setHours(0, 0, 0, 0);

    const embeddingValue = data.embedding ?? null;

    const result = await pool.query<Card>(
      `INSERT INTO cards (mongo_id, user_id, folder_id, question, answer, ef, interval, repetitions, due_date, created_at, updated_at, embedding)
       VALUES ($1, $2, $3, $4, $5, 2.5, 1, 0, $6, $7, $7, $8::vector)
       RETURNING *`,
      [crypto.randomUUID(), data.user_id, folderId, data.question, data.answer, dueDate, now, embeddingValue]
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
    data: Partial<{
      question: string;
      answer: string;
      folder: string;
      ef: number;
      interval: number;
      repetitions: number;
      due_date: Date;
      embedding: string | null;
    }>
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
      if (key === 'embedding') {
        updates.push(`${key} = $${idx++}::vector`);
        values.push(value);
        continue;
      }
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
      updatedAt: 'c.updated_at',
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

  async findDuplicatesByEmbedding(opts: {
    userId: number | string;
    embedding: string;
    minSimilarity: number;
    limit: number;
  }): Promise<{ question: string; answer: string; similarity: number }[]> {
    const result = await pool.query<{ question: string; answer: string; similarity: number }>(
      `SELECT c.question, c.answer, 1 - (c.embedding <=> $1::vector) AS similarity
       FROM cards c
       WHERE c.user_id = $2
         AND c.embedding IS NOT NULL
         AND 1 - (c.embedding <=> $1::vector) > $3
       ORDER BY similarity DESC
       LIMIT $4`,
      [opts.embedding, opts.userId, opts.minSimilarity, opts.limit]
    );

    return result.rows.map((row) => ({
      ...row,
      similarity: Number(row.similarity),
    }));
  },

  async searchByEmbedding(opts: {
    userId: number | string;
    embedding: string;
    minSimilarity: number;
    limit: number;
  }): Promise<Array<Card & { similarity: number }>> {
    const result = await pool.query<Card & { similarity: number }>(
      `SELECT c.id, c.mongo_id, c.user_id, c.folder_id, c.question, c.answer,
              c.ef, c.interval, c.repetitions, c.due_date, c.created_at, c.updated_at,
              f.name AS folder,
              1 - (c.embedding <=> $1::vector) AS similarity
       FROM cards c
       LEFT JOIN folders f ON c.folder_id = f.id
       WHERE c.user_id = $2
         AND c.embedding IS NOT NULL
         AND 1 - (c.embedding <=> $1::vector) > $3
       ORDER BY similarity DESC
       LIMIT $4`,
      [opts.embedding, opts.userId, opts.minSimilarity, opts.limit]
    );

    return result.rows.map((row) => ({
      ...normaliseCard(row),
      similarity: Number(row.similarity),
    }));
  },

  async searchByKeyword(opts: {
    userId: number | string;
    query: string;
    limit: number;
  }): Promise<Card[]> {
    const result = await pool.query<Card>(
      `SELECT c.id, c.mongo_id, c.user_id, c.folder_id, c.question, c.answer,
              c.ef, c.interval, c.repetitions, c.due_date, c.created_at, c.updated_at,
              f.name AS folder
       FROM cards c
       LEFT JOIN folders f ON c.folder_id = f.id
       WHERE c.user_id = $1
         AND (c.question ILIKE $2 OR c.answer ILIKE $2)
       ORDER BY c.updated_at DESC
       LIMIT $3`,
      [opts.userId, `%${opts.query}%`, opts.limit]
    );

    return result.rows.map(normaliseCard);
  },
};

export default cardModel;
