const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true, maxlength: 2000 },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    images: [{ type: String, required: true }],
    brand: { type: String, default: "", trim: true, maxlength: 120 },
    vendor: { type: String, default: "Aura Mosaic", trim: true, maxlength: 120 },
    additionalInfo: { type: String, default: "", trim: true, maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0, default: undefined },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, required: false },
    countInStock: { type: Number, required: true, min: 0, max: 100000 },
    reviews: [reviewSchema],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ category: 1, rating: -1 });

exports.Product = mongoose.model("Product", productSchema);
