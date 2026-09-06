import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Create a single Redis client instance using Upstash
export const redis = Redis.fromEnv();

//rate limiter - max 100 requests per 20 seconds allowed
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "20s"),
});

export default ratelimit;
