const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { _id: true }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
    icon: { type: String, default: "" },
    color: { type: String, default: "default" },
    images: [{ type: String }],
    subcategories: [subcategorySchema],
  },
  { timestamps: true }
);

exports.Category = mongoose.model("Category", categorySchema);
