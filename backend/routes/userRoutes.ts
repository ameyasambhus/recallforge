import express from "express";
import { getUserData, deleteUser } from "../controllers/user.controller.js";
import userAuth from "../middleware/userAuth.js";

const userRouter = express.Router();

userRouter.get("/data", userAuth, getUserData);
userRouter.delete("/delete", userAuth, deleteUser);

export default userRouter;
