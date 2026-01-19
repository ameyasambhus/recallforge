import { Request, Response } from "express";
import userModel from "../models/userModel.js";

export const getUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      userData: {
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error instanceof Error ? error.message : "An error occurred" });
  }
};

import cardModel from "../models/cardModel.js";
import folderModel from "../models/folderModel.js";

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    console.log(`[deleteUser] Attempting to delete user with ID: ${userId}`);

    // Delete associated data
    const deletedCards = await cardModel.deleteMany({ user: userId });
    console.log(`[deleteUser] Deleted ${deletedCards.deletedCount} cards.`);

    const deletedFolders = await folderModel.deleteMany({ user: userId });
    console.log(`[deleteUser] Deleted ${deletedFolders.deletedCount} folders.`);
    
    const deletedUser = await userModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      console.log(`[deleteUser] User not found for ID: ${userId}`);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log(`[deleteUser] Successfully deleted user with ID: ${userId}`);
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error(`[deleteUser] Error deleting user:`, error);
    res.json({
      success: false,
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
};
