const express = require("express");
const { Category } = require("../models/category");
const { Product } = require("../models/products");
const { User } = require("../models/user");
const Order = require("../models/order");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { cleanString, escapeRegex, isObjectId, toNumber } = require("../utils/validation");

const router = express.Router();

async function findCategoryByName(name) {
  const wanted = decodeURIComponent(String(name || "")).replace(/-/g, " ").trim();
  if (!wanted) return null;
  return Category.findOne({
    name: { $regex: `^\\s*${escapeRegex(wanted)}\\s*$`, $options: "i" },
  }).lean();
}

async function linkSubcategory(productId, categoryId, subcategoryId) {
  await Category.updateMany(
    { "subcategories.products": productId },
    { $pull: { "subcategories.$[].products": productId } }
  );
  if (!subcategoryId) return;
  const category = await Category.findById(categoryId);
  const sub = category?.subcategories?.id(subcategoryId);
  if (!sub) return;
  if (!sub.products.some((id) => String(id) === String(productId))) {
    sub.products.push(productId);
    await category.save();
  }
}

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "100", 10), 1), 500);
    const products = await Product.find().populate("category", "name").sort({ createdAt: -1 }).limit(limit).lean();
    return res.json(products);
  } catch (err) {
    return next(err);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = cleanString(req.query.q, 120);
    const categoryName = cleanString(req.query.categoryName, 120);
    const brands = cleanString(req.query.brands, 1000);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

    const baseFilter = {};

    if (categoryName) {
      const category = await findCategoryByName(categoryName);
      if (!category) {
        return res.json({ items: [], total: 0, page, pages: 0, facets: { brands: [], minPrice: 0, maxPrice: 0 } });
      }
      baseFilter.category = category._id;
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      const categoryMatches = await Category.find({ name: rx }).select("_id").lean();
      baseFilter.$or = [
        { name: rx },
        { brand: rx },
        { description: rx },
        { category: { $in: categoryMatches.map((c) => c._id) } },
      ];
    }

    const [brandFacet, priceFacet] = await Promise.all([
      Product.distinct("brand", baseFilter),
      Product.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } },
      ]),
    ]);

    const filter = { ...baseFilter };

    if (brands) {
      const arr = brands.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 30);
      if (arr.length) {
        filter.brand = { $in: arr.map((brand) => new RegExp(`^\\s*${escapeRegex(brand)}\\s*$`, "i")) };
      }
    }

    const minPrice = req.query.minPrice !== undefined ? toNumber(req.query.minPrice, NaN) : NaN;
    const maxPrice = req.query.maxPrice !== undefined ? toNumber(req.query.maxPrice, NaN) : NaN;
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      filter.price = {};
      if (Number.isFinite(minPrice)) filter.price.$gte = Math.max(0, minPrice);
      if (Number.isFinite(maxPrice)) filter.price.$lte = Math.max(0, maxPrice);
    }

    const minRating = toNumber(req.query.minRating, 0);
    if (minRating > 0) filter.rating = { $gte: Math.min(5, Math.max(0, minRating)) };
    if (String(req.query.inStock || "").toLowerCase() === "true") filter.countInStock = { $gt: 0 };

    let sort = { price: 1, _id: 1 };
    switch (String(req.query.sort || "").toLowerCase()) {
      case "price_desc": sort = { price: -1, _id: 1 }; break;
      case "rating_desc": sort = { rating: -1, numReviews: -1, _id: 1 }; break;
      case "newest": sort = { createdAt: -1, _id: -1 }; break;
      case "price_asc":
      default: sort = { price: 1, _id: 1 };
    }

    const [total, items] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate("category", "name")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const stats = priceFacet[0] || { minPrice: 0, maxPrice: 0 };
    return res.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      facets: {
        brands: brandFacet.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
        minPrice: Number(stats.minPrice || 0),
        maxPrice: Number(stats.maxPrice || 0),
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/featured/:count", async (req, res, next) => {
  try {
    const count = Math.min(Math.max(parseInt(req.params.count || "6", 10), 1), 50);
    const products = await Product.find({ isFeatured: true })
      .populate("category", "name")
      .sort({ rating: -1, createdAt: -1 })
      .limit(count)
      .lean();
    return res.json(products);
  } catch (err) {
    return next(err);
  }
});

router.get("/related/:categoryId/:excludeId", async (req, res, next) => {
  try {
    const { categoryId, excludeId } = req.params;
    if (!isObjectId(categoryId) || !isObjectId(excludeId)) {
      return res.status(400).json({ message: "Invalid product or category id." });
    }
    const products = await Product.find({
      category: categoryId,
      _id: { $ne: excludeId },
      countInStock: { $gt: 0 },
    })
      .populate("category", "name")
      .sort({ rating: -1, numReviews: -1 })
      .limit(12)
      .lean();
    return res.json(products);
  } catch (err) {
    return next(err);
  }
});

router.get("/:id/reviews", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const product = await Product.findById(req.params.id).select("reviews rating numReviews").lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json({ reviews: product.reviews || [], rating: product.rating || 0, numReviews: product.numReviews || 0 });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/reviews", auth, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const rating = Number(req.body?.rating);
    const comment = cleanString(req.body?.comment, 2000);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
    if (comment.length < 2) return res.status(400).json({ message: "Please write a short review." });

    const [product, user] = await Promise.all([
      Product.findById(req.params.id),
      User.findById(req.user.id).select("name email").lean(),
    ]);
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (!user) return res.status(401).json({ message: "User account not found." });

    const already = product.reviews.some((review) => String(review.user) === String(req.user.id));
    if (already) return res.status(409).json({ message: "You have already reviewed this product." });

    const purchased = await Order.exists({
      user: req.user.id,
      "items.productId": product._id,
      status: { $in: ["delivered", "paid"] },
    });

    product.reviews.push({
      user: req.user.id,
      name: user.name || user.email || "User",
      rating,
      comment,
      verifiedPurchase: Boolean(purchased),
    });
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / product.reviews.length;
    await product.save();

    return res.status(201).json({
      message: "Review added.",
      review: product.reviews.at(-1),
      rating: product.rating,
      numReviews: product.numReviews,
    });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:productId/reviews/:reviewId", auth, async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;
    if (!isObjectId(productId) || !isObjectId(reviewId)) return res.status(400).json({ message: "Invalid id." });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });
    const review = product.reviews.id(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });
    if (String(review.user) !== String(req.user.id)) return res.status(403).json({ message: "You can only delete your own review." });

    review.deleteOne();
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.length
      ? product.reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / product.reviews.length
      : 0;
    await product.save();
    return res.json({ message: "Review deleted.", rating: product.rating, numReviews: product.numReviews });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const product = await Product.findById(req.params.id).populate("category", "name").lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json(product);
  } catch (err) {
    return next(err);
  }
});

function buildProductPayload(body) {
  const payload = {};
  if ("name" in body) payload.name = cleanString(body.name, 180);
  if ("description" in body) payload.description = cleanString(body.description, 10000);
  if ("brand" in body) payload.brand = cleanString(body.brand, 120);
  if ("vendor" in body) payload.vendor = cleanString(body.vendor, 120);
  if ("additionalInfo" in body) payload.additionalInfo = cleanString(body.additionalInfo, 5000);
  if ("price" in body) payload.price = Number(body.price);
  if ("oldPrice" in body) payload.oldPrice = body.oldPrice === "" || body.oldPrice == null ? undefined : Number(body.oldPrice);
  if ("countInStock" in body) payload.countInStock = Number(body.countInStock);
  if ("category" in body) payload.category = body.category;
  if ("subcategoryId" in body) payload.subcategory = body.subcategoryId || undefined;
  if ("isFeatured" in body) payload.isFeatured = Boolean(body.isFeatured);
  if (Array.isArray(body.images)) payload.images = body.images.map((url) => cleanString(url, 1000)).filter(Boolean);
  return payload;
}

async function validateProductPayload(payload, { partial = false } = {}) {
  if (!partial || payload.name !== undefined) {
    if (!payload.name || payload.name.length < 2) return "Product name is required.";
  }
  if (!partial || payload.description !== undefined) {
    if (!payload.description || payload.description.length < 2) return "Product description is required.";
  }
  if (!partial || payload.price !== undefined) {
    if (!Number.isFinite(payload.price) || payload.price < 0) return "Price must be zero or greater.";
  }
  if (payload.oldPrice !== undefined && (!Number.isFinite(payload.oldPrice) || payload.oldPrice < 0)) {
    return "Old price must be zero or greater.";
  }
  if (!partial || payload.countInStock !== undefined) {
    if (!Number.isInteger(payload.countInStock) || payload.countInStock < 0) return "Stock must be a non-negative integer.";
  }
  if (!partial || payload.category !== undefined) {
    if (!isObjectId(payload.category) || !(await Category.exists({ _id: payload.category }))) return "Invalid category.";
  }
  if (!partial || payload.images !== undefined) {
    if (!Array.isArray(payload.images) || payload.images.length === 0) return "At least one product image is required.";
  }
  return "";
}

router.post("/", auth, admin, async (req, res, next) => {
  try {
    const payload = buildProductPayload(req.body || {});
    const validationError = await validateProductPayload(payload);
    if (validationError) return res.status(400).json({ message: validationError });

    const product = await Product.create(payload);
    await linkSubcategory(product._id, product.category, payload.subcategory);
    return res.status(201).json(await Product.findById(product._id).populate("category", "name").lean());
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const payload = buildProductPayload(req.body || {});
    const validationError = await validateProductPayload(payload, { partial: true });
    if (validationError) return res.status(400).json({ message: validationError });

    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    if ("subcategoryId" in req.body || "category" in req.body) {
      await linkSubcategory(product._id, product.category, product.subcategory);
    }
    return res.json(await Product.findById(product._id).populate("category", "name").lean());
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    await Category.updateMany(
      { "subcategories.products": product._id },
      { $pull: { "subcategories.$[].products": product._id } }
    );
    await User.updateMany({ wishlist: product._id }, { $pull: { wishlist: product._id } });
    return res.json({ message: "Product deleted." });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
