import { Request, Response } from 'express';
import {
  cardService,
  createService,
  deleteService,
  generateService,
  updateService,
} from '../services/card.service.js';
import { cardMediaService } from '../services/cardMedia.service.js';
import cardMediaModel from '../models/cardMediaModel.js';
import folderModel from '../models/folderModel.js';
import {
  assertMediaUploadAllowed,
  consumeAiUsageOrThrow,
  getSubscriptionSnapshot,
} from '../services/subscription.service.js';
import dotenv from 'dotenv';
dotenv.config();

export const createCard = async (req: Request, res: Response) => {
  let createdCard: any = null;
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    await assertMediaUploadAllowed(String(req.user.id), files.length, 0);

    const card = await createService.create(
      String(req.user.id),
      req.body.question,
      req.body.answer,
      req.body.folder
    );
    createdCard = card;

    if (files.length) {
      const uploadedFiles = await cardMediaService.uploadFiles(files);
      await cardMediaModel.createMany(
        uploadedFiles.map((file) => ({
          card_id: card.id,
          url: file.url,
          media_type: file.media_type,
          file_name: file.file_name,
          size_bytes: file.size_bytes,
        }))
      );
    }

    res.status(201).json({ success: true, card });
  } catch (err) {
    if (createdCard?.id) {
      try {
        await deleteService.delete(String(req.user.id), String(createdCard.id));
      } catch (deleteErr) {
        console.error('Rollback failed for card create:', deleteErr);
      }
    }
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    const statusCode = errorMessage.includes('plan') ? 403 : 400;
    res.status(statusCode).json({ error: errorMessage });
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

    // Clean up media first
    try {
      await cardMediaService.deleteAllForCard(String(req.user.id), cardId, req.user?.email);
    } catch (mediaErr) {
      console.error(`Media cleanup failed for card ${cardId}:`, mediaErr);
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

export const bulkDeleteCards = async (req: Request, res: Response) => {
  try {
    const { cardIds } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: 'cardIds must be a non-empty array' });
    }

    const invalidIds = cardIds.filter((id) => !/^\d+$/.test(String(id)));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: 'All card IDs must be numeric' });
    }

    const userId = String(req.user.id);
    const requesterEmail = req.user?.email;
    let deletedCount = 0;

    for (const cardId of cardIds) {
      const cardIdStr = String(cardId);
      try {
        await cardMediaService.deleteAllForCard(userId, cardIdStr, requesterEmail);
      } catch (mediaErr) {
        console.error(`Media cleanup failed for card ${cardIdStr} during bulk delete:`, mediaErr);
      }

      const result = await deleteService.delete(userId, cardIdStr);
      if (result) {
        deletedCount++;
      }
    }

    res.json({ success: true, message: `${deletedCount} cards deleted successfully` });
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

    await consumeAiUsageOrThrow(String(req.user.id));

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

    const subscription = await getSubscriptionSnapshot(String(req.user.id));
    res.write(`data: ${JSON.stringify({ done: true, subscription })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Error generating answer:', err);

    if (!res.headersSent) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      const statusCode = errorMessage.includes('Monthly AI answer limit reached') ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
      });
    }

    res.write(
      `data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'An error occurred' })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
};

export const uploadCardMedia = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const media = await cardMediaService.uploadToCard(
      String(req.user.id),
      req.params.id,
      files,
      req.user?.email
    );
    res.status(201).json({ success: true, media });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    const statusCode =
      errorMessage === 'Card not found'
        ? 404
        : errorMessage === 'Forbidden'
          ? 403
          : errorMessage.toLowerCase().includes('plan')
            ? 403
          : 400;
    res.status(statusCode).json({ success: false, error: errorMessage });
  }
};

export const getCardMedia = async (req: Request, res: Response) => {
  try {
    const media = await cardMediaService.getForCard(
      String(req.user.id),
      req.params.id,
      req.user?.email
    );
    res.json({ success: true, media });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    const statusCode =
      errorMessage === 'Card not found'
        ? 404
        : errorMessage === 'Forbidden'
          ? 403
          : 400;
    res.status(statusCode).json({ success: false, error: errorMessage });
  }
};

export const deleteCardMedia = async (req: Request, res: Response) => {
  try {
    await cardMediaService.deleteFromCard(
      String(req.user.id),
      req.params.id,
      req.params.mediaId,
      req.user?.email
    );
    res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    const statusCode =
      errorMessage === 'Card not found' || errorMessage === 'Media not found'
        ? 404
        : errorMessage === 'Forbidden'
          ? 403
          : 400;
    res.status(statusCode).json({ success: false, error: errorMessage });
  }
};

export const viewCardMedia = async (req: Request, res: Response) => {
  try {
    const media = await cardMediaService.viewMedia(
      String(req.user.id),
      req.params.id,
      req.params.mediaId,
      req.user?.email,
      req.headers.range as string | undefined
    );

    res.status(media.status || 200);
    if (media.contentType) {
      res.setHeader('Content-Type', media.contentType);
    }
    if (media.contentLength) {
      res.setHeader('Content-Length', media.contentLength);
    }
    if (media.contentRange) {
      res.setHeader('Content-Range', media.contentRange);
    }
    if (media.acceptRanges) {
      res.setHeader('Accept-Ranges', media.acceptRanges);
    }
    if (media.fileName) {
      res.setHeader('Content-Disposition', `inline; filename="${media.fileName}"`);
    }

    media.stream.pipe(res);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    const statusCode =
      errorMessage === 'Card not found' || errorMessage === 'Media not found'
        ? 404
        : errorMessage === 'Forbidden'
          ? 403
          : 400;
    res.status(statusCode).json({ success: false, error: errorMessage });
  }
};

export const downloadCardMedia = async (req: Request, res: Response) => {
  try {
    const media = await cardMediaService.viewMedia(
      String(req.user.id),
      req.params.id,
      req.params.mediaId,
      req.user?.email,
      req.headers.range as string | undefined
    );

    res.status(media.status || 200);
    if (media.contentType) {
      res.setHeader('Content-Type', media.contentType);
    }
    if (media.contentLength) {
      res.setHeader('Content-Length', media.contentLength);
    }
    if (media.contentRange) {
      res.setHeader('Content-Range', media.contentRange);
    }
    if (media.acceptRanges) {
      res.setHeader('Accept-Ranges', media.acceptRanges);
    }

    const fileName = media.fileName || `attachment-${req.params.mediaId}`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    media.stream.pipe(res);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    const statusCode =
      errorMessage === 'Card not found' || errorMessage === 'Media not found'
        ? 404
        : errorMessage === 'Forbidden'
          ? 403
          : 400;
    res.status(statusCode).json({ success: false, error: errorMessage });
  }
};
