const express = require("express");
const { Category } = require("../models/category");
const { Product } = require("../models/products");
const { User } = require("../models/user");
const Order = require("../models/order");
const InventoryMovement = require("../models/inventoryMovement");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { cleanString, escapeRegex, isObjectId, toNumber } = require("../utils/validation");
const { createProductImageUploadSignature, destroyProductImageByUrl } = require("../utils/cloudinary");

const router = express.Router();

function recalculateVisibleRating(product) {
  const visible = (product.reviews || []).filter((review) => review.isVisible !== false);
  product.numReviews = visible.length;
  product.rating = visible.length
    ? visible.reduce((sum, item) => sum + Number(item.rating || 0), 0) / visible.length
    : 0;
}

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

router.post("/admin/image-upload-signature", auth, admin, (req, res, next) => {
  try {
    return res.json(createProductImageUploadSignature());
  } catch (err) {
    return next(err);
  }
});

router.delete("/admin/image-upload", auth, admin, async (req, res, next) => {
  try {
    const url = cleanString(req.body?.url, 1500);
    if (!url) return res.status(400).json({ message: "Image URL is required." });

    const result = await destroyProductImageByUrl(url);
    if (result?.skipped) {
      return res.status(400).json({ message: "That image is not a managed Aura Mosaic Cloudinary upload." });
    }

    return res.json({ message: "Uploaded image deleted." });
  } catch (err) {
    return next(err);
  }
});


router.get("/admin/list", auth, admin, async (req, res, next) => {
  try {
    const active = String(req.query?.active ?? "").toLowerCase();
    const stock = String(req.query?.stock || "").toLowerCase();
    const q = cleanString(req.query?.q, 120);
    const filter = {};
    if (active === "true") filter.isActive = { $ne: false };
    if (active === "false") filter.isActive = false;
    if (stock === "out") filter.countInStock = 0;
    if (stock === "low") filter.countInStock = { $gt: 0, $lte: 5 };
    if (stock === "healthy") filter.countInStock = { $gt: 5 };
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { brand: rx }, { vendor: rx }, { sku: rx }];
    }
    const products = await Product.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();
    return res.json(products);
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/reviews", auth, admin, async (req, res, next) => {
  try {
    const q = cleanString(req.query?.q, 120);
    const rating = Number(req.query?.rating || 0);
    const visible = String(req.query?.visible ?? "").toLowerCase();
    const products = await Product.find({ "reviews.0": { $exists: true } })
      .select("name images reviews")
      .sort({ updatedAt: -1 })
      .lean();
    const rows = [];
    for (const product of products) {
      for (const review of product.reviews || []) {
        if (rating && Number(review.rating) !== rating) continue;
        if (visible === "true" && review.isVisible === false) continue;
        if (visible === "false" && review.isVisible !== false) continue;
        if (q) {
          const haystack = `${product.name} ${review.name || ""} ${review.comment || ""}`.toLowerCase();
          if (!haystack.includes(q.toLowerCase())) continue;
        }
        rows.push({
          ...review,
          productId: product._id,
          productName: product.name,
          productImage: product.images?.[0] || "",
          isVisible: review.isVisible !== false,
        });
      }
    }
    rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return res.json(rows.slice(0, 2000));
  } catch (err) {
    return next(err);
  }
});

router.patch("/admin/reviews/:productId/:reviewId", auth, admin, async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;
    if (!isObjectId(productId) || !isObjectId(reviewId)) return res.status(400).json({ message: "Invalid review id." });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });
    const review = product.reviews.id(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });
    review.isVisible = Boolean(req.body?.isVisible);
    recalculateVisibleRating(product);
    await product.save();
    return res.json({ message: review.isVisible ? "Review is visible." : "Review hidden.", review });
  } catch (err) {
    return next(err);
  }
});

router.delete("/admin/reviews/:productId/:reviewId", auth, admin, async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;
    if (!isObjectId(productId) || !isObjectId(reviewId)) return res.status(400).json({ message: "Invalid review id." });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });
    const review = product.reviews.id(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });
    review.deleteOne();
    recalculateVisibleRating(product);
    await product.save();
    return res.json({ message: "Review deleted." });
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/inventory", auth, admin, async (req, res, next) => {
  try {
    const productId = String(req.query?.productId || "");
    const filter = productId && isObjectId(productId) ? { product: productId } : {};
    const rows = await InventoryMovement.find(filter)
      .populate("product", "name sku images countInStock")
      .populate("admin", "name email")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.post("/admin/inventory/:id/adjust", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const delta = Number(req.body?.delta);
    const reason = cleanString(req.body?.reason, 500);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) {
      return res.status(400).json({ message: "Stock adjustment must be a non-zero whole number." });
    }
    if (reason.length < 2) return res.status(400).json({ message: "Please enter a reason for the stock adjustment." });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    const before = Number(product.countInStock || 0);
    const after = before + delta;
    if (after < 0) return res.status(409).json({ message: "Stock cannot be reduced below zero." });
    product.countInStock = after;
    await product.save();
    const movement = await InventoryMovement.create({
      product: product._id,
      admin: req.user.id,
      type: delta > 0 ? "restock" : "correction",
      delta,
      before,
      after,
      reason,
    });
    return res.json({ product, movement });
  } catch (err) {
    return next(err);
  }
});

router.patch("/admin/:id/restore", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: true } },
      { new: true, runValidators: true }
    ).populate("category", "name");
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json(product);
  } catch (err) {
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "100", 10), 1), 500);
    const products = await Product.find({ isActive: { $ne: false } }).populate("category", "name").sort({ createdAt: -1 }).limit(limit).lean();
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

    const baseFilter = { isActive: { $ne: false } };

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
        { sku: rx },
        { brand: rx },
        { vendor: rx },
        { description: rx },
        { additionalInfo: rx },
        { tags: rx },
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
    const products = await Product.find({ isFeatured: true, isActive: { $ne: false } })
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
      isActive: { $ne: false },
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
    const product = await Product.findOne({ _id: req.params.id, isActive: { $ne: false } }).select("reviews rating numReviews").lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    const reviews = (product.reviews || []).filter((review) => review.isVisible !== false);
    return res.json({ reviews, rating: product.rating || 0, numReviews: reviews.length });
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
      Product.findOne({ _id: req.params.id, isActive: { $ne: false } }),
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
      isVisible: true,
    });
    recalculateVisibleRating(product);
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
    recalculateVisibleRating(product);
    await product.save();
    return res.json({ message: "Review deleted.", rating: product.rating, numReviews: product.numReviews });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const product = await Product.findOne({ _id: req.params.id, isActive: { $ne: false } }).populate("category", "name").lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json(product);
  } catch (err) {
    return next(err);
  }
});

function buildProductPayload(body) {
  const payload = {};
  if ("name" in body) payload.name = cleanString(body.name, 180);
  if ("sku" in body) payload.sku = cleanString(body.sku, 80).toUpperCase();
  if ("description" in body) payload.description = cleanString(body.description, 10000);
  if ("brand" in body) payload.brand = cleanString(body.brand, 120);
  if ("vendor" in body) payload.vendor = cleanString(body.vendor, 120);
  if ("additionalInfo" in body) payload.additionalInfo = cleanString(body.additionalInfo, 5000);
  if (Array.isArray(body.tags)) payload.tags = body.tags.map((v) => cleanString(v, 60)).filter(Boolean).slice(0, 30);
  if ("price" in body) payload.price = Number(body.price);
  if ("oldPrice" in body) payload.oldPrice = body.oldPrice === "" || body.oldPrice == null ? undefined : Number(body.oldPrice);
  if ("countInStock" in body) payload.countInStock = Number(body.countInStock);
  if ("category" in body) payload.category = body.category;
  if ("subcategoryId" in body) payload.subcategory = body.subcategoryId || undefined;
  if ("isFeatured" in body) payload.isFeatured = Boolean(body.isFeatured);
  if ("isActive" in body) payload.isActive = Boolean(body.isActive);
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
  if (payload.subcategory !== undefined) {
    if (!isObjectId(payload.subcategory)) return "Invalid subcategory.";
    const categoryId = payload.category;
    if (categoryId) {
      const ownsSubcategory = await Category.exists({ _id: categoryId, "subcategories._id": payload.subcategory });
      if (!ownsSubcategory) return "The selected subcategory does not belong to the selected category.";
    }
  }
  if (!partial || payload.images !== undefined) {
    if (!Array.isArray(payload.images) || payload.images.length === 0) return "At least one product image is required.";
    if (payload.images.length > 6) return "A product can have at most 6 images.";
    const invalidImage = payload.images.some((value) => {
      try {
        const url = new URL(value);
        return !["http:", "https:"].includes(url.protocol);
      } catch (_error) {
        return true;
      }
    });
    if (invalidImage) return "Every product image must be a valid HTTP or HTTPS URL.";
  }
  return "";
}

router.post("/", auth, admin, async (req, res, next) => {
  try {
    const payload = buildProductPayload(req.body || {});
    const validationError = await validateProductPayload(payload);
    if (validationError) return res.status(400).json({ message: validationError });

    if (payload.sku && await Product.exists({ sku: payload.sku })) {
      return res.status(409).json({ message: "That SKU is already in use." });
    }
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

    if (payload.sku && await Product.exists({ sku: payload.sku, _id: { $ne: req.params.id } })) {
      return res.status(409).json({ message: "That SKU is already in use." });
    }

    const before = await Product.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: "Product not found." });

    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if ("subcategoryId" in req.body || "category" in req.body) {
      await linkSubcategory(product._id, product.category, product.subcategory);
    }

    if (Array.isArray(payload.images)) {
      const retained = new Set(payload.images.map(String));
      const removedImages = (before.images || []).filter((url) => !retained.has(String(url)));
      await Promise.allSettled(removedImages.map((url) => destroyProductImageByUrl(url)));
    }

    return res.json(await Product.findById(product._id).populate("category", "name").lean());
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    const usedInOrder = await Order.exists({ "items.productId": product._id });
    await Category.updateMany(
      { "subcategories.products": product._id },
      { $pull: { "subcategories.$[].products": product._id } }
    );
    await User.updateMany({ wishlist: product._id }, { $pull: { wishlist: product._id } });

    if (usedInOrder) {
      product.isActive = false;
      product.isFeatured = false;
      await product.save();
      return res.json({ message: "Product archived because it exists in order history.", archived: true });
    }

    await Product.deleteOne({ _id: product._id });
    await Promise.allSettled((product.images || []).map((url) => destroyProductImageByUrl(url)));
    return res.json({ message: "Product deleted.", archived: false });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
