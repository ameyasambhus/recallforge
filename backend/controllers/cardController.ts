import { Request, Response } from "express";
import cardModel from "../models/cardModel.js";

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
