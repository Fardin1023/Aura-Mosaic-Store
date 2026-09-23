const mongoose = require("mongoose");
const { Product } = require("../models/products");
const { User } = require("../models/user");
const Order = require("../models/order");
const StoreSetting = require("../models/storeSetting");
const { runShoppingAdvisor } = require("./aiAdvisor");

const compact = (value, max = 1000) => String(value || "").trim().slice(0, max);
const firstImage = (product) =>
  (Array.isArray(product?.images) && product.images[0]) ||
  product?.image ||
  "https://via.placeholder.com/400x300?text=Product";

const productCard = (product, extra = {}) => ({
  _id: String(product._id),
  name: product.name,
  brand: product.brand || "",
  price: Number(product.price || 0),
  oldPrice: product.oldPrice == null ? undefined : Number(product.oldPrice || 0),
  rating: Number(product.rating || 0),
  countInStock: Number(product.countInStock || 0),
  images: [firstImage(product)],
  category: product.category?.name || product.categoryName || "",
  aiLabel: extra.aiLabel || extra.label || "",
  aiReason: extra.aiReason || extra.reason || "",
});

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    text: compact(item?.text, 900),
    products: Array.isArray(item?.products)
      ? item.products.slice(0, 5).map((product) => ({
          id: compact(product?.id || product?._id, 40),
          name: compact(product?.name, 140),
          price: Number(product?.price || 0),
          brand: compact(product?.brand, 80),
        }))
      : [],
  })).filter((item) => item.text || item.products.length);
};

const detectIntent = (message) => {
  const text = String(message || "").toLowerCase();
  if (/\b(order|orders|tracking|track|shipment|shipped|delivery status|where.*order|where.*package)\b/i.test(text)) return "orders";
  if (/\b(wishlist|wish list|saved items?|favorites?|favourites?)\b/i.test(text)) return "wishlist";
  if (/\b(cart|basket|bag)\b/i.test(text) && /(my|what|show|in|total|items?)/i.test(text)) return "cart";
  if (/\b(shipping fee|delivery fee|free shipping|cash on delivery|\bcod\b|support|contact|store announcement|delivery charge|return|refund|exchange)\b/i.test(text)) return "policy";
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|who are you|help)\b/i.test(text.trim())) return "greeting";
  return "shopping";
};

const orderCard = (order) => ({
  _id: String(order._id),
  status: order.status,
  total: Number(order.total || 0),
  createdAt: order.createdAt,
  trackingNumber: order.trackingNumber || "",
  payment: {
    method: order.payment?.method || "COD",
    provider: order.payment?.provider || "COD",
    status: order.payment?.status || "PENDING",
  },
  items: (order.items || []).slice(0, 6).map((item) => ({
    productId: String(item.productId || ""),
    name: item.name,
    qty: Number(item.qty || 1),
    price: Number(item.price || 0),
    image: item.image || "",
  })),
});

const commonChips = [
  "Show me skincare under Tk 1500",
  "Find a thoughtful gift",
  "Show cheaper alternatives",
  "What is in my wishlist?",
  "Where is my latest order?",
];

async function orderResponse(userId, message) {
  if (!userId) {
    return {
      mode: "orders",
      loginRequired: true,
      reply: "Please sign in first so I can securely check **your own orders** and tracking information.",
      chips: ["Sign in", "Show featured products"],
    };
  }

  const objectIdMatch = String(message || "").match(/\b[a-f0-9]{24}\b/i);
  const filter = { user: userId };
  if (objectIdMatch && mongoose.Types.ObjectId.isValid(objectIdMatch[0])) filter._id = objectIdMatch[0];

  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(objectIdMatch ? 1 : 5).lean();
  if (!orders.length) {
    return {
      mode: "orders",
      reply: objectIdMatch
        ? "I couldn't find that order in your account. I can only show orders that belong to the signed-in shopper."
        : "You don't have any orders yet.",
      orders: [],
      chips: ["Show me popular products", "Find a gift"],
    };
  }

  const latest = orders[0];
  const tracking = latest.trackingNumber ? ` Tracking: **${latest.trackingNumber}**.` : "";
  return {
    mode: "orders",
    reply: `Your ${objectIdMatch ? "order" : "latest order"} is **${latest.status}**. Payment is **${latest.payment?.status || "PENDING"}**.${tracking}`,
    orders: orders.map(orderCard),
    chips: ["Show my wishlist", "Recommend something based on my purchases"],
  };
}

async function wishlistResponse(userId) {
  if (!userId) {
    return {
      mode: "wishlist",
      loginRequired: true,
      reply: "Please sign in first so I can read your wishlist securely.",
      chips: ["Sign in", "Show featured products"],
    };
  }

  const user = await User.findById(userId)
    .select("wishlist")
    .populate({
      path: "wishlist",
      match: { isActive: { $ne: false } },
      populate: { path: "category", select: "name" },
    })
    .lean();
  const products = Array.isArray(user?.wishlist) ? user.wishlist.filter(Boolean) : [];

  return {
    mode: "wishlist",
    reply: products.length
      ? `You currently have **${products.length}** active product${products.length === 1 ? "" : "s"} in your wishlist.`
      : "Your wishlist is currently empty.",
    products: products.slice(0, 8).map((product) => productCard(product, { aiLabel: "Wishlist" })),
    chips: products.length
      ? ["Recommend my next buy from these", "Show cheaper alternatives"]
      : ["Show popular products", "Find skincare"],
  };
}

async function policyResponse(message) {
  const settings = await StoreSetting.getStoreSettings();
  const text = String(message || "").toLowerCase();
  const lines = [];

  if (/shipping|delivery fee|delivery charge|free shipping/i.test(text)) {
    lines.push(`Standard shipping is **Tk ${Number(settings.shippingFlatFee || 0).toFixed(0)}**.`);
    lines.push(`Shipping is free from **Tk ${Number(settings.freeShippingThreshold || 0).toFixed(0)}**.`);
  }
  if (/cash on delivery|\bcod\b/i.test(text)) {
    lines.push(`Cash on Delivery is currently **${settings.allowCOD ? "available" : "unavailable"}**.`);
  }
  if (/support|contact/i.test(text)) {
    if (settings.supportEmail) lines.push(`Support email: **${settings.supportEmail}**.`);
    if (settings.supportPhone) lines.push(`Support phone: **${settings.supportPhone}**.`);
    if (!settings.supportEmail && !settings.supportPhone) lines.push("Use the Contact page to reach the store team.");
  }
  if (/return|refund|exchange/i.test(text)) {
    lines.push("A return/refund policy is not currently configured in Store Settings. Please contact the store team for the applicable policy before sending anything back.");
  }
  if (/announcement/i.test(text) && settings.announcement) lines.push(settings.announcement);
  if (!lines.length) {
    lines.push(`Shipping: Tk ${Number(settings.shippingFlatFee || 0).toFixed(0)}, free from Tk ${Number(settings.freeShippingThreshold || 0).toFixed(0)}.`);
    lines.push(`Cash on Delivery: ${settings.allowCOD ? "available" : "unavailable"}.`);
  }

  return {
    mode: "policy",
    reply: lines.join("\n\n"),
    chips: ["What is the delivery fee?", "Is COD available?", "How do I contact support?"],
  };
}

function cartResponse(clientContext = {}) {
  const cart = Array.isArray(clientContext?.cart) ? clientContext.cart.slice(0, 20) : [];
  if (!cart.length) {
    return { mode: "cart", reply: "Your browser cart is currently empty.", chips: ["Show popular products", "Find a gift"] };
  }
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const list = cart.map((item) => `• ${compact(item.name, 100)} × ${Number(item.qty || 1)}`).join("\n");
  return {
    mode: "cart",
    reply: `Your current cart shows:\n\n${list}\n\nEstimated subtotal: **Tk ${subtotal.toFixed(0)}**. Final totals are calculated securely at checkout.`,
    chips: ["Recommend something that goes with my cart", "Show my wishlist"],
  };
}

function greetingResponse(isSignedIn) {
  return {
    mode: "greeting",
    reply: `Hi! I'm **Aura Assistant**, your AI shopping companion. I can search the live catalogue, compare products, suggest gifts, find cheaper alternatives${isSignedIn ? ", check your wishlist, and track your orders" : ""}.`,
    chips: commonChips,
  };
}

async function shoppingResponse({ userId, message, history }) {
  const result = await runShoppingAdvisor({ userId: userId || null, prompt: message, history });
  const considerations = Array.isArray(result.considerations) && result.considerations.length
    ? `\n\n${result.considerations.map((item) => `• ${item}`).join("\n")}`
    : "";
  const followUp = result.followUpQuestion ? `\n\n${result.followUpQuestion}` : "";
  const reply = `**${result.headline || "Aura AI"}**\n\n${result.summary || ""}${considerations}${followUp}`.trim();

  const lower = String(message || "").toLowerCase();
  const chips = [];
  if (/compare/i.test(lower)) chips.push("Which one is the best value?", "Show cheaper alternatives");
  else if (/gift/i.test(lower)) chips.push("Make it cheaper", "Show more gift ideas");
  else chips.push("Show cheaper alternatives", "Compare the top choices", "Use my wishlist too");

  return {
    mode: "ai",
    ai: true,
    model: result.model,
    degraded: Boolean(result.degraded),
    reply,
    products: Array.isArray(result.recommendations) ? result.recommendations : [],
    chips,
  };
}

async function runAssistantV2({ userId = null, message, history = [], clientContext = {} }) {
  const intent = detectIntent(message);
  if (intent === "orders") return orderResponse(userId, message);
  if (intent === "wishlist") return wishlistResponse(userId);
  if (intent === "policy") return policyResponse(message);
  if (intent === "cart") return cartResponse(clientContext);
  if (intent === "greeting") return greetingResponse(Boolean(userId));
  return shoppingResponse({ userId, message, history: sanitizeHistory(history) });
}

module.exports = { runAssistantV2, sanitizeHistory };
