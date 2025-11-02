import { Document } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any; // You can replace 'any' with your User model type
    }
  }
}
