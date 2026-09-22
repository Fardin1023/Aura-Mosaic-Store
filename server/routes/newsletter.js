const express = require("express");
const NewsletterSubscriber = require("../models/newsletterSubscriber");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { normalizeEmail, isEmail } = require("../utils/validation");

const router = express.Router();

router.post("/subscribe", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isEmail(email)) return res.status(400).json({ message: "Please enter a valid email address." });
    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      { $set: { active: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ message: "You are subscribed to Aura-Mosaic updates." });
  } catch (err) {
    return next(err);
  }
});

router.get("/subscribers", auth, admin, async (_req, res, next) => {
  try {
    return res.json(await NewsletterSubscriber.find({ active: true }).sort({ createdAt: -1 }).limit(5000).lean());
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
