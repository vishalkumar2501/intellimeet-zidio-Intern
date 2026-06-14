import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import connectDB from "./src/config/db.js";
import { connectRedis } from "./src/config/redis.js";
import { initializeSocket } from "./src/sockets/socket.js";
import userRoutes from "./src/routes/userRoutes.js";
import meetingRoutes from "./src/routes/meetingRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import passport from "passport";
import session from "express-session";
import "./src/config/passport.js";

dotenv.config();

//Connect DB & Redis
await connectDB();
await connectRedis();

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

await initializeSocket(httpServer);

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", userRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/chats", chatRoutes);

app.get("/", (req, res) => {
  res.json({ message: "IntellMeet API is running..." });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Your API is running",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
