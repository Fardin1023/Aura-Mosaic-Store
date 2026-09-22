const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const Transaction = require("../models/transaction");

const router = express.Router();

router.get("/my", auth, async (req, res, next) => {
  try {
    return res.json(await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).lean());
  } catch (err) {
    return next(err);
  }
});

router.get("/", auth, admin, async (_req, res, next) => {
  try {
    const transactions = await Transaction.find().populate("user", "name email").sort({ createdAt: -1 }).limit(1000).lean();
    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
