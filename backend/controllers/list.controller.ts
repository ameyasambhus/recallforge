import { Request, Response } from 'express';
import listModel, { Role, Visibility } from '../models/listModel.js';

// ── Lists ───────────────────────────────────────────────────────────────────

export const createList = async (req: Request, res: Response) => {
  try {
    const { title, description, visibility } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' });
    const list = await listModel.create({
      owner_id: req.user.id,
      title: title.trim(),
      description: description?.trim() ?? '',
      visibility: visibility ?? 'private',
    });
    res.status(201).json({ success: true, list });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const getLists = async (req: Request, res: Response) => {
  try {
    const lists = await listModel.findAllForUser(req.user.id);
    res.json({ success: true, lists });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const getList = async (req: Request, res: Response) => {
  try {
    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });
    res.json({ success: true, list });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const updateList = async (req: Request, res: Response) => {
  try {
    const { title, description, visibility } = req.body;
    const list = await listModel.update(req.params.id, req.user.id, { title, description, visibility });
    if (!list) return res.status(404).json({ error: 'List not found or you do not own it.' });
    res.json({ success: true, list });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const deleteList = async (req: Request, res: Response) => {
  try {
    const deleted = await listModel.delete(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'List not found or you do not own it.' });
    res.json({ success: true, message: 'List deleted.' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

// ── Cards inside a list ────────────────────────────────────────────────────

export const getListCards = async (req: Request, res: Response) => {
  try {
    const cards = await listModel.getCards(req.params.id, req.user.id);
    res.json({ success: true, cards });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const addCardToList = async (req: Request, res: Response) => {
  try {
    const { cardId } = req.body;
    if (!cardId) return res.status(400).json({ error: 'cardId is required.' });

    // Permission check: owner or editor only
    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });
    if (list.my_role === 'viewer') return res.status(403).json({ error: 'You only have viewer access.' });

    await listModel.addCard(req.params.id, cardId);
    res.json({ success: true, message: 'Card added to list.' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const removeCardFromList = async (req: Request, res: Response) => {
  try {
    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });
    if (list.my_role === 'viewer') return res.status(403).json({ error: 'You only have viewer access.' });

    await listModel.removeCard(req.params.id, req.params.cardId);
    res.json({ success: true, message: 'Card removed from list.' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const copyCardFromList = async (req: Request, res: Response) => {
  try {
    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });

    const result = await listModel.copyCardToUser(req.params.cardId, req.user.id);
    if (result.success) {
      res.json({ success: true, message: 'Card copied successfully.' });
    } else {
      res.json({ success: true, message: 'You already have this card.' });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

// ── Permissions ────────────────────────────────────────────────────────────

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });
    if (list.my_role !== 'owner') return res.status(403).json({ error: 'Only the owner can manage permissions.' });

    const permissions = await listModel.getPermissions(req.params.id);
    res.json({ success: true, permissions });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!['viewer', 'editor'].includes(role)) return res.status(400).json({ error: 'Role must be viewer or editor.' });

    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });
    if (list.my_role !== 'owner') return res.status(403).json({ error: 'Only the owner can invite people.' });

    // Don't let owner invite themselves
    if (email === req.user.email) return res.status(400).json({ error: 'You already own this list.' });

    const result = await listModel.invite(req.params.id, email, role as Role);
    if (!result.success) return res.status(404).json({ error: result.message });

    // Update visibility to 'shared' if it was private
    if (list.visibility === 'private') {
      await listModel.update(req.params.id, req.user.id, { visibility: 'shared' });
    }

    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const removePermission = async (req: Request, res: Response) => {
  try {
    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });
    if (list.my_role !== 'owner') return res.status(403).json({ error: 'Only the owner can remove people.' });

    await listModel.removePermission(req.params.id, req.params.userId);
    res.json({ success: true, message: 'Permission removed.' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const updatePermission = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!['viewer', 'editor'].includes(role)) return res.status(400).json({ error: 'Role must be viewer or editor.' });

    const list = await listModel.findOne(req.params.id, req.user.id);
    if (!list) return res.status(404).json({ error: 'List not found or access denied.' });
    if (list.my_role !== 'owner') return res.status(403).json({ error: 'Only the owner can change roles.' });

    await listModel.updateRole(req.params.id, req.params.userId, role as Role);
    res.json({ success: true, message: 'Role updated.' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};
