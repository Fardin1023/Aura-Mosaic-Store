const express = require("express");
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
    const match = { role: "customer" };

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
          picture: 1,
          provider: 1,
          isProfileComplete: 1,
          createdAt: 1,
          updatedAt: 1,
          wishlistCount: 1,
          orderCount: { $ifNull: ["$summary.orderCount", 0] },
          totalSpent: { $ifNull: ["$summary.totalSpent", 0] },
          lastOrderAt: "$summary.lastOrderAt",
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 500 },
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
      .select("name email phone city provider picture isProfileComplete createdAt")
      .lean();

    if (!customer) return res.status(404).json({ message: "Customer not found." });

    const orders = await Order.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ customer, orders });
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
    if ("picture" in req.body) update.picture = cleanString(req.body.picture, 1000);
    if ("isProfileComplete" in req.body) update.isProfileComplete = Boolean(req.body.isProfileComplete);

    if (update.name !== undefined && update.name.length < 2) {
      return res.status(400).json({ message: "Name must contain at least 2 characters." });
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
      runValidators: true,
    }).select("-password -wishlist");

    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

router.get("/me/wishlist", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({ path: "wishlist", populate: { path: "category", select: "name" } })
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

    const exists = await Product.exists({ _id: productId });
    if (!exists) return res.status(404).json({ message: "Product not found." });

    await User.updateOne({ _id: req.user.id }, { $addToSet: { wishlist: productId } });
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
