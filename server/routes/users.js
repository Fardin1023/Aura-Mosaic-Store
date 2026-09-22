const express = require("express");
const { User } = require("../models/user");
const { Product } = require("../models/products");
const auth = require("../middleware/authMiddleware");
const { cleanString, isObjectId } = require("../utils/validation");
const cities = require("../data/cities");

const VALID_CITIES = new Set(cities.map((item) => item.name.toLowerCase()));

const router = express.Router();

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
