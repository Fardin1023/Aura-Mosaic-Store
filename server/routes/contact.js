const express = require("express");
const ContactMessage = require("../models/contactMessage");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { cleanString, normalizeEmail, isEmail, isObjectId } = require("../utils/validation");

const router = express.Router();
const VALID_STATUS = new Set(["new", "read", "resolved"]);

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

router.get("/", auth, admin, async (req, res, next) => {
  try {
    const status = cleanString(req.query?.status, 20).toLowerCase();
    const q = cleanString(req.query?.q, 120);
    const filter = {};
    if (VALID_STATUS.has(status)) filter.status = status;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { email: rx }, { subject: rx }, { message: rx }];
    }
    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
    return res.json(messages);
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid message id." });
    const update = {};
    if ("status" in req.body) {
      const status = cleanString(req.body.status, 20).toLowerCase();
      if (!VALID_STATUS.has(status)) return res.status(400).json({ message: "Invalid message status." });
      update.status = status;
    }
    if ("adminNote" in req.body) update.adminNote = cleanString(req.body.adminNote, 2000);
    const message = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!message) return res.status(404).json({ message: "Contact message not found." });
    return res.json(message);
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid message id." });
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Contact message not found." });
    return res.json({ message: "Contact message deleted." });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
