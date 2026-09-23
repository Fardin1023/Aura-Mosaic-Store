const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["adjustment", "restock", "correction"], default: "adjustment" },
    delta: { type: Number, required: true },
    before: { type: Number, required: true, min: 0 },
    after: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);
