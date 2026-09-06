import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';

export const getUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const userData = await userService.getUserData(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      userData,
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

    const deletedUser = await userService.deleteUser(userId);
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

export const getSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const settings = await userService.getSettings(userId);
    res.json({ success: true, settings });
  } catch (error) {
    res.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { easy_bonus, interval_modifier, max_interval, min_ef } = req.body;

    // Validate easy_bonus (1.0 - 2.0)
    const eb = Number(easy_bonus);
    if (isNaN(eb) || eb < 1.0 || eb > 2.0) {
      return res.json({ success: false, message: 'Easy bonus must be between 1.0 and 2.0' });
    }

    // Validate interval_modifier (0.5 - 2.0)
    const im = Number(interval_modifier);
    if (isNaN(im) || im < 0.5 || im > 2.0) {
      return res.json({ success: false, message: 'Interval modifier must be between 0.5 and 2.0' });
    }

    // Validate max_interval (1 - 36500)
    const mi = Number(max_interval);
    if (isNaN(mi) || !Number.isInteger(mi) || mi < 1 || mi > 36500) {
      return res.json({ success: false, message: 'Max interval must be an integer between 1 and 36500' });
    }

    // Validate min_ef (1.1 - 2.5)
    const me = Number(min_ef);
    if (isNaN(me) || me < 1.1 || me > 2.5) {
      return res.json({ success: false, message: 'Minimum ease factor must be between 1.1 and 2.5' });
    }

    const updatedSettings = await userService.updateSettings(userId, {
      easy_bonus: eb,
      interval_modifier: im,
      max_interval: mi,
      min_ef: me,
    });

    res.json({ success: true, settings: updatedSettings });
  } catch (error) {
    res.json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
