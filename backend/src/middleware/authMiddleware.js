import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import redisClient from "../config/redis.js";

const USER_CACHE_EXPIRATION = 3600;

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let cachedUser = null;
      if (redisClient.isOpen) {
        const data = await redisClient.get(`user:${decoded.userId}`);
        if (data) cachedUser = JSON.parse(data);
      }

      if (cachedUser) {
        req.user = cachedUser;
        return next();
      }

      //Cache Miss
      const user = await User.findById(decoded.userId)
        .select("-password") //don't send password
        .lean();
      if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      if (redisClient.isOpen) {
        await redisClient.setEx(
          `user:${decoded.userId}`,
          USER_CACHE_EXPIRATION,
          JSON.stringify(user),
        );
      }

      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
