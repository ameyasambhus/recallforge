import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import userModel from "../models/userModel.js";

const userAuth = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.cookies;
  if (!token) {
    return res.json({ success: false, message: "Not authorized. Login again" });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    if (tokenDecode.id) {
      req.userId = tokenDecode.id;
      // Use lean() for faster read-only queries - returns plain JS objects instead of Mongoose documents
      // Only select fields that are commonly needed to reduce data transfer
      const user = await userModel.findById(tokenDecode.id)
        .select('_id name email isAccountVerified')
        .lean();
      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }
      req.user = user;
    } else {
      return res.json({
        success: false,
        message: "Not authorized. Login again",
      });
    }
    next();
  } catch (err) {
    res.json({ success: false, message: err instanceof Error ? err.message : "An error occurred" });
  }
};

export default userAuth;
