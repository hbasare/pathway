import rateLimit from "express-rate-limit";

const json = (msg: string) => ({ error: msg });

/**
 * Login: max 10 failed attempts per 15 minutes per IP.
 * Successful requests are skipped so they don't count toward the limit.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: json("Too many login attempts. Please wait 15 minutes before trying again."),
});

/**
 * Registration / setup: max 5 attempts per hour per IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: json("Too many registration attempts. Please try again later."),
});

/**
 * Password reset: max 10 per hour per IP.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: json("Too many password reset attempts. Please try again later."),
});
