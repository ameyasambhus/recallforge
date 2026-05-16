import { Request, Response } from 'express';
import userModel from '../models/userModel.js';
import cardModel from '../models/cardModel.js';
import folderModel from '../models/folderModel.js';
import pool from '../config/postgres.js';
import { cardService } from '../services/card.service.js';

export const getUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
      // review_date is now a plain 'YYYY-MM-DD' string — no UTC shift risk
      reviewHistory[row.review_date] = Number(row.cards_reviewed);
    }

    res.json({
      success: true,
      userData: {
        name: user.name,
        email: user.email,
        isAccountVerified: user.is_account_verified,
        currentStreak,
        reviewHistory,
      },
    });
  } catch (error) {
    res.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    console.log(`[deleteUser] Attempting to delete user with ID: ${userId}`);

    // CASCADE is set in DB, but explicit deletion is fine too
    await cardModel.deleteByUser(userId);
    console.log(`[deleteUser] Deleted cards for user ${userId}.`);

    await folderModel.deleteByUser(userId);
    console.log(`[deleteUser] Deleted folders for user ${userId}.`);

    const deletedUser = await userModel.deleteById(userId);
    if (!deletedUser) {
      console.log(`[deleteUser] User not found for ID: ${userId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`[deleteUser] Successfully deleted user with ID: ${userId}`);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error(`[deleteUser] Error deleting user:`, error);
    res.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
