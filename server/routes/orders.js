const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const Order = require("../models/order");
const Transaction = require("../models/transaction");
const StoreSetting = require("../models/storeSetting");
const ContactMessage = require("../models/contactMessage");
const NewsletterSubscriber = require("../models/newsletterSubscriber");
const PaymentSession = require("../models/paymentSession");
const crypto = require("crypto");
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


function sslcommerzConfigured() {
  return Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);
}

function sslcommerzSandbox() {
  return String(process.env.SSLCOMMERZ_SANDBOX || "true").toLowerCase() !== "false";
}

function sslcommerzBaseUrl() {
  return sslcommerzSandbox() ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
}

function publicApiUrl() {
  return String(process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
}

function clientPublicUrl() {
  const explicit = String(process.env.CLIENT_PUBLIC_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return String(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean)?.replace(/\/$/, "") || "";
}

function onlineProvider(validation = {}) {
  const text = `${validation.card_type || ""} ${validation.card_brand || ""} ${validation.card_issuer || ""}`.toLowerCase();
  if (text.includes("bkash")) return "BKASH";
  if (text.includes("nagad")) return "NAGAD";
  if (/(visa|master|card|amex|nexus)/.test(text)) return "CARD";
  return "OTHER";
}

function safeGatewayMeta(validation = {}) {
  const allowed = [
    "tran_id", "val_id", "bank_tran_id", "card_type", "card_brand", "card_issuer",
    "amount", "currency", "store_amount", "risk_level", "risk_title", "status", "validated_on"
  ];
  return Object.fromEntries(allowed.filter((key) => validation[key] !== undefined).map((key) => [key, validation[key]]));
}

async function postForm(url, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Payment gateway returned HTTP ${response.status}.`);
    try { return JSON.parse(text); } catch { throw new Error("Payment gateway returned an invalid response."); }
  } finally {
    clearTimeout(timer);
  }
}

async function validateSslcommerzPayment(valId) {
  const url = new URL(`${sslcommerzBaseUrl()}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", String(valId || ""));
  url.searchParams.set("store_id", process.env.SSLCOMMERZ_STORE_ID || "");
  url.searchParams.set("store_passwd", process.env.SSLCOMMERZ_STORE_PASSWORD || "");
  url.searchParams.set("v", "1");
  url.searchParams.set("format", "json");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Payment validation returned HTTP ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function releasePaymentReservationById(id, nextStatus, note = "") {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await PaymentSession.findById(id).session(session);
      if (!payment || payment.status !== "PENDING") return;
      if (payment.inventoryReserved) {
        for (const item of payment.items) {
          await Product.updateOne({ _id: item.productId }, { $inc: { countInStock: item.qty } }, { session });
        }
      }
      payment.inventoryReserved = false;
      payment.status = nextStatus;
      payment.meta = { ...(payment.meta || {}), releaseNote: cleanString(note, 500), releasedAt: new Date().toISOString() };
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }
}

async function cleanupExpiredPaymentSessions() {
  const expired = await PaymentSession.find({ status: "PENDING", expiresAt: { $lte: new Date() } })
    .select("_id")
    .limit(25)
    .lean();
  for (const row of expired) {
    await releasePaymentReservationById(row._id, "EXPIRED", "Payment session expired before completion.");
  }
}

async function finalizeOnlinePayment(payload) {
  const tranId = cleanString(payload?.tran_id, 80);
  const valId = cleanString(payload?.val_id, 80);
  if (!tranId || !valId) throw Object.assign(new Error("Payment confirmation is incomplete."), { status: 400 });

  const existing = await PaymentSession.findOne({ tranId });
  if (!existing) throw Object.assign(new Error("Payment session was not found."), { status: 404 });
  if (existing.status === "PAID" && existing.order) {
    return { order: await Order.findById(existing.order).lean(), validation: existing.meta?.validation || {} };
  }
  if (existing.status !== "PENDING") {
    throw Object.assign(new Error(`Payment session is ${existing.status.toLowerCase()}.`), { status: 409 });
  }

  const validation = await validateSslcommerzPayment(valId);
  if (!["VALID", "VALIDATED"].includes(String(validation?.status || "").toUpperCase())) {
    throw Object.assign(new Error("The payment gateway could not validate this transaction."), { status: 400 });
  }
  if (String(validation?.tran_id || "") !== tranId) {
    throw Object.assign(new Error("Payment transaction id did not match."), { status: 400 });
  }
  const paidAmount = Number(validation?.amount);
  if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - Number(existing.total)) > 0.01) {
    throw Object.assign(new Error("Payment amount did not match the order total."), { status: 400 });
  }
  if (String(validation?.currency || "BDT").toUpperCase() !== "BDT") {
    throw Object.assign(new Error("Unexpected payment currency."), { status: 400 });
  }

  const provider = onlineProvider(validation);
  const dbSession = await mongoose.startSession();
  let createdOrder = null;
  try {
    await dbSession.withTransaction(async () => {
      const payment = await PaymentSession.findById(existing._id).session(dbSession);
      if (!payment) throw Object.assign(new Error("Payment session was not found."), { status: 404 });
      if (payment.status === "PAID" && payment.order) {
        createdOrder = await Order.findById(payment.order).session(dbSession);
        return;
      }
      if (payment.status !== "PENDING") {
        throw Object.assign(new Error("Payment session can no longer be completed."), { status: 409 });
      }

      const [order] = await Order.create([{
        user: payment.user,
        items: payment.items,
        subtotal: payment.subtotal,
        discount: payment.discount,
        shipping: payment.shipping,
        total: payment.total,
        status: "confirmed",
        city: payment.city,
        shippingAddress: payment.shippingAddress,
        inventoryRestored: false,
        statusHistory: [{ status: "confirmed", changedBy: payment.user, note: "Online payment verified by SSLCOMMERZ" }],
        payment: {
          method: "ONLINE",
          provider,
          status: "PAID",
          amount: payment.total,
          meta: safeGatewayMeta(validation),
        },
      }], { session: dbSession });

      await Transaction.create([{
        user: payment.user,
        type: "debit",
        amount: payment.total,
        description: `Online payment for order ${order._id}`,
        order: order._id,
        method: "ONLINE",
        provider,
        status: "PAID",
        meta: safeGatewayMeta(validation),
      }], { session: dbSession });

      payment.status = "PAID";
      payment.inventoryReserved = false;
      payment.order = order._id;
      payment.meta = { ...(payment.meta || {}), validation: safeGatewayMeta(validation), paidAt: new Date().toISOString() };
      await payment.save({ session: dbSession });
      createdOrder = order;
    });
    return { order: createdOrder, validation };
  } finally {
    await dbSession.endSession();
  }
}

function redirectToClient(res, path) {
  const base = clientPublicUrl();
  if (!base) return res.status(200).send("Payment processed. You may close this window.");
  return res.redirect(303, `${base}${path}`);
}

router.get("/store-settings", async (_req, res, next) => {
  try {
    await cleanupExpiredPaymentSessions();
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
      onlinePaymentConfigured: sslcommerzConfigured() && Boolean(publicApiUrl()) && Boolean(clientPublicUrl()),
      onlinePaymentSandbox: sslcommerzSandbox(),
      onlinePaymentGateway: "SSLCOMMERZ",
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


router.get("/payment-options", async (_req, res, next) => {
  try {
    const settings = await StoreSetting.getStoreSettings();
    return res.json({
      cod: { enabled: Boolean(settings.allowCOD) },
      online: {
        enabled: sslcommerzConfigured() && Boolean(publicApiUrl()) && Boolean(clientPublicUrl()),
        gateway: "SSLCOMMERZ",
        sandbox: sslcommerzSandbox(),
        channels: ["bKash", "Nagad", "Visa", "Mastercard", "Debit/Credit Card"],
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/payments/sslcommerz/initiate", auth, async (req, res, next) => {
  const requested = normalizeItems(req.body?.items);
  if (!requested.length) return res.status(400).json({ message: "Your cart is empty." });
  if (requested.some((item) => !isObjectId(item.productId))) {
    return res.status(400).json({ message: "One or more cart items are invalid." });
  }
  if (!sslcommerzConfigured()) {
    return res.status(503).json({ message: "Online payment is not configured yet. Add SSLCOMMERZ merchant credentials on the server." });
  }
  if (!publicApiUrl() || !clientPublicUrl()) {
    return res.status(503).json({ message: "Online payment requires PUBLIC_API_URL and CLIENT_PUBLIC_URL on the server." });
  }

  const city = cleanString(req.body?.city || req.body?.shippingAddress?.city, 120);
  if (!city || !VALID_CITIES.has(city.toLowerCase())) {
    return res.status(400).json({ message: "Please select a valid delivery city." });
  }
  const preferredChannel = ["ANY", "BKASH", "NAGAD", "CARD"].includes(String(req.body?.preferredChannel || "ANY").toUpperCase())
    ? String(req.body?.preferredChannel || "ANY").toUpperCase()
    : "ANY";

  await cleanupExpiredPaymentSessions();
  const dbSession = await mongoose.startSession();
  let paymentRecord = null;
  let customer = null;
  try {
    await dbSession.withTransaction(async () => {
      const [foundCustomer, settings] = await Promise.all([
        User.findOne({ _id: req.user.id, isActive: { $ne: false } }).session(dbSession).lean(),
        StoreSetting.getStoreSettings(),
      ]);
      customer = foundCustomer;
      if (!customer) throw Object.assign(new Error("Your account is not available."), { status: 403 });
      if (!customer.phone || !customer.addressLine1) {
        throw Object.assign(new Error("Please add your phone number and delivery address in My Account before paying online."), { status: 409, code: "PROFILE_REQUIRED" });
      }

      const uniqueIds = [...new Set(requested.map((item) => String(item.productId)))];
      const products = await Product.find({ _id: { $in: uniqueIds }, isActive: { $ne: false } }).session(dbSession);
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
        if (product.countInStock < qty) throw Object.assign(new Error(`${product.name} only has ${product.countInStock} item(s) left in stock.`), { status: 409 });
        items.push({ productId: product._id, name: product.name, image: Array.isArray(product.images) ? product.images[0] || "" : "", price: Number(product.price), qty });
      }
      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      const shipping = subtotal >= Number(settings.freeShippingThreshold || 0) ? 0 : Number(settings.shippingFlatFee || 0);
      const total = Math.max(0, subtotal + shipping);
      if (total < 10) throw Object.assign(new Error("Online payments must be at least Tk. 10."), { status: 400 });

      for (const item of items) {
        const updated = await Product.updateOne(
          { _id: item.productId, countInStock: { $gte: item.qty }, isActive: { $ne: false } },
          { $inc: { countInStock: -item.qty } },
          { session: dbSession }
        );
        if (updated.modifiedCount !== 1) throw Object.assign(new Error(`${item.name} went out of stock while you were checking out.`), { status: 409 });
      }

      const tranId = `AURA-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`.slice(0, 60);
      const shippingAddress = cleanShippingAddress(req.body?.shippingAddress, customer, city);
      const [created] = await PaymentSession.create([{
        user: req.user.id,
        tranId,
        preferredChannel,
        items,
        subtotal,
        discount: 0,
        shipping,
        total,
        currency: "BDT",
        city,
        shippingAddress,
        status: "PENDING",
        inventoryReserved: true,
        expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      }], { session: dbSession });
      paymentRecord = created;
    });

    const apiBase = publicApiUrl();
    const callbackBase = `${apiBase}/api/orders/payments/sslcommerz`;
    const form = {
      store_id: process.env.SSLCOMMERZ_STORE_ID,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: Number(paymentRecord.total).toFixed(2),
      currency: "BDT",
      tran_id: paymentRecord.tranId,
      success_url: `${callbackBase}/success`,
      fail_url: `${callbackBase}/fail`,
      cancel_url: `${callbackBase}/cancel`,
      ipn_url: `${callbackBase}/ipn`,
      cus_name: paymentRecord.shippingAddress.name || customer.name,
      cus_email: customer.email,
      cus_add1: paymentRecord.shippingAddress.addressLine1 || paymentRecord.city,
      cus_add2: paymentRecord.shippingAddress.addressLine2 || "",
      cus_city: paymentRecord.city,
      cus_state: paymentRecord.city,
      cus_postcode: paymentRecord.shippingAddress.postalCode || "1000",
      cus_country: "Bangladesh",
      cus_phone: paymentRecord.shippingAddress.phone || customer.phone,
      ship_name: paymentRecord.shippingAddress.name || customer.name,
      ship_add1: paymentRecord.shippingAddress.addressLine1 || paymentRecord.city,
      ship_add2: paymentRecord.shippingAddress.addressLine2 || "",
      ship_city: paymentRecord.city,
      ship_state: paymentRecord.city,
      ship_postcode: paymentRecord.shippingAddress.postalCode || "1000",
      ship_country: "Bangladesh",
      shipping_method: "YES",
      product_name: paymentRecord.items.slice(0, 4).map((item) => item.name).join(", ").slice(0, 250),
      product_category: "ecommerce",
      product_profile: "general",
      value_a: String(paymentRecord._id),
    };
    if (preferredChannel === "BKASH") form.multi_card_name = "bkash";
    if (preferredChannel === "NAGAD") form.multi_card_name = "mobilebank";
    if (preferredChannel === "CARD") form.multi_card_name = "visacard,mastercard,othercard";

    const gateway = await postForm(`${sslcommerzBaseUrl()}/gwprocess/v4/api.php`, form);
    const redirectUrl = gateway?.GatewayPageURL || gateway?.redirectGatewayURL;
    if (String(gateway?.status || "").toUpperCase() !== "SUCCESS" || !redirectUrl) {
      await releasePaymentReservationById(paymentRecord._id, "FAILED", gateway?.failedreason || "Gateway session could not be created.");
      return res.status(502).json({ message: gateway?.failedreason || "Could not start the online payment session." });
    }
    await PaymentSession.updateOne({ _id: paymentRecord._id }, { $set: { gatewaySessionKey: gateway.sessionkey || "", meta: { gatewayStatus: gateway.status, initiatedAt: new Date().toISOString() } } });
    return res.status(201).json({
      redirectUrl,
      tranId: paymentRecord.tranId,
      amount: paymentRecord.total,
      currency: "BDT",
      sandbox: sslcommerzSandbox(),
      expiresAt: paymentRecord.expiresAt,
    });
  } catch (err) {
    if (paymentRecord?._id) {
      try { await releasePaymentReservationById(paymentRecord._id, "FAILED", err.message); } catch { /* best effort */ }
    }
    return next(err);
  } finally {
    await dbSession.endSession();
  }
});

router.all("/payments/sslcommerz/success", async (req, res) => {
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  try {
    const { order } = await finalizeOnlinePayment(payload);
    return redirectToClient(res, `/order-confirmation/${order._id}?payment=success`);
  } catch (err) {
    return redirectToClient(res, `/cart?payment=failed&reason=${encodeURIComponent(err.message || "Payment validation failed")}`);
  }
});

router.all("/payments/sslcommerz/fail", async (req, res) => {
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  const payment = await PaymentSession.findOne({ tranId: cleanString(payload.tran_id, 80) });
  if (payment) await releasePaymentReservationById(payment._id, "FAILED", payload.error || "Gateway reported payment failure.");
  return redirectToClient(res, "/cart?payment=failed");
});

router.all("/payments/sslcommerz/cancel", async (req, res) => {
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  const payment = await PaymentSession.findOne({ tranId: cleanString(payload.tran_id, 80) });
  if (payment) await releasePaymentReservationById(payment._id, "CANCELLED", "Customer cancelled payment at gateway.");
  return redirectToClient(res, "/cart?payment=cancelled");
});

router.all("/payments/sslcommerz/ipn", async (req, res) => {
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  try {
    if (payload.val_id && payload.tran_id) {
      const { order } = await finalizeOnlinePayment(payload);
      return res.status(200).json({ ok: true, orderId: order?._id });
    }
    const payment = await PaymentSession.findOne({ tranId: cleanString(payload.tran_id, 80) });
    if (payment && ["FAILED", "CANCELLED"].includes(String(payload.status || "").toUpperCase())) {
      await releasePaymentReservationById(payment._id, String(payload.status).toUpperCase(), "Gateway IPN reported an unsuccessful payment.");
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message });
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
