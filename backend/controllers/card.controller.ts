import { Request, Response } from "express";
import cardModel from "../models/cardModel.js";
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
export const getDueCards = async (req: Request, res: Response) => {
  try {
    const today = new Date(new Date().setHours(0, 0, 0, 0)); // local start of today
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
    const cards = await cardModel.find({ user: req.user._id });
    res.json(cards);
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

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + interval);
    nextDue.setHours(0, 0, 0, 0);

    card.EF = EF;
    card.repetitions = repetitions;
    card.interval = interval;
    card.dueDate = nextDue;

    await card.save();
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
