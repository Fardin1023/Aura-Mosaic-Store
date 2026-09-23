const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const StoreSetting = require("../models/storeSetting");
const ContactMessage = require("../models/contactMessage");
const NewsletterSubscriber = require("../models/newsletterSubscriber");
const { Product } = require("../models/products");
const { User } = require("../models/user");
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

function cleanShippingAddress(input, fallbackUser, fallbackCity) {
  const source = input && typeof input === "object" ? input : {};
  return {
    name: cleanString(source.name || fallbackUser?.name, 120),
    phone: cleanString(source.phone || fallbackUser?.phone, 40),
    addressLine1: cleanString(source.addressLine1 || fallbackUser?.addressLine1, 250),
    addressLine2: cleanString(source.addressLine2 || fallbackUser?.addressLine2, 250),
    city: cleanString(source.city || fallbackCity || fallbackUser?.city, 120),
    postalCode: cleanString(source.postalCode || fallbackUser?.postalCode, 30),
  };
}

async function restoreInventory(order, session) {
  if (order.inventoryRestored) return;
  for (const item of order.items) {
    await Product.updateOne({ _id: item.productId }, { $inc: { countInStock: item.qty } }, { session });
  }
  order.inventoryRestored = true;
}

router.get("/store-settings", async (_req, res, next) => {
  try {
    const settings = await StoreSetting.getStoreSettings();
    return res.json({
      storeName: settings.storeName,
      currency: settings.currency,
      shippingFlatFee: settings.shippingFlatFee,
      freeShippingThreshold: settings.freeShippingThreshold,
      lowStockThreshold: settings.lowStockThreshold,
      allowCOD: settings.allowCOD,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      announcement: settings.announcement,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/settings", auth, admin, async (_req, res, next) => {
  try {
    return res.json(await StoreSetting.getStoreSettings());
  } catch (err) {
    return next(err);
  }
});

router.patch("/admin/settings", auth, admin, async (req, res, next) => {
  try {
    const update = {};
    if ("storeName" in req.body) update.storeName = cleanString(req.body.storeName, 120);
    if ("currency" in req.body) update.currency = cleanString(req.body.currency, 8).toUpperCase();
    if ("shippingFlatFee" in req.body) update.shippingFlatFee = Number(req.body.shippingFlatFee);
    if ("freeShippingThreshold" in req.body) update.freeShippingThreshold = Number(req.body.freeShippingThreshold);
    if ("lowStockThreshold" in req.body) update.lowStockThreshold = Number(req.body.lowStockThreshold);
    if ("allowCOD" in req.body) update.allowCOD = Boolean(req.body.allowCOD);
    if ("supportEmail" in req.body) update.supportEmail = cleanString(req.body.supportEmail, 200).toLowerCase();
    if ("supportPhone" in req.body) update.supportPhone = cleanString(req.body.supportPhone, 40);
    if ("announcement" in req.body) update.announcement = cleanString(req.body.announcement, 500);

    for (const key of ["shippingFlatFee", "freeShippingThreshold", "lowStockThreshold"]) {
      if (key in update && (!Number.isFinite(update[key]) || update[key] < 0)) {
        return res.status(400).json({ message: `${key} must be zero or greater.` });
      }
    }

    const settings = await StoreSetting.findOneAndUpdate(
      { key: "default" },
      { $set: update, $setOnInsert: { key: "default" } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json(settings);
  } catch (err) {
    return next(err);
  }
});

router.post("/", auth, async (req, res, next) => {
  const requested = normalizeItems(req.body?.items);
  if (!requested.length) return res.status(400).json({ message: "Your cart is empty." });
  if (requested.some((item) => !isObjectId(item.productId))) {
    return res.status(400).json({ message: "One or more cart items are invalid." });
  }

  const city = cleanString(req.body?.city || req.body?.shippingAddress?.city, 120);
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
      const [customer, settings] = await Promise.all([
        User.findOne({ _id: req.user.id, isActive: { $ne: false } }).session(session).lean(),
        StoreSetting.getStoreSettings(),
      ]);
      if (!customer) throw Object.assign(new Error("Your account is not available."), { status: 403 });
      if (!settings.allowCOD) throw Object.assign(new Error("Cash on Delivery is currently unavailable."), { status: 409 });

      const uniqueIds = [...new Set(requested.map((item) => String(item.productId)))];
      const products = await Product.find({ _id: { $in: uniqueIds }, isActive: { $ne: false } }).session(session);
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
      const shipping = subtotal >= Number(settings.freeShippingThreshold || 0)
        ? 0
        : Number(settings.shippingFlatFee || 0);
      const total = Math.max(0, subtotal - discount + shipping);

      for (const item of items) {
        const updated = await Product.updateOne(
          { _id: item.productId, countInStock: { $gte: item.qty }, isActive: { $ne: false } },
          { $inc: { countInStock: -item.qty } },
          { session }
        );
        if (updated.modifiedCount !== 1) {
          throw Object.assign(new Error(`${item.name} went out of stock while you were checking out.`), { status: 409 });
        }
      }

      const shippingAddress = cleanShippingAddress(req.body?.shippingAddress, customer, city);
      const [order] = await Order.create([{
        user: req.user.id,
        items,
        subtotal,
        discount,
        shipping,
        total,
        status: "pending",
        city,
        shippingAddress,
        inventoryRestored: false,
        statusHistory: [{ status: "pending", changedBy: req.user.id, note: "Order placed" }],
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

router.get("/admin/dashboard", auth, admin, async (_req, res, next) => {
  try {
    const settings = await StoreSetting.getStoreSettings();
    const lowStockThreshold = Number(settings.lowStockThreshold || 5);
    const bestSellerStatuses = ["confirmed", "processing", "shipped", "delivered", "paid"];

    const [
      totalProducts,
      totalCustomers,
      disabledCustomers,
      totalOrders,
      pendingOrders,
      lowStockProducts,
      unreadMessages,
      activeSubscribers,
      revenueRows,
      orderStatusRows,
      inventoryRows,
      bestSellingProducts,
      recentOrders,
    ] = await Promise.all([
      Product.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "customer", isActive: false }),
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Product.countDocuments({ isActive: { $ne: false }, countInStock: { $lte: lowStockThreshold } }),
      ContactMessage.countDocuments({ status: "new" }),
      NewsletterSubscriber.countDocuments({ active: true }),
      Order.aggregate([
        { $match: { "payment.status": "PAID" } },
        { $group: { _id: null, revenue: { $sum: "$total" } } },
      ]),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Product.aggregate([
        { $match: { isActive: { $ne: false } } },
        {
          $project: {
            bucket: {
              $switch: {
                branches: [
                  { case: { $lte: ["$countInStock", 0] }, then: "Out of stock" },
                  { case: { $lte: ["$countInStock", lowStockThreshold] }, then: "Low stock" },
                ],
                default: "In stock",
              },
            },
          },
        },
        { $group: { _id: "$bucket", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: { $in: bestSellerStatuses } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            image: { $first: "$items.image" },
            units: { $sum: "$items.qty" },
            sales: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
          },
        },
        { $sort: { units: -1, sales: -1 } },
        { $limit: 10 },
      ]),
      Order.find()
        .populate("user", "name email phone city")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return res.json({
      totals: {
        totalProducts,
        totalCustomers,
        disabledCustomers,
        totalOrders,
        pendingOrders,
        revenue: Number(revenueRows?.[0]?.revenue || 0),
        lowStockProducts,
        unreadMessages,
        activeSubscribers,
      },
      lowStockThreshold,
      orderStatus: orderStatusRows.map((row) => ({ label: String(row._id || "unknown"), value: Number(row.count || 0) })),
      inventory: inventoryRows.map((row) => ({ label: String(row._id || "Unknown"), value: Number(row.count || 0) })),
      bestSellingProducts: bestSellingProducts.map((item) => ({
        productId: item._id,
        name: item.name || "Product",
        image: item.image || "",
        units: Number(item.units || 0),
        sales: Number(item.sales || 0),
      })),
      recentOrders,
    });
  } catch (err) {
    return next(err);
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
    const payment = cleanString(req.query?.payment, 40).toUpperCase();
    const filter = status && Object.prototype.hasOwnProperty.call(STATUS_TRANSITIONS, status) ? { status } : {};
    if (["PENDING", "PAID", "FAILED", "REFUNDED"].includes(payment)) filter["payment.status"] = payment;
    const orders = await Order.find(filter)
      .populate("user", "name email phone city isActive")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order id." });
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone city addressLine1 addressLine2 postalCode isActive")
      .populate("statusHistory.changedBy", "name email role")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found." });
    return res.json(order);
  } catch (err) {
    return next(err);
  }
});

router.patch("/admin/:id", auth, admin, async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order id." });
    const update = {};
    if ("trackingNumber" in req.body) update.trackingNumber = cleanString(req.body.trackingNumber, 150);
    if ("adminNote" in req.body) update.adminNote = cleanString(req.body.adminNote, 2000);
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
      .populate("user", "name email phone city");
    if (!order) return res.status(404).json({ message: "Order not found." });
    return res.json(order);
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/status", auth, admin, async (req, res, next) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order id." });
  const nextStatus = cleanString(req.body?.status, 40).toLowerCase();
  const note = cleanString(req.body?.note, 500);
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

      if (nextStatus === "cancelled" && current !== "cancelled") {
        await restoreInventory(order, session);
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

      if (nextStatus !== current) {
        order.statusHistory.push({ status: nextStatus, changedBy: req.user.id, note });
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

router.patch("/:id/cancel", auth, async (req, res, next) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order id." });
  const session = await mongoose.startSession();
  try {
    let output;
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).select("+inventoryRestored").session(session);
      if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });
      if (!["pending", "confirmed"].includes(String(order.status).toLowerCase())) {
        throw Object.assign(new Error("This order can no longer be cancelled online."), { status: 409 });
      }
      await restoreInventory(order, session);
      order.status = "cancelled";
      order.statusHistory.push({ status: "cancelled", changedBy: req.user.id, note: "Cancelled by customer" });
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
      .populate("user", "name email phone city")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found." });
    return res.json(order);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
