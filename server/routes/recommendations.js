const express = require("express");
const { Product } = require("../models/products");
const { Category } = require("../models/category");
const { cleanString, escapeRegex, isObjectId } = require("../utils/validation");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");
const { runAssistantV2 } = require("../services/assistantV2");
const { runShoppingAdvisor, runGiftDesigner, aiConfigured, aiModel } = require("../services/aiAdvisor");

const router = express.Router();

router.get("/ai/status", (_req, res) => {
  return res.json({
    configured: aiConfigured(),
    model: aiModel(),
  });
});


router.post("/ai/gift-designer", optionalAuth, async (req, res, next) => {
  try {
    const prompt = cleanString(req.body?.prompt, 1500);
    if (!prompt || prompt.length < 4) {
      return res.status(400).json({ message: "Tell Aura AI who the gift is for or what kind of gift you want." });
    }

    const budgetTotalRaw = Number(req.body?.budgetTotal || 0);
    const budgetTotal = Number.isFinite(budgetTotalRaw)
      ? Math.max(0, Math.min(1_000_000, budgetTotalRaw))
      : 0;
    const bundleSizeRaw = Number(req.body?.bundleSize || 0);
    const bundleSize = [1, 2, 3, 4].includes(bundleSizeRaw) ? bundleSizeRaw : 0;
    const excludeIds = Array.isArray(req.body?.excludeIds)
      ? req.body.excludeIds.filter(isObjectId).slice(0, 30)
      : [];

    const result = await runGiftDesigner({
      userId: req.user?.id || null,
      prompt,
      budgetTotal,
      bundleSize,
      excludeIds,
    });
    return res.json({ ai: true, ...result });
  } catch (err) {
    if (err?.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ message: err.message });
    }
    if (["AI_TEMPORARILY_UNAVAILABLE", "AI_TIMEOUT"].includes(err?.code) || [429, 503, 504].includes(err?.status)) {
      console.error("Aura AI Gift Designer availability error:", {
        message: err.message,
        attemptedModels: err.attemptedModels || [],
      });
      return res.status(503).json({
        message: "Aura AI Gift Studio is temporarily busy. Please try again in a moment.",
      });
    }
    if ([400, 401, 403, 404, 502].includes(Number(err?.status))) {
      console.error("Aura AI Gift Designer provider error:", {
        status: err.status,
        message: err.message,
        attemptedModels: err.attemptedModels || [],
      });
      return res.status(502).json({
        message: "Aura AI could not finish designing the gift right now. Please try again.",
      });
    }
    return next(err);
  }
});

router.post("/assistant", optionalAuth, async (req, res, next) => {
  try {
    const message = cleanString(req.body?.message, 1000);
    if (!message || message.length < 1) {
      return res.status(400).json({ message: "Type a message for Aura Assistant." });
    }

    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const clientContext = req.body?.clientContext && typeof req.body.clientContext === "object"
      ? req.body.clientContext
      : {};

    const result = await runAssistantV2({
      userId: req.user?.id || null,
      message,
      history,
      clientContext,
    });
    return res.json(result);
  } catch (err) {
    if (err?.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ message: err.message });
    }
    if (["AI_TEMPORARILY_UNAVAILABLE", "AI_TIMEOUT"].includes(err?.code) || [429, 503, 504].includes(err?.status)) {
      console.error("Aura Assistant Gemini availability error:", {
        message: err.message,
        attemptedModels: err.attemptedModels || [],
      });
      return res.status(503).json({ message: "Aura Assistant is temporarily busy. Please try again in a moment." });
    }
    if ([400, 401, 403, 404, 502].includes(Number(err?.status))) {
      console.error("Aura Assistant provider error:", { status: err.status, message: err.message });
      return res.status(502).json({ message: "Aura Assistant could not complete the AI request right now." });
    }
    return next(err);
  }
});

router.post("/ai/advisor", authMiddleware, async (req, res, next) => {
  try {
    const prompt = cleanString(req.body?.prompt, 1500);
    if (!prompt || prompt.length < 4) {
      return res.status(400).json({ message: "Tell Aura AI what you are shopping for." });
    }

    const result = await runShoppingAdvisor({ userId: req.user.id, prompt });
    return res.json({ ai: true, ...result });
  } catch (err) {
    if (err?.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ message: err.message });
    }

    if (["AI_TEMPORARILY_UNAVAILABLE", "AI_TIMEOUT"].includes(err?.code) || [429, 503, 504].includes(err?.status)) {
      console.error("Gemini availability error:", {
        message: err.message,
        attemptedModels: err.attemptedModels || [],
      });
      return res.status(503).json({
        message: "Aura AI is temporarily slow or busy. The available Gemini models were tried automatically; please try again in a moment.",
      });
    }

    if (err?.status === 400) {
      console.error("Gemini request configuration error:", {
        message: err.message,
        attemptedModels: err.attemptedModels || [],
      });
      return res.status(502).json({
        message: "Aura AI sent a request Gemini rejected. The backend request format needs checking.",
      });
    }

    if ([401, 403].includes(err?.status)) {
      console.error("Gemini authentication error:", err.message);
      return res.status(502).json({
        message: "Gemini rejected the API key or project permissions. Check GEMINI_API_KEY in server/.env.",
      });
    }

    if (err?.status === 404) {
      console.error("Gemini model error:", {
        message: err.message,
        attemptedModels: err.attemptedModels || [],
      });
      return res.status(502).json({
        message: "The configured Gemini model is not available to this API project. Check GEMINI_MODEL / fallback models.",
      });
    }

    if (err?.code === "AI_INVALID_RESPONSE" || err?.status === 502) {
      console.error("Gemini response error:", err.message);
      return res.status(502).json({
        message: "Aura AI received an unusable response from Gemini. Please try again.",
      });
    }

    return next(err);
  }
});

const firstImage = (product) =>
  (Array.isArray(product.images) && product.images[0]) ||
  product.image ||
  "https://via.placeholder.com/400x300?text=Product";

const asCard = (product, badge = "") => ({
  _id: product._id,
  name: product.name,
  brand: product.brand || "",
  description: product.description || "",
  price: Number(product.price || 0),
  rating: Number(product.rating || 0),
  countInStock: Number(product.countInStock || 0),
  images: [firstImage(product)],
  badge,
});

const parseBudget = (text) => {
  const source = String(text || "");
  const match = /(?:under|below|<=|≤|less than|up to|upto)\s*(?:tk|৳)?\s*(\d{2,6})/i.exec(source)
    || /(?:tk|৳)\s*(\d{2,6})/i.exec(source);
  return match ? Number(match[1]) || 0 : 0;
};

const parseMinRating = (text) => {
  const source = String(text || "");
  const match = /(?:rating|stars?|star)\s*(?:>=|at least|over|above|\+)?\s*(\d(?:\.\d)?)/i.exec(source)
    || /(\d(?:\.\d)?)\s*\+\s*(?:rating|stars?)/i.exec(source)
    || />=\s*(\d(?:\.\d)?)/i.exec(source);
  if (!match) return 0;
  return Math.min(5, Math.max(0, Number(match[1]) || 0));
};

const parseBrand = (text) => {
  const match = /(?:brand|by|from)\s+([a-z0-9][a-z0-9 .&'\-]{1,60})/i.exec(String(text || ""));
  return match ? match[1].trim() : "";
};

const suggestionChips = (extra = []) => ({
  type: "chips",
  items: [
    "Show deals under Tk 500",
    "Trending Skincare",
    "Best rated this week",
    "Handcraft gifts",
    "Plants for home",
    ...extra,
  ],
});

async function featuredBlock() {
  let items = await Product.find({ isFeatured: true, countInStock: { $gt: 0 }, isActive: { $ne: false } })
    .sort({ rating: -1, numReviews: -1, createdAt: -1 })
    .limit(8)
    .lean();
  if (!items.length) {
    items = await Product.find({ countInStock: { $gt: 0 }, isActive: { $ne: false } })
      .sort({ rating: -1, numReviews: -1, createdAt: -1 })
      .limit(8)
      .lean();
  }
  return items.length
    ? { type: "products", title: "Featured & Trending", items: items.map((item) => asCard(item, "Featured")) }
    : null;
}

async function productsBlock(filter, title, badge = "") {
  const items = await Product.find({ ...filter, countInStock: { $gt: 0 }, isActive: { $ne: false } })
    .sort({ rating: -1, numReviews: -1, price: 1 })
    .limit(8)
    .lean();
  return items.length ? { type: "products", title, items: items.map((item) => asCard(item, badge)) } : null;
}

router.post("/chat", async (req, res, next) => {
  try {
    const raw = cleanString(req.body?.message, 500);
    if (!raw) {
      return res.json({ blocks: [{ type: "text", text: "Please type something I can search for 🙂" }, suggestionChips()] });
    }

    const lower = raw.toLowerCase();
    const budget = parseBudget(raw);
    if (budget > 0) {
      const block = await productsBlock({ price: { $lte: budget } }, `Deals under Tk ${budget}`, "Deal");
      return res.json({
        blocks: [
          { type: "text", text: `Here are some in-stock picks **under Tk ${budget}**:` },
          block || { type: "text", text: "I couldn't find an in-stock product in that budget yet." },
          suggestionChips(),
        ],
      });
    }

    const categories = await Category.find({}, "name").lean();
    const category = categories.find((item) => lower.includes(String(item.name || "").toLowerCase()));
    if (category) {
      const block = await productsBlock({ category: category._id }, category.name);
      return res.json({
        blocks: [
          { type: "text", text: `Here are **${category.name}** suggestions:` },
          block || { type: "text", text: "There are no in-stock products in that category right now." },
          suggestionChips(),
        ],
      });
    }

    const brand = parseBrand(raw);
    if (brand) {
      const block = await productsBlock(
        { brand: { $regex: `^\\s*${escapeRegex(brand)}\\s*$`, $options: "i" } },
        brand
      );
      return res.json({
        blocks: [
          { type: "text", text: `Here are some **${brand}** products:` },
          block || { type: "text", text: "I couldn't find that brand in stock." },
          suggestionChips(),
        ],
      });
    }

    if (/(feature|best|top|trending|popular|offer|deal)/i.test(lower)) {
      const featured = await featuredBlock();
      return res.json({
        blocks: [
          { type: "text", text: "Here are some highly rated in-stock picks:" },
          ...(featured ? [featured] : []),
          suggestionChips(),
        ],
      });
    }

    const regex = new RegExp(escapeRegex(raw), "i");
    const categoryIds = categories
      .filter((item) => regex.test(String(item.name || "")))
      .map((item) => item._id);
    const items = await Product.find({
      countInStock: { $gt: 0 },
      isActive: { $ne: false },
      $or: [
        { name: regex },
        { brand: regex },
        { description: regex },
        ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
      ],
    })
      .sort({ rating: -1, numReviews: -1 })
      .limit(8)
      .lean();

    if (items.length) {
      return res.json({
        blocks: [
          { type: "text", text: "Here’s what I found:" },
          { type: "products", title: "Matches", items: items.map((item) => asCard(item)) },
          suggestionChips(),
        ],
      });
    }

    const featured = await featuredBlock();
    return res.json({
      blocks: [
        { type: "text", text: `I couldn’t find an exact match for “${raw}”. Here are some alternatives:` },
        ...(featured ? [featured] : []),
        suggestionChips(),
      ],
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/recommend", async (req, res, next) => {
  try {
    const taste = req.body?.taste || {};
    const categories = Array.isArray(taste.categories)
      ? taste.categories.map((value) => cleanString(value, 80)).filter(Boolean).slice(0, 6)
      : [];
    const brands = Array.isArray(taste.brands)
      ? taste.brands.map((value) => cleanString(value, 80)).filter(Boolean).slice(0, 6)
      : [];
    const minRating = Math.min(5, Math.max(0, Number(taste.minRating || 0)));
    const maxBudget = Math.max(0, Number(taste.budget?.max || 0));
    const common = {
      ...(minRating ? { rating: { $gte: minRating } } : {}),
      ...(maxBudget ? { price: { $lte: maxBudget } } : {}),
    };

    const blocks = [];
    if (categories.length) {
      const docs = await Category.find({
        name: { $in: categories.map((name) => new RegExp(`^\\s*${escapeRegex(name)}\\s*$`, "i")) },
      }).lean();
      for (const category of docs) {
        const block = await productsBlock({ ...common, category: category._id }, `${category.name} — Top Picks`);
        if (block) blocks.push(block);
      }
    }

    for (const brand of brands) {
      const block = await productsBlock(
        { ...common, brand: { $regex: `^\\s*${escapeRegex(brand)}\\s*$`, $options: "i" } },
        `${brand} — Best For You`
      );
      if (block) blocks.push(block);
    }

    if (!blocks.length && maxBudget) {
      const block = await productsBlock({ ...common }, `Picks under Tk ${maxBudget}`, "Deal");
      if (block) blocks.push(block);
    }
    if (!blocks.length) {
      const featured = await featuredBlock();
      if (featured) blocks.push(featured);
    }
    if (!blocks.length) {
      blocks.push({ type: "text", text: "No matching in-stock products were found. Try broadening your preferences." });
    }
    blocks.push(suggestionChips());
    return res.json({ blocks });
  } catch (err) {
    return next(err);
  }
});

router.post("/gift", async (req, res, next) => {
  try {
    const mode = String(req.body?.mode || "questions").toLowerCase();
    const prompt = cleanString(req.body?.prompt, 500);
    const gender = String(req.body?.gender || "").toLowerCase();
    const relation = String(req.body?.relation || "").toLowerCase();
    const requestedSize = req.body?.bundleSize;
    const size = [1, 2, 3].includes(Number(requestedSize))
      ? Number(requestedSize)
      : String(requestedSize).toLowerCase() === "single"
        ? 1
        : String(requestedSize).toLowerCase() === "multi"
          ? 3
          : 2;
    const explicitBudget = Number(req.body?.budgetMax);
    const budgetMax = Number.isFinite(explicitBudget) && explicitBudget > 0
      ? explicitBudget
      : (mode === "prompt" ? parseBudget(prompt) : 0);
    const minRating = mode === "prompt" ? parseMinRating(prompt) : 0;
    const brand = mode === "prompt" ? parseBrand(prompt) : "";
    const excludeIds = Array.isArray(req.body?.excludeIds)
      ? req.body.excludeIds.filter(isObjectId).slice(0, 20)
      : [];

    if (mode === "questions" && (!gender || !relation)) {
      return res.status(400).json({ message: "Please choose both gender and relation." });
    }

    const categoryDocs = await Category.find({}, "name").lean();
    const wanted = [];
    if (mode === "prompt" && prompt) {
      const lower = prompt.toLowerCase();
      categoryDocs.forEach((category) => {
        if (lower.includes(String(category.name || "").toLowerCase())) wanted.push(category.name);
      });
    } else {
      const byGender = gender === "female"
        ? ["Skincare", "Handcraft", "Gifting", "Plants"]
        : ["Handcraft", "Plants", "Gifting", "Skincare"];
      const byRelation = relation === "relative"
        ? ["Gifting", "Handcraft", "Skincare", "Plants"]
        : ["Skincare", "Plants", "Handcraft", "Gifting"];
      wanted.push(...byGender, ...byRelation);
    }

    const wantedLower = new Set(wanted.map((value) => String(value).toLowerCase()));
    const categoryIds = categoryDocs
      .filter((category) => wantedLower.has(String(category.name || "").toLowerCase()))
      .map((category) => category._id);

    const filter = {
      countInStock: { $gt: 0 },
      isActive: { $ne: false },
      ...(categoryIds.length ? { category: { $in: categoryIds } } : {}),
      ...(budgetMax ? { price: { $lte: budgetMax } } : {}),
      ...(minRating ? { rating: { $gte: minRating } } : {}),
      ...(brand ? { brand: { $regex: escapeRegex(brand), $options: "i" } } : {}),
      ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
    };

    let candidates = await Product.find(filter)
      .sort({ rating: -1, numReviews: -1, price: 1, createdAt: -1 })
      .limit(50)
      .lean();

    if (candidates.length < size) {
      const fallback = {
        countInStock: { $gt: 0 },
        isActive: { $ne: false },
        ...(budgetMax ? { price: { $lte: budgetMax } } : {}),
        ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
      };
      candidates = await Product.find(fallback)
        .sort({ rating: -1, numReviews: -1, price: 1, createdAt: -1 })
        .limit(50)
        .lean();
    }

    const items = candidates.slice(0, size).map((product, index) => asCard(product, index === 0 ? "Top pick" : "Good match"));
    const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const title = `Your ${size === 1 ? "Single" : size === 2 ? "Pair" : "Bundle"} Gift`;
    const message = items.length
      ? "Suggestions use current in-stock products and live prices."
      : "No matching in-stock gift products were found. Try a higher budget or broader request.";

    return res.json({ title, items, total, message });
  } catch (err) {
    return next(err);
  }
});

router.post("/compare", async (req, res, next) => {
  try {
    const productId = String(req.body?.productId || "");
    if (!isObjectId(productId)) return res.status(400).json({ message: "A valid productId is required." });

    const base = await Product.findOne({ _id: productId, isActive: { $ne: false } }).lean();
    if (!base) return res.status(404).json({ message: "Product not found." });

    const brand = String(base.brand || "").trim();
    const brandRegex = brand ? new RegExp(`^\\s*${escapeRegex(brand)}\\s*$`, "i") : null;
    const common = { _id: { $ne: base._id }, countInStock: { $gt: 0 }, isActive: { $ne: false }, ...(base.category ? { category: base.category } : {}) };

    const [sameBrand, otherBrands] = await Promise.all([
      brandRegex
        ? Product.find({ ...common, brand: brandRegex }).sort({ rating: -1, price: 1 }).limit(8).lean()
        : Promise.resolve([]),
      Product.find({ ...common, ...(brandRegex ? { brand: { $not: brandRegex } } : {}) })
        .sort({ rating: -1, price: 1 })
        .limit(12)
        .lean(),
    ]);

    const candidates = [...sameBrand, ...otherBrands];
    if (!candidates.length) {
      return res.json({
        base: asCard(base), best: null, sameBrand: [], otherBrands: [], bullets: [],
        summary: "Not enough in-stock products in the same category to compare.",
      });
    }

    const tokenize = (value = "") => String(value)
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((word) => word && !["the", "and", "with", "for", "a", "an", "of", "to", "is", "in", "on", "by", "from", "this", "that", "it"].includes(word));
    const baseTokens = new Set(tokenize(base.description));
    const similarity = (product) => {
      const words = tokenize(product.description);
      const overlap = words.filter((word) => baseTokens.has(word)).length;
      return overlap / Math.sqrt(Math.max(1, baseTokens.size) * Math.max(1, words.length));
    };

    const basePrice = Math.max(1, Number(base.price || 0));
    const scored = candidates.map((product) => {
      const ratingScore = Math.min(1, Math.max(0, Number(product.rating || 0) / 5));
      const relativePrice = (basePrice - Number(product.price || 0)) / Math.max(basePrice, Number(product.price || 0), 1);
      const priceScore = Math.min(1, Math.max(0, 0.5 + relativePrice));
      return { product, score: 0.7 * ratingScore + 0.2 * priceScore + 0.1 * similarity(product) };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].product;

    const bullets = [];
    const ratingDelta = Number(best.rating || 0) - Number(base.rating || 0);
    bullets.push(
      Math.abs(ratingDelta) >= 0.2
        ? `${best.name} has ${ratingDelta > 0 ? "a higher" : "a slightly lower"} rating (${Number(best.rating || 0).toFixed(1)}★ vs ${Number(base.rating || 0).toFixed(1)}★).`
        : `Ratings are similar (${Number(best.rating || 0).toFixed(1)}★ vs ${Number(base.rating || 0).toFixed(1)}★).`
    );
    const priceDelta = Number(best.price || 0) - Number(base.price || 0);
    if (Math.abs(priceDelta) >= 1) bullets.push(`${priceDelta < 0 ? "Cheaper" : "Pricier"} by ৳${Math.abs(priceDelta).toFixed(0)}.`);
    bullets.push(brand && String(best.brand || "").trim().toLowerCase() === brand.toLowerCase()
      ? "Same-brand alternative."
      : "Different-brand alternative selected from the same category.");

    return res.json({
      base: asCard(base),
      best: asCard(best, "Best match"),
      sameBrand: sameBrand.map((product) => asCard(product, "Same brand")),
      otherBrands: otherBrands.map((product) => asCard(product, "Other brand")),
      bullets,
      summary: `Compared with **${base.name}**, the highest-scoring alternative is **${best.name}** (৳${Number(best.price || 0).toFixed(0)}, ${Number(best.rating || 0).toFixed(1)}★).`,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
