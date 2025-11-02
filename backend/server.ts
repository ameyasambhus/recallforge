import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/mongodb.js";
import authRouter from "./routes/authRoutes.js";
import cardRouter from "./routes/cardRoutes.js";
import userRouter from "./routes/userRoutes.js";
import rateLimiter from "./middleware/rateLimiter.js";
import userAuth from "./middleware/userAuth.js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file if it exists (local development)
// In Docker, env vars are passed via --env-file flag
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 4000;
connectDB();

const allowedOrigins = ["http://localhost:5173"];

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use("/api/card", rateLimiter, cardRouter);
app.use("/api/user", rateLimiter, userRouter);

app.use("/api/auth", authRouter);

app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get(/.*/, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

app.listen(port, () => {
  console.log("Server started");
});
