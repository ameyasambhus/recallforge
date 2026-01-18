import express from "express";
import { exportData, importData } from "../controllers/dataController.js";
import userAuth from "../middleware/userAuth.js";

const dataRouter = express.Router();

dataRouter.get("/export", userAuth, exportData);
dataRouter.post("/import", userAuth, importData);

export default dataRouter;
