const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },

    googleId: { type: String, index: true, sparse: true },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },

    picture: { type: String, default: "" },
    phone: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    isProfileComplete: { type: Boolean, default: false },

    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

exports.User = mongoose.model("User", userSchema);
