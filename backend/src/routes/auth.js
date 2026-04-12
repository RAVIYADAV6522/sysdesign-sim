import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { signUserToken } from "../middleware/auth.js";
import { User } from "../models/User.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:4000/api/auth/google/callback";

  if (!clientID || !clientSecret) {
    console.warn(
      "[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google login disabled.",
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          console.log("[oauth] Google profile received", {
            googleId,
            email: email ?? "(none)",
            displayName: profile.displayName ?? "(none)",
          });

          let user = await User.findOne({ googleId });
          if (!user) {
            user = await User.create({
              googleId,
              email,
              name: profile.displayName,
              picture: profile.photos?.[0]?.value,
            });
            console.log("[oauth] New user stored in MongoDB", {
              _id: String(user._id),
              googleId: user.googleId,
              email: user.email,
              name: user.name,
            });
          } else {
            if (email) user.email = email;
            if (profile.displayName) user.name = profile.displayName;
            if (profile.photos?.[0]?.value) user.picture = profile.photos[0].value;
            await user.save();
            console.log("[oauth] Existing user updated in MongoDB", {
              _id: String(user._id),
              googleId: user.googleId,
              email: user.email,
              name: user.name,
            });
          }
          done(null, user);
        } catch (err) {
          console.error("[oauth] Failed to persist Google user:", err.message);
          done(err);
        }
      },
    ),
  );
}

export const authRouter = express.Router();

function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

/** Browser navigates here to start Google OAuth (doc: initiate flow). */
authRouter.get("/google", (req, res, next) => {
  if (!googleConfigured()) {
    return res.status(503).json({
      error:
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    });
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

/** Google redirects here; we issue a JWT and send the user back to the SPA. */
authRouter.get("/google/callback", (req, res, next) => {
  if (!googleConfigured()) {
    return res.status(503).json({ error: "Google OAuth not configured" });
  }
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=auth`,
  })(req, res, next);
}, (req, res) => {
  const token = signUserToken(req.user._id);
  console.log("[oauth] Login complete, issuing JWT for user", {
    mongoId: String(req.user._id),
    googleId: req.user.googleId,
  });
  const url = new URL(`${FRONTEND_URL}/auth/callback`);
  url.searchParams.set("token", token);
  res.redirect(url.toString());
});

authRouter.get("/google/status", (_req, res) => {
  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  res.json({ googleOAuthConfigured: configured });
});
