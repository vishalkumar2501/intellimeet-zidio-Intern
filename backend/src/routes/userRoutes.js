import express from "express";
import passport from "../config/passport.js";
import { googleCallback } from "../controllers/userController.js";
import {
  signup,
  login,
  refreshToken,
  logout,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

//Redirect to google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

//callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/signin`,
  }),
  googleCallback,
);

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

//protected routes
router.get("/profile", protect, getUserProfile);
router.patch("/profile", protect, updateUserProfile);
router.post("/avatar-upload", protect, upload.single("avatar"), uploadAvatar);

export default router;
