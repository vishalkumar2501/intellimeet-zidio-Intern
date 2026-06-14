import express from "express";
import { getChatHistory } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/:code", getChatHistory);

export default router;
