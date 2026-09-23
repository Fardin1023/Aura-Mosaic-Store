const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../models/user");
const { Product } = require("../models/products");
const Order = require("../models/order");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { cleanString, isObjectId } = require("../utils/validation");
const cities = require("../data/cities");

const VALID_CITIES = new Set(cities.map((item) => item.name.toLowerCase()));
const router = express.Router();

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/admin/customers", auth, admin, async (req, res, next) => {
  try {
    const search = cleanString(req.query?.q, 120);
    const active = String(req.query?.active || "").toLowerCase();
    const match = { role: "customer" };

    if (active === "true") match.isActive = { $ne: false };
    if (active === "false") match.isActive = false;

    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      match.$or = [
        { name: expression },
        { email: expression },
        { phone: expression },
        { city: expression },
      ];
    }

    const customers = await User.aggregate([
      { $match: match },
      {
        $lookup: {
          from: Order.collection.name,
          let: { customerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$customerId"] } } },
            {
              $group: {
                _id: null,
                orderCount: { $sum: 1 },
                totalSpent: {
                  $sum: {
                    $cond: [
                      { $eq: ["$payment.status", "PAID"] },
                      "$total",
                      0,
                    ],
                  },
                },
                lastOrderAt: { $max: "$createdAt" },
              },
            },
          ],
          as: "orderSummary",
        },
      },
      {
        $addFields: {
          summary: { $arrayElemAt: ["$orderSummary", 0] },
          wishlistCount: { $size: { $ifNull: ["$wishlist", []] } },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          city: 1,
          addressLine1: 1,
          addressLine2: 1,
          postalCode: 1,
          picture: 1,
          provider: 1,
          isProfileComplete: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          wishlistCount: 1,
          orderCount: { $ifNull: ["$summary.orderCount", 0] },
          totalSpent: { $ifNull: ["$summary.totalSpent", 0] },
          lastOrderAt: "$summary.lastOrderAt",
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 1000 },
    ]);

    return res.json(customers);
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/customers/:id/orders", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer id." });
    }

    const customer = await User.findOne({ _id: req.params.id, role: "customer" })
      .select("name email phone city addressLine1 addressLine2 postalCode provider picture isProfileComplete isActive createdAt")
      .lean();

    if (!customer) return res.status(404).json({ message: "Customer not found." });

    const orders = await Order.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return res.json({ customer, orders });
  } catch (err) {
    return next(err);
  }
});

router.patch("/admin/customers/:id/status", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid customer id." });
    const isActive = Boolean(req.body?.isActive);
    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, role: "customer" },
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select("name email phone city provider isActive createdAt");
    if (!customer) return res.status(404).json({ message: "Customer not found." });
    return res.json({ customer, message: isActive ? "Customer account enabled." : "Customer account disabled." });
  } catch (err) {
    return next(err);
  }
});

router.patch("/me", auth, async (req, res, next) => {
  try {
    const update = {};
    if ("name" in req.body) update.name = cleanString(req.body.name, 120);
    if ("phone" in req.body) {
      const phone = cleanString(req.body.phone, 30);
      if (phone && !/^\+?\d[\d\s-]{7,20}$/.test(phone)) {
        return res.status(400).json({ message: "Please enter a valid phone number." });
      }
      update.phone = phone;
    }
    if ("city" in req.body) {
      const city = cleanString(req.body.city, 120);
      if (city && !VALID_CITIES.has(city.toLowerCase())) {
        return res.status(400).json({ message: "Please select a valid delivery city." });
      }
      update.city = city;
    }
    if ("addressLine1" in req.body) update.addressLine1 = cleanString(req.body.addressLine1, 250);
    if ("addressLine2" in req.body) update.addressLine2 = cleanString(req.body.addressLine2, 250);
    if ("postalCode" in req.body) update.postalCode = cleanString(req.body.postalCode, 30);
    if ("picture" in req.body) update.picture = cleanString(req.body.picture, 1000);
    if ("isProfileComplete" in req.body) update.isProfileComplete = Boolean(req.body.isProfileComplete);

    if (update.name !== undefined && update.name.length < 2) {
      return res.status(400).json({ message: "Name must contain at least 2 characters." });
    }

    const user = await User.findOneAndUpdate({ _id: req.user.id, isActive: { $ne: false } }, update, {
      new: true,
      runValidators: true,
    }).select("-password -wishlist");

    if (!user) return res.status(404).json({ message: "User not found or account disabled." });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

router.patch("/me/password", auth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ message: "New password must be between 8 and 128 characters." });
    }

    const user = await User.findById(req.user.id).select("+password provider isActive");
    if (!user || user.isActive === false) return res.status(404).json({ message: "User not found." });
    if (!user.password || user.provider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in and does not have a local password." });
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) return res.status(401).json({ message: "Current password is incorrect." });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    return next(err);
  }
});

router.delete("/me", auth, async (req, res, next) => {
  try {
    const hasOpenOrder = await Order.exists({
      user: req.user.id,
      status: { $in: ["pending", "confirmed", "processing", "shipped"] },
    });
    if (hasOpenOrder) {
      return res.status(409).json({ message: "Your account cannot be disabled while you have an active order." });
    }
    await User.updateOne({ _id: req.user.id }, { $set: { isActive: false } });
    return res.json({ message: "Your account has been disabled." });
  } catch (err) {
    return next(err);
  }
});

router.get("/me/wishlist", auth, async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id, isActive: { $ne: false } })
      .populate({ path: "wishlist", match: { isActive: { $ne: false } }, populate: { path: "category", select: "name" } })
      .select("wishlist")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json(user.wishlist || []);
  } catch (err) {
    return next(err);
  }
});

router.post("/me/wishlist/:productId", auth, async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!isObjectId(productId)) return res.status(400).json({ message: "Invalid product id." });

    const exists = await Product.exists({ _id: productId, isActive: { $ne: false } });
    if (!exists) return res.status(404).json({ message: "Product not found." });

    await User.updateOne({ _id: req.user.id, isActive: { $ne: false } }, { $addToSet: { wishlist: productId } });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

router.delete("/me/wishlist/:productId", auth, async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!isObjectId(productId)) return res.status(400).json({ message: "Invalid product id." });
    await User.updateOne({ _id: req.user.id }, { $pull: { wishlist: productId } });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
