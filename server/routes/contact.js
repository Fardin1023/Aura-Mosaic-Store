const express = require("express");
const ContactMessage = require("../models/contactMessage");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { cleanString, normalizeEmail, isEmail } = require("../utils/validation");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const name = cleanString(req.body?.name, 120);
    const email = normalizeEmail(req.body?.email);
    const subject = cleanString(req.body?.subject, 200);
    const message = cleanString(req.body?.message, 5000);
    if (name.length < 2 || !isEmail(email) || message.length < 5) {
      return res.status(400).json({ message: "Please provide your name, a valid email, and a message." });
    }
    await ContactMessage.create({ name, email, subject, message });
    return res.status(201).json({ message: "Thanks! Your message has been received." });
  } catch (err) {
    return next(err);
  }
});

router.get("/", auth, admin, async (_req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(500).lean();
    return res.json(messages);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
