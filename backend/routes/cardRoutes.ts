import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  createCard,
  deleteCard,
  generateAnswer,
  getAllCards,
  getDueCards,
  getFolders,
  updateFolder,
  deleteFolder,
  reviewCard,
  updateCard,
  uploadCardMedia,
  getCardMedia,
  deleteCardMedia,
  viewCardMedia,
  downloadCardMedia,
  bulkDeleteCards,
  checkDuplicate,
  searchCards,
} from "../controllers/card.controller.js";
import mediaRateLimiter from "../middleware/mediaRateLimiter.js";
import mediaUploadParser from "../middleware/mediaUploadParser.js";
const cardRouter = express.Router();
cardRouter.post("/log", userAuth, mediaUploadParser, createCard);
cardRouter.post("/cards/check-duplicate", userAuth, checkDuplicate);
cardRouter.get("/cards/search", userAuth, searchCards);
cardRouter.post("/:id/media", userAuth, mediaRateLimiter, mediaUploadParser, uploadCardMedia);
cardRouter.get("/:id/media", userAuth, getCardMedia);
cardRouter.get("/:id/media/:mediaId/view", userAuth, viewCardMedia);
cardRouter.get("/:id/media/:mediaId/download", userAuth, downloadCardMedia);
cardRouter.delete("/:id/media/:mediaId", userAuth, deleteCardMedia);
cardRouter.get("/folders", userAuth, getFolders);
cardRouter.put("/folder/:id/update", userAuth, updateFolder);
cardRouter.delete("/folder/:id/delete", userAuth, deleteFolder);
cardRouter.get("/due", userAuth, getDueCards);
cardRouter.get("/cards", userAuth, getAllCards);
cardRouter.put("/:id/review", userAuth, reviewCard);
cardRouter.put("/:id/update", userAuth, updateCard);
cardRouter.post("/bulk-delete", userAuth, bulkDeleteCards);
cardRouter.delete("/:id/delete", userAuth, deleteCard);
cardRouter.post("/generate", userAuth, generateAnswer);

export default cardRouter;
