import express from "express";
import { getUserData, deleteUser, getSettings, updateSettings } from "../controllers/user.controller.js";
import userAuth from "../middleware/userAuth.js";

const userRouter = express.Router();

userRouter.get("/data", userAuth, getUserData);
userRouter.delete("/delete", userAuth, deleteUser);
userRouter.get("/settings", userAuth, getSettings);
userRouter.put("/settings", userAuth, updateSettings);

export default userRouter;
