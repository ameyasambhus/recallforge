import pool from '../config/postgres.js';
import userModel from '../models/userModel.js';
import cardModel from '../models/cardModel.js';
import folderModel from '../models/folderModel.js';
import userSettingsModel from '../models/userSettingsModel.js';
import { cardService } from './card.service.js';
import { getSubscriptionSnapshot } from './subscription.service.js';

export const userService = {
  async getUserData(userId: string | number) {
    const user = await userModel.findById(userId);
    if (!user) {
      return null;
    }

    // Check / reset streak based on last review date
    let currentStreak = user.current_streak;
    const lastReviewDate = await cardService.getLastReviewDate(user.id);

    if (lastReviewDate) {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      // pg DATE column is already a plain 'YYYY-MM-DD' string — use it directly
      const lastReviewStr = String(lastReviewDate).slice(0, 10);

      if (lastReviewStr !== todayStr && lastReviewStr !== yesterdayStr) {
        currentStreak = 0;
        if (user.current_streak !== 0) {
          await userModel.update(user.id, { current_streak: 0 });
        }
      }
    } else if (currentStreak > 0) {
      currentStreak = 0;
      await userModel.update(user.id, { current_streak: 0 });
    }

    // Fetch review history from review_history table
    // Cast review_date to TEXT so pg returns 'YYYY-MM-DD' directly (avoids UTC Date object shift)
    const historyResult = await pool.query<{ review_date: string; cards_reviewed: number }>(
      `SELECT review_date::text, cards_reviewed
       FROM review_history WHERE user_id = $1 ORDER BY review_date`,
      [userId]
    );

    const reviewHistory: Record<string, number> = {};
    for (const row of historyResult.rows) {
      reviewHistory[row.review_date] = Number(row.cards_reviewed);
    }

    const subscription = await getSubscriptionSnapshot(user.id);

    return {
      name: user.name,
      email: user.email,
      isAccountVerified: user.is_account_verified,
      currentStreak,
      reviewHistory,
      subscription,
    };
  },

  async deleteUser(userId: string | number) {
    // Cascade actions
    await cardModel.deleteByUser(userId);
    await folderModel.deleteByUser(userId);
    return await userModel.deleteById(userId);
  },

  async getSettings(userId: string | number) {
    let settings = await userSettingsModel.findByUserId(userId);
    if (!settings) {
      settings = await userSettingsModel.createDefault(userId);
    }
    return settings;
  },

  async updateSettings(userId: string | number, data: any) {
    return await userSettingsModel.update(userId, data);
  },
};
