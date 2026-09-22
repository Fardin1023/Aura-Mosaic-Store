const mongoose = require("mongoose");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return cleanString(value, 200).toLowerCase();
}

function isEmail(value) {
  return EMAIL_RE.test(normalizeEmail(value));
}

function isObjectId(value) {
  return mongoose.isValidObjectId(value);
}

function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

module.exports = { cleanString, normalizeEmail, isEmail, isObjectId, escapeRegex, toNumber };
