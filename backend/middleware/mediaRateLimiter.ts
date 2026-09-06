import { NextFunction, Request, Response } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const uploadRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1h'),
});

const mediaRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identifier = req.userId ? `media:${req.userId}` : `media:${req.ip || 'unknown'}`;
    const { success } = await uploadRateLimit.limit(identifier);
    if (!success) {
      return res.status(429).json({ success: false, error: 'Upload rate limit exceeded' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default mediaRateLimiter;
