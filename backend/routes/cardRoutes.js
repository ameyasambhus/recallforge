import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  createCard,
  deleteCard,
  getAllCards,
  getDueCards,
  reviewCard,
  updateCard,
} from "../controllers/cardController.js";
const cardRouter = express.Router();
cardRouter.post("/log", userAuth, createCard);
cardRouter.get("/due", userAuth, getDueCards);
cardRouter.get("/cards", userAuth, getAllCards);
cardRouter.put("/:id/review", userAuth, reviewCard);
cardRouter.put("/:id/update", userAuth, updateCard);
cardRouter.delete("/:id/delete", userAuth, deleteCard);

export default cardRouter;
