const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, index: true },
    storeName: { type: String, default: "Aura Mosaic", trim: true, maxlength: 120 },
    currency: { type: String, default: "BDT", trim: true, uppercase: true, maxlength: 8 },
    shippingFlatFee: { type: Number, default: 60, min: 0, max: 100000 },
    freeShippingThreshold: { type: Number, default: 500, min: 0, max: 10000000 },
    lowStockThreshold: { type: Number, default: 5, min: 0, max: 100000 },
    allowCOD: { type: Boolean, default: true },
    supportEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 200 },
    supportPhone: { type: String, default: "", trim: true, maxlength: 40 },
    announcement: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

storeSettingSchema.statics.getStoreSettings = async function getStoreSettings() {
  return this.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model("StoreSetting", storeSettingSchema);
