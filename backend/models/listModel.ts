import pool from '../config/postgres.js';

export type Visibility = 'private' | 'shared' | 'public';
export type Role = 'viewer' | 'editor';

export interface List {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  visibility: Visibility;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  owner_name?: string;
  owner_email?: string;
  card_count?: number;
  my_role?: Role | 'owner';
}

export interface ListPermission {
  id: number;
  list_id: number;
  user_id: number;
  role: Role;
  invited_at: Date;
  // Joined
  user_name?: string;
  user_email?: string;
}

export interface ListCard {
  list_id: number;
  card_id: number;
  added_at: Date;
  // Card fields
  question?: string;
  answer?: string;
  folder?: string;
  due_date?: Date;
}



const listModel = {
  // ── LIST CRUD ────────────────────────────────────────────────────────────

  async create(data: {
    owner_id: number | string;
    title: string;
    description?: string;
    visibility?: Visibility;
  }): Promise<List> {
    const now = new Date();
    const result = await pool.query<List>(
      `INSERT INTO lists (owner_id, title, description, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [data.owner_id, data.title, data.description ?? '', data.visibility ?? 'private', now]
    );
    return result.rows[0];
  },

  /** Get all lists visible to the user (owned + shared + public) */
  async findAllForUser(userId: number | string): Promise<List[]> {
    const result = await pool.query<List>(
      `SELECT
         l.*,
         u.name AS owner_name,
         u.email AS owner_email,
         COUNT(lc.card_id)::int AS card_count,
         CASE
           WHEN l.owner_id = $1 THEN 'owner'
           ELSE lp2.role
         END AS my_role
       FROM lists l
       JOIN users u ON l.owner_id = u.id
       LEFT JOIN list_cards lc ON lc.list_id = l.id
       LEFT JOIN list_permissions lp2 ON lp2.list_id = l.id AND lp2.user_id = $1
       WHERE
         l.owner_id = $1
         OR EXISTS (
           SELECT 1 FROM list_permissions lp
           WHERE lp.list_id = l.id AND lp.user_id = $1
         )
       GROUP BY l.id, u.name, u.email, lp2.role
       ORDER BY l.updated_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /** Get a single list – returns null if user has no access */
  async findOne(listId: number | string, userId: number | string): Promise<List | null> {
    const result = await pool.query<List>(
      `SELECT
         l.*,
         u.name AS owner_name,
         u.email AS owner_email,
         COUNT(lc.card_id)::int AS card_count,
         CASE
           WHEN l.owner_id = $2 THEN 'owner'
           ELSE lp2.role
         END AS my_role
       FROM lists l
       JOIN users u ON l.owner_id = u.id
       LEFT JOIN list_cards lc ON lc.list_id = l.id
       LEFT JOIN list_permissions lp2 ON lp2.list_id = l.id AND lp2.user_id = $2
       WHERE l.id = $1
         AND (
           l.owner_id = $2
           OR l.visibility = 'public'
           OR EXISTS (
             SELECT 1 FROM list_permissions lp
             WHERE lp.list_id = l.id AND lp.user_id = $2
           )
         )
       GROUP BY l.id, u.name, u.email, lp2.role
       LIMIT 1`,
      [listId, userId]
    );
    return result.rows[0] ?? null;
  },

  async update(
    listId: number | string,
    userId: number | string,
    data: Partial<{ title: string; description: string; visibility: Visibility }>
  ): Promise<List | null> {
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (data.title !== undefined) { sets.push(`title = $${i++}`); vals.push(data.title); }
    if (data.description !== undefined) { sets.push(`description = $${i++}`); vals.push(data.description); }
    if (data.visibility !== undefined) { sets.push(`visibility = $${i++}`); vals.push(data.visibility); }
    sets.push(`updated_at = $${i++}`);
    vals.push(new Date());
    vals.push(listId);
    vals.push(userId);

    const result = await pool.query<List>(
      `UPDATE lists SET ${sets.join(', ')}
       WHERE id = $${i} AND owner_id = $${i + 1}
       RETURNING *`,
      vals
    );
    return result.rows[0] ?? null;
  },

  async delete(listId: number | string, userId: number | string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM lists WHERE id = $1 AND owner_id = $2',
      [listId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // ── LIST CARDS ───────────────────────────────────────────────────────────

  async getCards(listId: number | string, userId: number | string): Promise<ListCard[]> {
    // Also validates user has access
    const list = await this.findOne(listId, userId);
    if (!list) return [];

    const result = await pool.query<ListCard>(
      `SELECT lc.list_id, lc.card_id, lc.added_at,
              c.question, c.answer, c.due_date,
              f.name AS folder
       FROM list_cards lc
       JOIN cards c ON c.id = lc.card_id
       LEFT JOIN folders f ON f.id = c.folder_id
       WHERE lc.list_id = $1
       ORDER BY lc.added_at DESC`,
      [listId]
    );
    return result.rows;
  },

  async addCard(listId: number | string, cardId: number | string): Promise<void> {
    await pool.query(
      `INSERT INTO list_cards (list_id, card_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [listId, cardId]
    );
  },

  async removeCard(listId: number | string, cardId: number | string): Promise<void> {
    await pool.query(
      'DELETE FROM list_cards WHERE list_id = $1 AND card_id = $2',
      [listId, cardId]
    );
  },

  async copyCardToUser(cardId: number | string, userId: number | string): Promise<{ success: boolean }> {
    const cardRes = await pool.query('SELECT * FROM cards WHERE id = $1', [cardId]);
    if (cardRes.rows.length === 0) throw new Error("Card not found");
    const card = cardRes.rows[0];

    const existing = await pool.query('SELECT id FROM cards WHERE user_id = $1 AND question = $2', [userId, card.question]);
    if (existing.rows.length > 0) return { success: false };

    let folderId = null;
    if (card.folder_id) {
       const folderRes = await pool.query('SELECT name FROM folders WHERE id = $1', [card.folder_id]);
       if (folderRes.rows.length > 0) {
         const folderName = folderRes.rows[0].name;
         const newFolder = await pool.query(
            `INSERT INTO folders (mongo_id, user_id, name, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $4) 
             ON CONFLICT (user_id, name) DO UPDATE SET updated_at = EXCLUDED.updated_at 
             RETURNING id`,
             [crypto.randomUUID(), userId, folderName, new Date()]
         );
         folderId = newFolder.rows[0].id;
       }
    }

    const now = new Date();
    const dueDate = new Date();
    dueDate.setHours(0, 0, 0, 0);

    await pool.query(
      `INSERT INTO cards (mongo_id, user_id, folder_id, question, answer, ef, interval, repetitions, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 2.5, 1, 0, $6, $7, $7)`,
      [crypto.randomUUID(), userId, folderId, card.question, card.answer, dueDate, now]
    );

    return { success: true };
  },

  // ── PERMISSIONS ──────────────────────────────────────────────────────────

  async getPermissions(listId: number | string): Promise<ListPermission[]> {
    const result = await pool.query<ListPermission>(
      `SELECT lp.*, u.name AS user_name, u.email AS user_email
       FROM list_permissions lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.list_id = $1
       ORDER BY lp.invited_at`,
      [listId]
    );
    return result.rows;
  },

  /** Invite by email — looks up user, upserts permission */
  async invite(
    listId: number | string,
    email: string,
    role: Role
  ): Promise<{ success: boolean; message: string }> {
    const userResult = await pool.query<{ id: number; name: string }>(
      'SELECT id, name FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (!userResult.rows.length) {
      return { success: false, message: 'No RecallForge account found for that email.' };
    }
    const inviteeId = userResult.rows[0].id;

    await pool.query(
      `INSERT INTO list_permissions (list_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (list_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [listId, inviteeId, role]
    );
    return { success: true, message: `${userResult.rows[0].name} has been invited as ${role}.` };
  },

  async removePermission(listId: number | string, permUserId: number | string): Promise<void> {
    await pool.query(
      'DELETE FROM list_permissions WHERE list_id = $1 AND user_id = $2',
      [listId, permUserId]
    );
  },

  async updateRole(listId: number | string, permUserId: number | string, role: Role): Promise<void> {
    await pool.query(
      'UPDATE list_permissions SET role = $3 WHERE list_id = $1 AND user_id = $2',
      [listId, permUserId, role]
    );
  },
};

export default listModel;
