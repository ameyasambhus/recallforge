import { Request, Response } from "express";
import cardModel from "../models/cardModel.js";
import userModel from "../models/userModel.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config()
export const createCard = async (req: Request, res: Response) => {
  try {
    const card = new cardModel({
      question: req.body.question,
      answer: req.body.answer,
      user: req.user._id,
      folder: req.body.folder,
    });
    await card.save();
    res.status(201).json({ success: true, card });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" });
  }
};
export const updateCard = async (req: Request, res: Response) => {
  try {
    const card = await cardModel.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!card) return res.status(404).json({ error: "Card not found" });
    card.question = req.body.question;
    card.answer = req.body.answer;
    card.folder = req.body.folder;

    await card.save();
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "An error occurred" });
  }
};
// Helper to get start of today in IST
const getISTStartOfDay = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
  const istTime = new Date(utc + istOffset);
  
  // Reset to 00:00:00 IST
  istTime.setHours(0, 0, 0, 0);
  
  // Convert back to UTC timestamp for the Date object
  // We want the Moment in Time that corresponds to 00:00:00 IST
  // istTime (as generic date) represents X timestamp.
  // X - offset = UTC timestamp.
  return new Date(istTime.getTime() - istOffset);
};

// Helper to get YYYY-MM-DD string in IST
const getISTDateStr = (date: Date = new Date()) => {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

export const getDueCards = async (req: Request, res: Response) => {
  try {
    const today = getISTStartOfDay(); // 00:00:00 IST
    // We want all cards where dueDate <= Now (or beginning of today)
    // Actually, usually if dueDate is 00:00:00 IST, checking <= today includes it.
    
    // NOTE: If using $lte: today, and today is 00:00:00 IST.
    // Ensure dueDate is also stored as 00:00:00 IST.
    
    const cards = await cardModel.find({
      user: req.user._id,
      dueDate: { $lte: today },
    });
    res.json({ success: true, cards });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "An error occurred" });
  }
};
export const getAllCards = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const folder = req.query.folder as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string || "dueDate";
    const sortOrder = req.query.sortOrder as string || "asc";
    const skip = (page - 1) * limit;

    console.log(`getAllCards: page=${page}, limit=${limit}, skip=${skip}, folder=${folder}, search=${search}, sortBy=${sortBy}, sortOrder=${sortOrder}`);

    const query: any = { user: req.user._id };
    
    // Folder filter
    if (folder && folder !== "All") {
      query.folder = folder === "Uncategorized" ? { $in: [null, ""] } : folder;
    }

    // Search filter - combine with $and to ensure user filter is applied
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { question: searchRegex },
        { answer: searchRegex }
      ];
    }

    // Sort configuration
    const sortConfig: any = {};
    const validSortFields = ['question', 'folder', 'dueDate', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'dueDate';
    sortConfig[sortField] = sortOrder === 'desc' ? -1 : 1;

    console.log('MongoDB query:', JSON.stringify(query));
    console.log('Sort config:', JSON.stringify(sortConfig));

    const cards = await cardModel.find(query)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit);

    console.log(`getAllCards returning ${cards.length} cards`);

    const total = await cardModel.countDocuments(query);

    // Get all unique folders for the filter dropdown
    const folders = await cardModel.distinct("folder", { user: req.user._id });

    res.json({
      cards,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCards: total,
      folders: ["All", ...folders.filter(f => f), "Uncategorized"],
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "An error occurred" });
  }
};
export const reviewCard = async (req: Request, res: Response) => {
  try {
    const { quality } = req.body;
    const card = await cardModel.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!card) return res.status(404).json({ error: "Card not found" });

    let { EF, repetitions, interval } = card;

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      EF = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (EF < 1.3) EF = 1.3;

      repetitions += 1;

      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = Math.round(1 * EF);
      } else {
        interval = Math.round(interval * EF);
      }
    }

    // Calculate Next Due Date in IST
    const istStartOfToday = getISTStartOfDay();
    const nextDue = new Date(istStartOfToday);
    nextDue.setDate(nextDue.getDate() + interval);
    // nextDue is now 00:00:00 IST on the future date

    card.EF = EF;
    card.repetitions = repetitions;
    card.interval = interval;
    card.dueDate = nextDue;

    await card.save();

    // Update Streak and Review History
    const user = await userModel.findById(req.user._id);
    if (user) {
      // Logic:
      // Compare "Today IST string" with "LastReview IST string"
      const todayStr = getISTDateStr(new Date()); // IST YYYY-MM-DD
      const lastReviewStr = user.lastReviewDate ? getISTDateStr(new Date(user.lastReviewDate)) : null;

      if (todayStr !== lastReviewStr) {
        // Different days. Check if consecutive.
        // Convert strings to dates for math? Or just generic subtraction?
        // Let's use Date objects at 00:00 IST for math.
        const todayIST = getISTStartOfDay();
        const lastReviewIST = user.lastReviewDate ? new Date(user.lastReviewDate) : null;
        
        // Align lastReviewIST to 00:00 IST if it exists? 
        // We can just re-calculate from lastReviewStr
        let isConsecutive = false;
        if (lastReviewStr) {
            const d1 = new Date(lastReviewStr); // "YYYY-MM-DD" treated as UTC?
            // Actually, comparing strings is safer for equality.
            // For consecutive check:
            const oneDayMs = 86400000;
            // Get today in IST (timestamp relative)
            const todayTime = todayIST.getTime();
            // Get last review in IST (timestamp relative)
            // But lastReviewDate from DB might be in middle of day.
            // Re-construct 00:00 IST for last review:
            // This is complex. Simpler: 
            // If (YesterdayStr == LastReviewStr) -> Consecutive.
            
            const yesterday = new Date(todayIST);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getISTDateStr(yesterday);
            
            if (lastReviewStr === yesterdayStr) {
                isConsecutive = true;
            }
        }
        
        if (isConsecutive) {
          user.currentStreak += 1;
        } else {
          user.currentStreak = 1;
        }
        user.lastReviewDate = new Date(); // Save absolute timestamp of review
      }

      // Update History map with IST date string
      const count = user.reviewHistory ? user.reviewHistory.get(todayStr) || 0 : 0;
      
      if (!user.reviewHistory) {
         user.reviewHistory = new Map();
      }
      user.reviewHistory.set(todayStr, count + 1);

      await user.save();
    }

    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "An error occurred" });
  }
};
export const deleteCard = async (req: Request, res: Response) => {
  try {
    const card = await cardModel.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    res.json({ message: "Card deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "An error occurred" });
  }
};

export const generateAnswer = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: "Question is required" });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContentStream({
      model: "gemini-2.0-flash-exp",
      contents: question,
      config: {
        systemInstruction: "You are a tutor. You will be provided a question or a topic, mostly related to academics. Generate a short, concise response which will explain what the given topic is. Complete your response within 200 max output tokens",
        maxOutputTokens: 200
      },
    });

    // Stream each chunk to the client
    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        // Send chunk as SSE format
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Error generating answer:', err);
    // Send error as SSE event
    res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "An error occurred" })}\n\n`);
    res.end();
  }
};
