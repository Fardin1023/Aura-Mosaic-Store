const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["COD", "ONLINE"], default: "COD" },
    provider: { type: String, enum: ["COD", "BKASH", "NAGAD", "CARD", "OTHER"], default: "COD" },
    status: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
    amount: { type: Number, default: 0, min: 0 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 120 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    addressLine1: { type: String, default: "", trim: true, maxlength: 250 },
    addressLine2: { type: String, default: "", trim: true, maxlength: 250 },
    city: { type: String, default: "", trim: true, maxlength: 120 },
    postalCode: { type: String, default: "", trim: true, maxlength: 30 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "placed", "paid"],
      index: true,
    },
    payment: { type: paymentSchema, default: () => ({}) },
    city: { type: String, default: "", trim: true },
    shippingAddress: { type: shippingAddressSchema, default: () => ({}) },
    trackingNumber: { type: String, default: "", trim: true, maxlength: 150 },
    adminNote: { type: String, default: "", trim: true, maxlength: 2000 },
    statusHistory: { type: [statusHistorySchema], default: [] },
    inventoryRestored: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
