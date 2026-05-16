import { Request, Response } from 'express';
import {
  cardService,
  createService,
  deleteService,
  generateService,
  updateService,
} from '../services/card.service.js';
import folderModel from '../models/folderModel.js';
import dotenv from 'dotenv';
dotenv.config();

export const createCard = async (req: Request, res: Response) => {
  try {
    const card = await createService.create(
      String(req.user.id),
      req.body.question,
      req.body.answer,
      req.body.folder
    );
    res.status(201).json({ success: true, card });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const updateCard = async (req: Request, res: Response) => {
  try {
    const card = await updateService.update(
      String(req.user.id),
      req.params.id,
      req.body.question,
      req.body.answer,
      req.body.folder
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.status(201).json({ success: true, card });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const getDueCards = async (req: Request, res: Response) => {
  try {
    const cards = await cardService.getDueCardsService(String(req.user.id));
    res.json({ success: true, cards });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'An error occurred',
    });
  }
};

export const getAllCards = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const folder = req.query.folder as string;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'dueDate';
    const sortOrder = (req.query.sortOrder as string) || 'asc';

    const { cards, total, folders } = await cardService.getAllCardsService(
      String(req.user.id),
      page,
      limit,
      folder,
      search,
      sortBy,
      sortOrder
    );

    res.json({
      cards,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCards: total,
      folders: ['All', ...folders.filter(Boolean), 'Uncategorized'],
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const getFolders = async (req: Request, res: Response) => {
  try {
    const folders = await folderModel.findByUser(String(req.user.id));
    res.json({ success: true, folders: folders.map(f => ({ _id: f.id, name: f.name })) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const updateFolder = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });
    const updatedFolder = await folderModel.update({ id: req.params.id, user_id: String(req.user.id) }, name);
    if (!updatedFolder) return res.status(404).json({ error: 'Folder not found' });
    res.json({ success: true, folder: { _id: updatedFolder.id, name: updatedFolder.name } });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const deleteFolder = async (req: Request, res: Response) => {
  try {
    await folderModel.deleteById({ id: req.params.id, user_id: String(req.user.id) });
    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

export const reviewCard = async (req: Request, res: Response) => {
  try {
    const { quality } = req.body;
    const card = await cardService.reviewCardService(
      String(req.user.id),
      req.params.id,
      quality
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'An error occurred',
    });
  }
};

export const deleteCard = async (req: Request, res: Response) => {
  try {
    const cardId = req.params.id;
    // Validate it's a numeric ID
    if (!/^\d+$/.test(cardId)) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    const result = await deleteService.delete(String(req.user.id), cardId);
    if (!result) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'An error occurred',
    });
  }
};

export const generateAnswer = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const response = await generateService.generateAnswerService(question);

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Error generating answer:', err);
    res.write(
      `data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'An error occurred' })}\n\n`
    );
    res.end();
  }
};
