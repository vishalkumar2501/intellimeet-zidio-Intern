import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error("Redis reconnection failed");
      return Math.min(retries * 100, 3000);
    },
    keepAlive: 5000,
  },
});

redisClient.on("error", (err) => {
  if (err.message.includes("Socket closed unexpectedly")) {
    console.log("Redis socket closed unexpectedly, waiting for auto-reconnect...");
  } else {
    console.error("Redis Client Error:", err);
  }
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log(`Redis Connected Successfully`);
    }
  } catch (error) {
    console.error(`Redis connection failed: ${error.message}`);
  }
};

export { redisClient, connectRedis };
export default redisClient;
