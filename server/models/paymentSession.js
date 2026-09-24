const mongoose = require("mongoose");

const paymentItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 99 },
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

const paymentSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tranId: { type: String, required: true, unique: true, index: true, maxlength: 64 },
    gateway: { type: String, enum: ["SSLCOMMERZ"], default: "SSLCOMMERZ" },
    gatewaySessionKey: { type: String, default: "", trim: true, maxlength: 255 },
    preferredChannel: { type: String, enum: ["ANY", "BKASH", "NAGAD", "CARD"], default: "ANY" },
    items: { type: [paymentItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT", maxlength: 8 },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    shippingAddress: { type: shippingAddressSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    inventoryReserved: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

paymentSessionSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("PaymentSession", paymentSessionSchema);
