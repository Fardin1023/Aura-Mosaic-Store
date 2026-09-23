const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const Transaction = require("../models/transaction");
const { cleanString } = require("../utils/validation");

const router = express.Router();

router.get("/my", auth, async (req, res, next) => {
  try {
    return res.json(await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).lean());
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/summary", auth, admin, async (_req, res, next) => {
  try {
    const rows = await Transaction.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]);
    const totals = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          paidDebit: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "PAID"] }, { $eq: ["$type", "debit"] }] },
                "$amount",
                0,
              ],
            },
          },
          paidCredit: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "PAID"] }, { $eq: ["$type", "credit"] }] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);
    const base = totals[0] || { paidDebit: 0, paidCredit: 0 };
    return res.json({
      byStatus: rows.map((row) => ({ status: row._id || "UNKNOWN", count: row.count || 0, amount: row.amount || 0 })),
      paidRevenue: Math.max(0, Number(base.paidDebit || 0) - Number(base.paidCredit || 0)),
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/", auth, admin, async (req, res, next) => {
  try {
    const status = cleanString(req.query?.status, 20).toUpperCase();
    const method = cleanString(req.query?.method, 20).toUpperCase();
    const provider = cleanString(req.query?.provider, 20).toUpperCase();
    const type = cleanString(req.query?.type, 20).toLowerCase();
    const filter = {};
    if (["PENDING", "PAID", "FAILED", "REFUNDED"].includes(status)) filter.status = status;
    if (["COD", "ONLINE"].includes(method)) filter.method = method;
    if (["COD", "BKASH", "NAGAD", "CARD", "OTHER"].includes(provider)) filter.provider = provider;
    if (["debit", "credit"].includes(type)) filter.type = type;

    const transactions = await Transaction.find(filter)
      .populate("user", "name email")
      .populate("order", "status total city createdAt")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();
    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
