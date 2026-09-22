const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const { User } = require("../models/user");
const Transaction = require("../models/transaction");
const auth = require("../middleware/authMiddleware");
const { cleanString, normalizeEmail, isEmail } = require("../utils/validation");

const router = express.Router();

function sign(user) {
  return jwt.sign(
    { id: String(user._id), role: user.role || "customer" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function serializeUser(user, extra = {}) {
  const obj = user?.toObject ? user.toObject() : user;
  if (!obj) return null;
  const { password, wishlist, ...safe } = obj;
  return { ...safe, id: String(obj._id), ...extra };
}

router.post("/register", async (req, res, next) => {
  try {
    const name = cleanString(req.body?.name, 120);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (name.length < 2) return res.status(400).json({ message: "Please enter your name." });
    if (!isEmail(email)) return res.status(400).json({ message: "Please enter a valid email address." });
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ message: "Email already registered." });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      provider: "local",
      isProfileComplete: true,
    });

    const token = sign(user);
    return res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isEmail(email) || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    if (password.length > 128) return res.status(401).json({ message: "Invalid email or password." });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return res.status(401).json({ message: "Invalid email or password." });

    return res.json({ token: sign(user), user: serializeUser(user) });
  } catch (err) {
    return next(err);
  }
});

router.post("/google", async (req, res, next) => {
  try {
    const credential = String(req.body?.credential || "");
    if (!credential) return res.status(400).json({ message: "Missing Google credential." });

    const audiences = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_ID_ALT].filter(Boolean);
    if (!audiences.length) {
      return res.status(503).json({ message: "Google sign-in is not configured on the server." });
    }

    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: credential, audience: audiences });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified === false) {
      return res.status(401).json({ message: "Google account email could not be verified." });
    }

    const email = normalizeEmail(payload.email);
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        email,
        name: cleanString(payload.name || email.split("@")[0], 120),
        picture: cleanString(payload.picture, 1000),
        googleId: payload.sub,
        provider: "google",
        isProfileComplete: false,
      });
      isNewUser = true;
    } else {
      let changed = false;
      if (!user.googleId && payload.sub) {
        user.googleId = payload.sub;
        changed = true;
      }
      if (!user.picture && payload.picture) {
        user.picture = cleanString(payload.picture, 1000);
        changed = true;
      }
      if (changed) await user.save();
    }

    return res.json({ token: sign(user), isNewUser, user: serializeUser(user) });
  } catch (err) {
    if (/Token used too late|Wrong recipient|Invalid token signature|Invalid Value/i.test(String(err?.message || ""))) {
      return res.status(401).json({ message: "Google authentication failed. Please try again." });
    }
    return next(err);
  }
});

router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-wishlist").lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    const rows = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id), status: "PAID" } },
      {
        $group: {
          _id: null,
          debit: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] } },
          credit: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
        },
      },
    ]);

    const spent = Math.max(0, (rows?.[0]?.debit || 0) - (rows?.[0]?.credit || 0));
    return res.json({ user: serializeUser(user, { spent }) });
  } catch (err) {
    return next(err);
  }
});

// JWTs are stateless: logout is completed by deleting the token on the client.
router.post("/logout", (_req, res) => res.json({ message: "Logged out successfully." }));

module.exports = router;
