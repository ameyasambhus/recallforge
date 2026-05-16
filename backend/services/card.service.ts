import { GoogleGenAI } from '@google/genai';
import cardModel from '../models/cardModel.js';
import userModel from '../models/userModel.js';
import pool from '../config/postgres.js';

export const createService = {
  async create(userId: string, question: string, answer: string, folder: string | undefined) {
    return await cardModel.create({ user_id: userId, question, answer, folder });
  },
};

export const updateService = {
  async update(userId: string, cardId: string, question: string, answer: string, folder: string) {
    return await cardModel.findAndUpdate(
      { id: cardId, user_id: userId },
      { question, answer, folder }
    );
  },
};

export const deleteService = {
  async delete(userId: string, cardId: string) {
    return await cardModel.findAndDelete({ id: cardId, user_id: userId });
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
    return { cards, total, folders: folderNames };
  },

  async reviewCardService(userId: string, cardId: string, quality: number) {
    const card = await cardModel.findOne({ id: cardId, user_id: userId });
    if (!card) return null;

    let ef = Number(card.ef);
    let { repetitions, interval } = card;

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (ef < 1.3) ef = 1.3;
      repetitions += 1;

      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = Math.round(1 * ef);
      } else {
        interval = Math.round(interval * ef);
      }
    }

    const istStartOfToday = this.getISTStartOfDay();
    const nextDue = new Date(istStartOfToday);
    nextDue.setDate(nextDue.getDate() + interval);

    const updatedCard = await cardModel.findAndUpdate(
      { id: cardId, user_id: userId },
      { ef, repetitions, interval, due_date: nextDue }
    );

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
};

export const generateService = {
  async generateAnswerService(question: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-exp',
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
