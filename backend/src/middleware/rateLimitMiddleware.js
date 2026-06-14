import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message:
      "Too many login/signup attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
