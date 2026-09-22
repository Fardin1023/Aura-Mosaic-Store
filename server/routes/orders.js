const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const { Product } = require("../models/products");
const cities = require("../data/cities");
const { cleanString, isObjectId } = require("../utils/validation");

const router = express.Router();
const VALID_CITIES = new Set(cities.map((item) => item.name.toLowerCase()));
const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  placed: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
  paid: ["processing", "shipped", "delivered"],
};

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).map((item) => ({
    productId: item?.productId,
    qty: Math.max(1, Math.min(99, Math.floor(Number(item?.qty || 1)))),
  }));
}

router.post("/", auth, async (req, res, next) => {
  const requested = normalizeItems(req.body?.items);
  if (!requested.length) return res.status(400).json({ message: "Your cart is empty." });
  if (requested.some((item) => !isObjectId(item.productId))) {
    return res.status(400).json({ message: "One or more cart items are invalid." });
  }

  const city = cleanString(req.body?.city, 120);
  if (!city || !VALID_CITIES.has(city.toLowerCase())) {
    return res.status(400).json({ message: "Please select a valid delivery city." });
  }

  const method = String(req.body?.payment?.method || "COD").toUpperCase();
  if (method !== "COD") {
    return res.status(400).json({ message: "Online payment is not enabled yet. Please choose Cash on Delivery." });
  }

  const session = await mongoose.startSession();
  try {
    let createdOrder;
    await session.withTransaction(async () => {
      const uniqueIds = [...new Set(requested.map((item) => String(item.productId)))];
      const products = await Product.find({ _id: { $in: uniqueIds } }).session(session);
      const byId = new Map(products.map((product) => [String(product._id), product]));
      const combined = new Map();
      for (const item of requested) {
        const key = String(item.productId);
        combined.set(key, Math.min(99, (combined.get(key) || 0) + item.qty));
      }

      const items = [];
      for (const [productId, qty] of combined.entries()) {
        const product = byId.get(productId);
        if (!product) throw Object.assign(new Error("A product in your cart is no longer available."), { status: 409 });
        if (product.countInStock < qty) {
          throw Object.assign(new Error(`${product.name} only has ${product.countInStock} item(s) left in stock.`), { status: 409 });
        }
        items.push({
          productId: product._id,
          name: product.name,
          image: Array.isArray(product.images) ? product.images[0] || "" : "",
          price: Number(product.price),
          qty,
        });
      }

      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      const discount = 0;
      const shipping = subtotal >= 500 ? 0 : 60;
      const total = Math.max(0, subtotal - discount + shipping);

      for (const item of items) {
        const updated = await Product.updateOne(
          { _id: item.productId, countInStock: { $gte: item.qty } },
          { $inc: { countInStock: -item.qty } },
          { session }
        );
        if (updated.modifiedCount !== 1) {
          throw Object.assign(new Error(`${item.name} went out of stock while you were checking out.`), { status: 409 });
        }
      }

      const [order] = await Order.create([{
        user: req.user.id,
        items,
        subtotal,
        discount,
        shipping,
        total,
        status: "pending",
        city,
        inventoryRestored: false,
        payment: { method: "COD", provider: "COD", status: "PENDING", amount: total, meta: {} },
      }], { session });
      createdOrder = order;
    });

    return res.status(201).json(createdOrder);
  } catch (err) {
    return next(err);
  } finally {
    await session.endSession();
  }
});

router.get("/my", auth, async (req, res, next) => {
  try {
    return res.json(await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean());
  } catch (err) {
    return next(err);
  }
});

router.get("/", auth, admin, async (req, res, next) => {
  try {
    const status = cleanString(req.query?.status, 40).toLowerCase();
    const filter = status && Object.prototype.hasOwnProperty.call(STATUS_TRANSITIONS, status) ? { status } : {};
    const orders = await Order.find(filter).populate("user", "name email").sort({ createdAt: -1 }).limit(500).lean();
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/status", auth, admin, async (req, res, next) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order id." });
  const nextStatus = cleanString(req.body?.status, 40).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(STATUS_TRANSITIONS, nextStatus)) {
    return res.status(400).json({ message: "Invalid order status." });
  }

  const session = await mongoose.startSession();
  try {
    let output;
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).select("+inventoryRestored").session(session);
      if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });

      const current = String(order.status || "pending").toLowerCase();
      if (nextStatus !== current && !(STATUS_TRANSITIONS[current] || []).includes(nextStatus)) {
        throw Object.assign(new Error(`Order cannot move from ${current} to ${nextStatus}.`), { status: 409 });
      }

      if (nextStatus === "cancelled" && current !== "cancelled" && !order.inventoryRestored) {
        for (const item of order.items) {
          await Product.updateOne({ _id: item.productId }, { $inc: { countInStock: item.qty } }, { session });
        }
        order.inventoryRestored = true;
      }

      if (nextStatus === "delivered" && order.payment?.method === "COD") {
        order.payment.status = "PAID";
        const existing = await Transaction.findOne({ order: order._id, type: "debit", status: "PAID" }).session(session);
        if (!existing) {
          await Transaction.create([{
            user: order.user,
            type: "debit",
            amount: order.total,
            description: `Cash on Delivery payment for order ${order._id}`,
            order: order._id,
            method: "COD",
            provider: "COD",
            status: "PAID",
          }], { session });
        }
      }

      order.status = nextStatus;
      await order.save({ session });
      output = order.toObject();
      delete output.inventoryRestored;
    });
    return res.json(output);
  } catch (err) {
    return next(err);
  } finally {
    await session.endSession();
  }
});

router.get("/:id", auth, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order id." });
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id })
      .populate("user", "name email")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found." });
    return res.json(order);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
