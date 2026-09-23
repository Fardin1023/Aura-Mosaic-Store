const express = require("express");
const { Category } = require("../models/category");
const { Product } = require("../models/products");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { cleanString, escapeRegex, isObjectId } = require("../utils/validation");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    return res.json(categories);
  } catch (err) {
    return next(err);
  }
});

router.get("/name/:name", async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name || "").replace(/-/g, " ").trim();
    const category = await Category.findOne({
      name: { $regex: `^\\s*${escapeRegex(name)}\\s*$`, $options: "i" },
    }).lean();
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json(category);
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid category id." });
    const category = await Category.findById(req.params.id).lean();
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json(category);
  } catch (err) {
    return next(err);
  }
});

router.post("/", auth, admin, async (req, res, next) => {
  try {
    const name = cleanString(req.body?.name, 120);
    if (name.length < 2) return res.status(400).json({ message: "Category name is required." });

    const exists = await Category.exists({ name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
    if (exists) return res.status(409).json({ message: "A category with that name already exists." });

    const category = await Category.create({
      name,
      color: cleanString(req.body?.color || "default", 80),
      icon: cleanString(req.body?.icon, 500),
      images: Array.isArray(req.body?.images) ? req.body.images.map((v) => cleanString(v, 1000)).filter(Boolean) : [],
    });
    return res.status(201).json(category);
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid category id." });
    const update = {};
    if ("name" in req.body) {
      update.name = cleanString(req.body.name, 120);
      if (update.name.length < 2) return res.status(400).json({ message: "Category name is required." });
      const duplicate = await Category.exists({ _id: { $ne: req.params.id }, name: { $regex: `^${escapeRegex(update.name)}$`, $options: "i" } });
      if (duplicate) return res.status(409).json({ message: "A category with that name already exists." });
    }
    if ("color" in req.body) update.color = cleanString(req.body.color, 80);
    if ("icon" in req.body) update.icon = cleanString(req.body.icon, 500);
    if (Array.isArray(req.body?.images)) update.images = req.body.images.map((v) => cleanString(v, 1000)).filter(Boolean);

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json(category);
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid category id." });
    const hasProducts = await Product.exists({ category: req.params.id });
    if (hasProducts) {
      return res.status(409).json({ message: "Move or delete products in this category before deleting it." });
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json({ message: "Category deleted." });
  } catch (err) {
    return next(err);
  }
});

router.post("/:categoryId/subcategories", auth, admin, async (req, res, next) => {
  try {
    const name = cleanString(req.body?.name, 120);
    if (!name) return res.status(400).json({ message: "Subcategory name is required." });
    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ message: "Category not found." });
    if (category.subcategories.some((item) => String(item.name).toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ message: "That subcategory already exists." });
    }
    category.subcategories.push({ name });
    await category.save();
    return res.status(201).json(category.subcategories.at(-1));
  } catch (err) {
    return next(err);
  }
});

router.patch("/:categoryId/subcategories/:subId", auth, admin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ message: "Category not found." });
    const subcategory = category.subcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ message: "Subcategory not found." });
    const name = cleanString(req.body?.name, 120);
    if (!name) return res.status(400).json({ message: "Subcategory name is required." });
    if (category.subcategories.some((item) => String(item._id) !== String(subcategory._id) && String(item.name).toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ message: "That subcategory already exists." });
    }
    subcategory.name = name;
    await category.save();
    return res.json(subcategory);
  } catch (err) {
    return next(err);
  }
});

router.delete("/:categoryId/subcategories/:subId", auth, admin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ message: "Category not found." });
    const subcategory = category.subcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ message: "Subcategory not found." });
    subcategory.deleteOne();
    await category.save();
    await Product.updateMany({ subcategory: req.params.subId }, { $unset: { subcategory: 1 } });
    return res.json({ message: "Subcategory deleted." });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
