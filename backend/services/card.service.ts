import { GoogleGenAI } from '@google/genai';
import cardModel from '../models/cardModel.js';
import userModel from '../models/userModel.js';
import userSettingsModel from '../models/userSettingsModel.js';
import pool from '../config/postgres.js';
import { redis } from '../config/upstash.js';
import { generateEmbedding } from '../utils/embedding.js';

export async function invalidateUserCardsCache(userId: string | number) {
  try {
    const pattern = `cards:${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error(`Failed to invalidate cache for user ${userId}:`, err);
  }
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

function formatSimilarityInput(text: string): string {
  return `task: sentence similarity | query: ${text}`;
}

function formatSearchInput(text: string): string {
  return `task: search result | query: ${text}`;
}


export const createService = {
  async create(userId: string, question: string, answer: string, folder: string | undefined) {
    const embeddingValues = await generateEmbedding(
      formatSearchInput(`${question} ${answer}`)
    );
    const embedding = toVectorLiteral(embeddingValues);
    const card = await cardModel.create({ user_id: userId, question, answer, folder, embedding });
    await invalidateUserCardsCache(userId);
    return card;
  },
};

export const updateService = {
  async update(userId: string, cardId: string, question: string, answer: string, folder: string) {
    const embeddingValues = await generateEmbedding(
      formatSearchInput(`${question} ${answer}`)
    );
    const embedding = toVectorLiteral(embeddingValues);
    const card = await cardModel.findAndUpdate(
      { id: cardId, user_id: userId },
      { question, answer, folder, embedding }
    );
    await invalidateUserCardsCache(userId);
    return card;
  },
};

export const deleteService = {
  async delete(userId: string, cardId: string) {
    const result = await cardModel.findAndDelete({ id: cardId, user_id: userId });
    await invalidateUserCardsCache(userId);
    return result;
  },
};

export const cardService = {
  getISTStartOfDay(): Date {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utc + istOffset);
    istTime.setHours(0, 0, 0, 0);
    return new Date(istTime.getTime() - istOffset);
  },

  getISTDateStr(date: Date = new Date()): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  },

  async getDueCardsService(userId: string) {
    const today = this.getISTStartOfDay();
    return await cardModel.findDue(userId, today);
  },

  async getAllCardsService(
    userId: string,
    page: number,
    limit: number,
    folder: string,
    search: string,
    sortBy: string,
    sortOrder: string
  ) {
    const cacheKey = `cards:${userId}:page:${page}`;
    const isDefaultQuery = !folder && !search && limit === 10 && sortBy === 'dueDate' && sortOrder === 'asc';

    if (isDefaultQuery) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
          if (
            parsed &&
            Array.isArray(parsed.cards) &&
            typeof parsed.total === 'number' &&
            Array.isArray(parsed.folders)
          ) {
            return parsed;
          }
          // Delete stale/invalid cache format
          await redis.del(cacheKey);
        }
      } catch (err) {
        console.error('Redis cache hit error:', err);
      }
    }

    const offset = (page - 1) * limit;
    const { cards, total, folderNames } = await cardModel.findAll({
      userId,
      folder,
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    const result = { cards, total, folders: folderNames };

    if (isDefaultQuery) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 30 });
      } catch (err) {
        console.error('Redis cache store error:', err);
      }
    }

    return result;
  },

  async reviewCardService(userId: string, cardId: string, quality: number) {
    const card = await cardModel.findOne({ id: cardId, user_id: userId });
    if (!card) return null;

    // Fetch user settings (fallback to creating defaults if none exists)
    let settings = await userSettingsModel.findByUserId(userId);
    if (!settings) {
      settings = await userSettingsModel.createDefault(userId);
    }

    let ef = Number(card.ef);
    let { repetitions, interval } = card;

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (ef < Number(settings.min_ef)) {
        ef = Number(settings.min_ef);
      }

      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * ef * Number(settings.interval_modifier));
      }

      if (quality === 5) {
        interval = Math.round(interval * Number(settings.easy_bonus));
      }
    }

    // Bound limits
    if (interval > Number(settings.max_interval)) {
      interval = Number(settings.max_interval);
    }
    if (interval < 1) {
      interval = 1;
    }

    const istStartOfToday = this.getISTStartOfDay();
    const nextDue = new Date(istStartOfToday);
    nextDue.setDate(nextDue.getDate() + interval);

    const updatedCard = await cardModel.findAndUpdate(
      { id: cardId, user_id: userId },
      { ef, repetitions, interval, due_date: nextDue }
    );

    // Invalidate user card cache on review
    await invalidateUserCardsCache(userId);

    // Update streak and review history
    const user = await userModel.findById(userId);
    if (user) {
      const todayStr = this.getISTDateStr();
      const lastReviewDate = await this.getLastReviewDate(Number(userId));
      const lastReviewStr = lastReviewDate ? String(lastReviewDate).slice(0, 10) : null;

      // Upsert today's review_history row
      await pool.query(
        `INSERT INTO review_history (user_id, review_date, cards_reviewed)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, review_date)
         DO UPDATE SET cards_reviewed = review_history.cards_reviewed + 1`,
        [userId, todayStr]
      );

      if (todayStr !== lastReviewStr) {
        let isConsecutive = false;
        if (lastReviewStr) {
          const yesterday = new Date(this.getISTStartOfDay());
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = this.getISTDateStr(yesterday);
          isConsecutive = lastReviewStr === yesterdayStr;
        }

        const newStreak = isConsecutive ? user.current_streak + 1 : 1;
        await userModel.update(Number(userId), { current_streak: newStreak });
      }
    }

    return updatedCard;
  },

  /** Get the most recent review_date for a user */
  async getLastReviewDate(userId: number): Promise<string | null> {
    const result = await pool.query<{ review_date: string }>(
      `SELECT review_date::text FROM review_history WHERE user_id = $1 ORDER BY review_date DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0]?.review_date ?? null;
  },

  async checkDuplicateService(userId: string, question: string, answer: string) {
    const results: Array<{ question: string; answer: string; similarity: number }> = [];
    const seen = new Map<string, { question: string; answer: string; similarity: number }>();

    const trimmedQuestion = question.trim();
    if (trimmedQuestion) {
      const questionEmbedding = toVectorLiteral(
        await generateEmbedding(formatSimilarityInput(trimmedQuestion))
      );
      const questionMatches = await cardModel.findDuplicatesByEmbedding({
        userId,
        embedding: questionEmbedding,
        minSimilarity: 0.7,
        limit: 3,
      });

      questionMatches.forEach((match) => {
        const key = `${match.question}||${match.answer}`;
        const existing = seen.get(key);
        if (!existing || match.similarity > existing.similarity) {
          seen.set(key, match);
        }
      });
    }

    const trimmedAnswer = answer.trim();
    if (trimmedAnswer) {
      const answerEmbedding = toVectorLiteral(
        await generateEmbedding(formatSimilarityInput(trimmedAnswer))
      );
      const answerMatches = await cardModel.findDuplicatesByEmbedding({
        userId,
        embedding: answerEmbedding,
        minSimilarity: 0.7,
        limit: 3,
      });

      answerMatches.forEach((match) => {
        const key = `${match.question}||${match.answer}`;
        const existing = seen.get(key);
        if (!existing || match.similarity > existing.similarity) {
          seen.set(key, match);
        }
      });
    }

    results.push(...seen.values());
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, 3);
  },

  async semanticSearchService(userId: string, query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.length < 4) {
      return cardModel.searchByKeyword({
        userId,
        query: trimmed,
        limit: 10,
      });
    }

    const embeddingValues = await generateEmbedding(formatSearchInput(trimmed));
    const embedding = toVectorLiteral(embeddingValues);

    return cardModel.searchByEmbedding({
      userId,
      embedding,
      minSimilarity: 0.65,
      limit: 10,
    });
  },
};

export const generateService = {
  async generateAnswerService(question: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash-lite',
      contents: question,
      config: {
        systemInstruction:
          'You are a tutor. You will be provided a question or a topic, mostly related to academics. Generate a short, concise response which will explain what the given topic is. Complete your response within 200 max output tokens',
        maxOutputTokens: 200,
      },
    });
    return response;
  },
};
