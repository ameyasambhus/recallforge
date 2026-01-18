import express from "express";
import {
  login,
  register,
  logout,
  isAuthenticated,
  sendVerifyOtp,
  verifyEmail,
  sendResetOtp,
  resetPassword,
  verifyRecaptcha,
} from "../controllers/auth.controller.js";
import userAuth from "../middleware/userAuth.js";
const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/send-verify-otp", sendVerifyOtp);
authRouter.post("/verify-account", verifyEmail);
authRouter.get("/is-auth", userAuth, isAuthenticated);
authRouter.post("/send-reset-otp", sendResetOtp);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/verify-recaptcha", verifyRecaptcha);
export default authRouter;
