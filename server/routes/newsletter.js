const express = require("express");
const NewsletterSubscriber = require("../models/newsletterSubscriber");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { normalizeEmail, isEmail, isObjectId } = require("../utils/validation");

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

router.post("/unsubscribe", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isEmail(email)) return res.status(400).json({ message: "Please enter a valid email address." });
    await NewsletterSubscriber.updateOne({ email }, { $set: { active: false } });
    return res.json({ message: "You have been unsubscribed from Aura-Mosaic updates." });
  } catch (err) {
    return next(err);
  }
});

router.get("/subscribers", auth, admin, async (req, res, next) => {
  try {
    const active = String(req.query?.active ?? "").toLowerCase();
    const filter = {};
    if (active === "true") filter.active = true;
    if (active === "false") filter.active = false;
    const rows = await NewsletterSubscriber.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.patch("/subscribers/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid subscriber id." });
    const subscriber = await NewsletterSubscriber.findByIdAndUpdate(
      req.params.id,
      { $set: { active: Boolean(req.body?.active) } },
      { new: true, runValidators: true }
    );
    if (!subscriber) return res.status(404).json({ message: "Subscriber not found." });
    return res.json(subscriber);
  } catch (err) {
    return next(err);
  }
});

router.delete("/subscribers/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid subscriber id." });
    const subscriber = await NewsletterSubscriber.findByIdAndDelete(req.params.id);
    if (!subscriber) return res.status(404).json({ message: "Subscriber not found." });
    return res.json({ message: "Subscriber deleted." });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
