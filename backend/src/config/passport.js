import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/userModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile;
        const email = emails[0].value;

        let user = await User.findOne({
          $or: [{ googleId: id }, { email }],
        });

        if (!user) {
          user = await User.create({
            googleId: id,
            name: displayName,
            email,
            avatar: photos[0].value,
          });
        } else if (!user.googleId) {
          user.googleId = id;
          if (!user.avatar) user.avatar = photos[0].value;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

export default passport;
