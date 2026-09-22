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
    inventoryRestored: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
