import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import { loginService, registerService, resetService, verifyService } from "../services/auth.service.js";

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.json({
      success: false,
      message: "Missing details",
    });
  }
  try {
    const existingUser = await registerService.getExistingUser(email);
    if (existingUser) {
      return res.json({
        success: false,
        message: "User already exists",
      });
    }
    const token = await registerService.registerFunc(name, email, password);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({
      success: false,
      message: "Missing details",
    });
  }
  try {
    const user = await loginService.getUser(email);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
};

export const sendVerifyOtp = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const user = await verifyService.getUser(userId);
    if (user.isAccountVerified) {
      res.json({ success: true, message: "Account already verified" });
    }
    await verifyService.sendOTP(user);
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    res.json({ success: false, message: error instanceof Error ? error.message : "An error occurred" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const user = req.user;
    if (!user || !otp) {
      return res.json({ success: false, message: "User not found" });
    }
    if (user.verifyOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }
    if (user.verifyOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }
    await verifyService.verify(user);
    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    res.json({ success: false, message: error instanceof Error ? error.message : "An error occurred" });
  }
};

export const isAuthenticated = async (req: Request, res: Response) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error instanceof Error ? error.message : "An error occurred" });
  }
};

export const sendResetOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }
  try {
    const user = await resetService.getUser(email);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    await resetService.resetOTP(user);
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    res.json({ success: false, message: error instanceof Error ? error.message : "An error occurred" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.json({ success: false, message: "All fields are required" });
  }
  try {
    const user = await resetService.getUser(email);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    if (user.resetOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }
    if (user.resetOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }
    await resetService.reset(user, newPassword);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.json({ success: false, message: error instanceof Error ? error.message : "An error occurred" });
  }
};
