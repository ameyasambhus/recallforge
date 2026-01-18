import { Request, Response } from "express";
import cardModel from "../models/cardModel.js";
import folderModel from "../models/folderModel.js";

export const exportData = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        // Export content fields, excluding system fields and user references
        const exportCards = await cardModel.find({ user: userId }).select('question answer folder EF interval repetitions dueDate -_id');
        const exportFolders = await folderModel.find({ user: userId }).select('name -_id');

        const data = {
            version: 1,
            timestamp: new Date().toISOString(),
            folders: exportFolders,
            cards: exportCards
        };

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Error exporting data" });
    }
};

export const importData = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { data } = req.body;

        if (!data || !data.cards) {
            return res.status(400).json({ success: false, message: "Invalid data format. 'cards' array is required." });
        }

        const { cards, folders } = data;

        // Import folders
        if (folders && Array.isArray(folders)) {
            for (const folder of folders) {
                if (!folder.name) continue;
                // Check if exists to avoid duplicates (though index handles it, this avoids errors)
                const exists = await folderModel.findOne({ user: userId, name: folder.name });
                if (!exists) {
                    await folderModel.create({ user: userId, name: folder.name });
                }
            }
        }

        let addedCount = 0;
        let skippedCount = 0;

        if (cards && Array.isArray(cards)) {
            for (const card of cards) {
                if (!card.question || !card.answer || !card.folder) continue;

                const exists = await cardModel.findOne({
                    user: userId,
                    question: card.question,
                    folder: card.folder
                });

                if (!exists) {
                    await cardModel.create({
                        user: userId,
                        question: card.question,
                        answer: card.answer,
                        folder: card.folder,
                        EF: card.EF || 2.5,
                        interval: card.interval || 1,
                        repetitions: card.repetitions || 0,
                        dueDate: card.dueDate || new Date()
                    });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }
        }

        res.json({
            success: true,
            message: `Import completed. Added ${addedCount} cards. Skipped ${skippedCount} duplicates.`
        });

    } catch (error) {
        console.error("Import error:", error);
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Error importing data" });
    }
};
